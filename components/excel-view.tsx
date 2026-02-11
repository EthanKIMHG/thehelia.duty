'use client'

import { Button } from '@/components/ui/button'
import { authFetch } from '@/lib/api'
import { calculateMonthlyStats, parseShift } from '@/lib/shift-utils'
import { useQuery } from '@tanstack/react-query'
import { endOfWeek, format, isWithinInterval, startOfWeek } from 'date-fns'
import { UserPlus, Wand2 } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { MobileCard } from './excel-view/mobile-card'
import { ScheduleGrid } from './excel-view/schedule-grid'
import { StaffingMeter } from './excel-view/staffing-meter'

export function ExcelView() {
  const [currentDate, setCurrentDate] = useState(new Date())

  // Fetch Staff
  const { data: staffData } = useQuery<any[]>({
    queryKey: ['staff'],
    queryFn: async () => {
      const res = await authFetch('/api/staff')
      return res.json()
    }
  })

  // Fetch Schedules
  const monthStr = format(currentDate, 'yyyy-MM')
  const { data: scheduleData, refetch: refetchSchedules } = useQuery<any[]>({
    queryKey: ['schedules', monthStr],
    queryFn: async () => {
      const res = await authFetch(`/api/schedules?month=${monthStr}`)
      return res.json()
    }
  })

  // Fetch Daily Stats (from Supabase view)
  const { data: dailyStats } = useQuery<{ total_newborns: number; total_mothers: number }>({
    queryKey: ['daily-stats'],
    queryFn: async () => {
      const res = await authFetch('/api/daily-stats')
      return res.json()
    }
  })

  // Fetch Stays for staffing warnings
  const { data: staysData } = useQuery<any[]>({
    queryKey: ['stays', monthStr],
    queryFn: async () => {
      const res = await authFetch(`/api/stays?month=${monthStr}`)
      return res.json()
    }
  })

  // Fetch Wanted Offs
  const { data: wantedOffsData } = useQuery<any[]>({
    queryKey: ['wanted-offs', monthStr],
    queryFn: async () => {
      const res = await authFetch(`/api/wanted-offs?month=${monthStr}`)
      return res.json()
    }
  })

  // Process wanted offs into a map for easy lookup: staffId -> Set<dateStr>
  const wantedOffStats = useMemo(() => {
    const map = new Map<string, Set<string>>()
    if (wantedOffsData) {
        wantedOffsData.forEach((w: any) => {
            if (!map.has(w.staff_id)) {
                map.set(w.staff_id, new Set())
            }
            map.get(w.staff_id)?.add(w.wanted_date)
        })
    }
    return map
  }, [wantedOffsData])

  // Generate dates for current month (only valid days)
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
  const dates = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1)
    return {
        date: d,
        isValid: true,
        dateStr: format(d, 'yyyy-MM-dd')
    }
  })

  // Merge Staff and Schedules
  const staffList = staffData?.map(staff => {
    const staffSchedules = scheduleData?.filter(s => s.staff_id === staff.id) || []
    
    // Create a map for quick lookup
    const scheduleMap = new Map(staffSchedules.map((s: any) => [s.work_date, s.duty_type]))

    const fullSchedule = dates.map(dayObj => {
      // If invalid date (e.g. Feb 30), return null or specific marker
      if (!dayObj.isValid) return { date: '', type: 'INVALID' }
      
      return {
        date: dayObj.dateStr,
        type: scheduleMap.get(dayObj.dateStr) || '/'
      }
    })

    const stats = calculateMonthlyStats(fullSchedule)

    return {
      id: staff.id,
      name: staff.name,
      role: staff.job_title === 'nurse' ? 'Nurse' : 'Assistant',
      schedule: fullSchedule,
      stats // Pass stats to grid
    }
  }) || []

  // Stats Logic
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  
  const todaysWorkingStaff = staffList.filter((s: any) => {
    const shift = s.schedule.find((sch: any) => sch.date === todayStr)?.type
    return shift && shift !== '/'
  })
  
  const totalNurses = todaysWorkingStaff.filter((s: any) => s.role === 'Nurse').length
  const totalAssistants = todaysWorkingStaff.filter((s: any) => s.role === 'Assistant').length
  
  // Get total newborns from daily stats view
  const totalNewborns = dailyStats?.total_newborns || 0

  // Calculate daily newborn projections and staffing warnings
  const dailyWarnings = useMemo(() => {
    if (!staysData || !staffList.length) return new Map<string, { newborns: number; requiredPerShift: number; dAssigned: number; eAssigned: number; nAssigned: number; dDiff: number; eDiff: number; nDiff: number; checkins: number; checkouts: number }>()

    const warnings = new Map<string, { newborns: number; requiredPerShift: number; dAssigned: number; eAssigned: number; nAssigned: number; dDiff: number; eDiff: number; nDiff: number; checkins: number; checkouts: number }>()

    dates.forEach(dayObj => {
      if (!dayObj.isValid) return
 
      // Count newborns active on this day (after 10 AM: check_in <= date, check_out > date)
      let newborns = 0
      let checkins = 0
      let checkouts = 0

      staysData.forEach(stay => {
        const checkIn = stay.check_in_date
        const checkOut = stay.check_out_date
        const babies = stay.baby_count || 1

        // After 10 AM: new arrivals are counted, departures are removed
        if (checkIn <= dayObj.dateStr && checkOut > dayObj.dateStr) {
          newborns += babies
        }

        if (checkIn === dayObj.dateStr) checkins += babies
        if (checkOut === dayObj.dateStr) checkouts += babies
      })

      // Required staff PER SHIFT (D, E, N each independently): 1 per 4 newborns
      const requiredPerShift = Math.ceil(newborns / 4)

      // Count assigned per shift type
      // DE covers both D and E shifts
      let dCount = 0, eCount = 0, nCount = 0
      staffList.forEach(staff => {
        const entry = staff.schedule.find((s: any) => s.date === dayObj.dateStr)
        const parsed = parseShift(entry?.type)
        
        if (parsed.type === 'D') {
            dCount++
        } else if (parsed.type === 'E') {
            eCount++
        } else if (parsed.type === 'DE') { 
            dCount++
            eCount++
        } else if (parsed.type === 'N') {
            nCount++
            // If 2+N (Pre-OT >= 2), count as E as well (starts 20:00)
            if (parsed.otPosition === 'pre' && parsed.otHours >= 2) {
                eCount++
            }
        } else if (parsed.type === 'M') {
            // M (11-18/19) covers D and E peaks
            dCount++
            eCount++
        }
      })

      warnings.set(dayObj.dateStr, {
        newborns,
        requiredPerShift,
        dAssigned: dCount,
        eAssigned: eCount,
        nAssigned: nCount,
        dDiff: dCount - requiredPerShift,
        eDiff: eCount - requiredPerShift,
        nDiff: nCount - requiredPerShift,
        checkins,
        checkouts
      })
    })

    return warnings
  }, [staysData, staffList, dates])

  // Handlers
  const handleCellUpdate = async (staffId: string, dateStr: string, newType: string) => {
    // Optimistic Update can be added here
    
    // API Call
    await authFetch('/api/schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staff_id: staffId,
        work_date: dateStr,
        duty_type: newType
      })
    })

    refetchSchedules()
  }

  const handleAutoAssign = () => {
     // TODO: Implement Auto Assign API call
     alert("AI Auto Assign feature coming soon via API!")
  }

  return (
    <div className="space-y-6">
      {/* 1. Health Meter */}
      <StaffingMeter 
        totalNewborns={totalNewborns} 
        totalNurses={totalNurses} 
        totalAssistants={totalAssistants} 
      />

      {/* Toolbar */}
      <div className="flex justify-between items-center">
         <div className="text-lg font-bold">
            {format(currentDate, 'yyyy년 M월')}
         </div>
        <div className="flex gap-2">
            <Button onClick={handleAutoAssign} variant="outline" className="gap-2">
                <Wand2 className="h-4 w-4" />
                AI 자동 배치
            </Button>
        </div>
      </div>

      {/* 2. Desktop Grid */}
      <div className="hidden md:block">
        <ScheduleGrid 
            dates={dates} 
            staffMembers={staffList} 
            onCellClick={handleCellUpdate}
            dailyWarnings={dailyWarnings}
            wantedOffStats={wantedOffStats}
        />
      </div>

      {/* 3. Mobile Card View */}
      <div className="md:hidden space-y-8">
        {dates.filter(d => {
             // Show "Current Week" (Mon-Sun) based on currentDate
             // If currentDate is "Today", it shows today's week.
             // If user navigates months, it shows the week containing the 1st (default) or current day?
             // User requested "Today" context specifically.
             // Let's use the week containing `currentDate`.
             const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
             const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
             return d.isValid && isWithinInterval(d.date, { start: weekStart, end: weekEnd })
        }).map(dayObj => (
            <MobileCard 
                key={dayObj.dateStr} 
                date={dayObj.date}
                schedules={staffList}
                dailyWarnings={dailyWarnings}
            />
        ))}
        <Button asChild variant="outline" className="w-full h-12 dashed border-2">
            <Link href="/staff/register">
                <UserPlus className="mr-2 h-4 w-4" />
                직원 등록 / 관리
            </Link>
        </Button>
      </div>
    </div>
  )
}
