'use client'

import { Button } from '@/components/ui/button'
import { WeekOverviewSkeleton } from '@/components/excel-view/mobile/week-overview-skeleton'
import { authFetch } from '@/lib/api'
import { calculateMonthlyStats, parseShift } from '@/lib/shift-utils'
import { useQueries } from '@tanstack/react-query'
import {
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isToday,
  startOfMonth,
  startOfWeek,
  subWeeks,
} from 'date-fns'
import { ko } from 'date-fns/locale'
import { UserPlus } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { Staff, Stay } from '@/types'
import type { ScheduleApiEntry, WantedOffRecord } from '../types'
import { DayDetailSheet } from './day-detail-sheet'
import { MobileWeekNavigator } from './mobile-week-navigator'
import { StaffDetailSheet } from './staff-detail-sheet'
import type { DayDetailModel, DayShiftGroups, MobileDayStatus, StaffDetailModel, WeekDaySummaryItem } from './types'
import { WeekDaySummaryList } from './week-day-summary-list'

type MobileExcelViewProps = {
  staffData: Staff[]
}

const getRoleLabel = (jobTitle: Staff['job_title']) => (jobTitle === 'nurse' ? '간호사' : '조무사')
const getEmploymentLabel = (employmentType: Staff['employment_type']) =>
  employmentType === 'full-time' ? '정규직' : '계약직'

const createEmptyShiftGroups = (): DayShiftGroups => ({ D: [], E: [], N: [], M: [] })

const resolveDayStatus = (dDiff: number, eDiff: number, nDiff: number): MobileDayStatus => {
  const worstDiff = Math.min(dDiff, eDiff, nDiff)
  if (worstDiff < 0) return 'danger'
  if (worstDiff === 0) return 'caution'
  return 'safe'
}

const mergeSchedules = (queries: Array<{ data?: ScheduleApiEntry[] }>) => {
  const merged = new Map<string, ScheduleApiEntry>()
  queries.forEach((query) => {
    ;(query.data || []).forEach((entry) => {
      merged.set(`${entry.staff_id}|${entry.work_date}`, entry)
    })
  })
  return Array.from(merged.values())
}

const mergeWantedOffs = (queries: Array<{ data?: WantedOffRecord[] }>) => {
  const merged = new Map<string, WantedOffRecord>()
  queries.forEach((query) => {
    ;(query.data || []).forEach((entry) => {
      merged.set(`${entry.staff_id}|${entry.wanted_date}`, entry)
    })
  })
  return Array.from(merged.values())
}

const mergeStays = (queries: Array<{ data?: Stay[] }>) => {
  const merged = new Map<string, Stay>()
  queries.forEach((query) => {
    ;(query.data || []).forEach((entry) => {
      merged.set(entry.id, entry)
    })
  })
  return Array.from(merged.values())
}

export function MobileExcelView({ staffData }: MobileExcelViewProps) {
  const currentWeekStart = useMemo(() => startOfWeek(new Date(), { weekStartsOn: 1 }), [])
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(currentWeekStart)
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null)
  const [isDaySheetOpen, setIsDaySheetOpen] = useState(false)
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null)
  const [isStaffSheetOpen, setIsStaffSheetOpen] = useState(false)

  const selectedWeekEnd = useMemo(() => endOfWeek(selectedWeekStart, { weekStartsOn: 1 }), [selectedWeekStart])
  const weekDates = useMemo(
    () => eachDayOfInterval({ start: selectedWeekStart, end: selectedWeekEnd }),
    [selectedWeekStart, selectedWeekEnd],
  )

  const weekMonths = useMemo(() => {
    const monthSet = new Set<string>()
    weekDates.forEach((date) => {
      monthSet.add(format(date, 'yyyy-MM'))
    })
    return Array.from(monthSet)
  }, [weekDates])

  const scheduleQueries = useQueries({
    queries: weekMonths.map((month) => ({
      queryKey: ['schedules', month],
      queryFn: async (): Promise<ScheduleApiEntry[]> => {
        const res = await authFetch(`/api/schedules?month=${month}`)
        if (!res.ok) throw new Error('주간 스케줄 데이터를 불러오지 못했습니다.')
        return res.json()
      },
      staleTime: 30_000,
    })),
  })

  const staysQueries = useQueries({
    queries: weekMonths.map((month) => ({
      queryKey: ['stays', month],
      queryFn: async (): Promise<Stay[]> => {
        const res = await authFetch(`/api/stays?month=${month}`)
        if (!res.ok) throw new Error('주간 입퇴실 데이터를 불러오지 못했습니다.')
        return res.json()
      },
      staleTime: 30_000,
    })),
  })

  const wantedOffQueries = useQueries({
    queries: weekMonths.map((month) => ({
      queryKey: ['wanted-offs', month],
      queryFn: async (): Promise<WantedOffRecord[]> => {
        const res = await authFetch(`/api/wanted-offs?month=${month}`)
        if (!res.ok) throw new Error('희망휴무 데이터를 불러오지 못했습니다.')
        return res.json()
      },
      staleTime: 30_000,
    })),
  })

  const isWeekLoading =
    scheduleQueries.some((query) => query.isPending) ||
    staysQueries.some((query) => query.isPending) ||
    wantedOffQueries.some((query) => query.isPending)

  const weekError =
    scheduleQueries.find((query) => query.error)?.error ||
    staysQueries.find((query) => query.error)?.error ||
    wantedOffQueries.find((query) => query.error)?.error

  const weekScheduleEntries = useMemo(() => mergeSchedules(scheduleQueries), [scheduleQueries])
  const weekStays = useMemo(() => mergeStays(staysQueries), [staysQueries])
  const weekWantedOffs = useMemo(() => mergeWantedOffs(wantedOffQueries), [wantedOffQueries])

  const scheduleByStaff = useMemo(() => {
    const lookup = new Map<string, Map<string, string>>()
    weekScheduleEntries.forEach((entry) => {
      if (!lookup.has(entry.staff_id)) {
        lookup.set(entry.staff_id, new Map())
      }
      lookup.get(entry.staff_id)?.set(entry.work_date, entry.duty_type)
    })
    return lookup
  }, [weekScheduleEntries])

  const wantedOffByStaff = useMemo(() => {
    const lookup = new Map<string, Set<string>>()
    weekWantedOffs.forEach((entry) => {
      if (!lookup.has(entry.staff_id)) {
        lookup.set(entry.staff_id, new Set())
      }
      lookup.get(entry.staff_id)?.add(entry.wanted_date)
    })
    return lookup
  }, [weekWantedOffs])

  const dayDetailMap = useMemo(() => {
    const detailMap = new Map<string, DayDetailModel>()

    weekDates.forEach((date) => {
      const dateStr = format(date, 'yyyy-MM-dd')

      let newborns = 0
      let checkins = 0
      let checkouts = 0

      weekStays.forEach((stay) => {
        const babies = stay.baby_count || 1
        if (stay.check_in_date <= dateStr && stay.check_out_date > dateStr) {
          newborns += babies
        }
        if (stay.check_in_date === dateStr) checkins += babies
        if (stay.check_out_date === dateStr) checkouts += babies
      })

      const requiredPerShift = Math.ceil(newborns / 4)

      let dAssigned = 0
      let eAssigned = 0
      let nAssigned = 0
      const shifts = createEmptyShiftGroups()

      staffData.forEach((staff) => {
        const dutyCode = scheduleByStaff.get(staff.id)?.get(dateStr) || '/'
        const parsed = parseShift(dutyCode)

        if (parsed.type === 'D') {
          dAssigned += 1
          shifts.D.push({
            staffId: staff.id,
            name: staff.name,
            roleLabel: getRoleLabel(staff.job_title),
            employmentLabel: getEmploymentLabel(staff.employment_type),
            dutyCode,
          })
          return
        }

        if (parsed.type === 'E') {
          eAssigned += 1
          shifts.E.push({
            staffId: staff.id,
            name: staff.name,
            roleLabel: getRoleLabel(staff.job_title),
            employmentLabel: getEmploymentLabel(staff.employment_type),
            dutyCode,
          })
          return
        }

        if (parsed.type === 'DE') {
          dAssigned += 1
          eAssigned += 1
          const row = {
            staffId: staff.id,
            name: staff.name,
            roleLabel: getRoleLabel(staff.job_title),
            employmentLabel: getEmploymentLabel(staff.employment_type),
            dutyCode,
          }
          shifts.D.push(row)
          shifts.E.push(row)
          return
        }

        if (parsed.type === 'N') {
          nAssigned += 1
          shifts.N.push({
            staffId: staff.id,
            name: staff.name,
            roleLabel: getRoleLabel(staff.job_title),
            employmentLabel: getEmploymentLabel(staff.employment_type),
            dutyCode,
          })
          if (parsed.otPosition === 'pre' && parsed.otHours >= 2) {
            eAssigned += 1
          }
          return
        }

        if (parsed.type === 'M') {
          dAssigned += 1
          eAssigned += 1
          shifts.M.push({
            staffId: staff.id,
            name: staff.name,
            roleLabel: getRoleLabel(staff.job_title),
            employmentLabel: getEmploymentLabel(staff.employment_type),
            dutyCode,
          })
        }
      })

      const dDiff = dAssigned - requiredPerShift
      const eDiff = eAssigned - requiredPerShift
      const nDiff = nAssigned - requiredPerShift

      detailMap.set(dateStr, {
        date,
        dateStr,
        status: resolveDayStatus(dDiff, eDiff, nDiff),
        newborns,
        checkins,
        checkouts,
        requiredPerShift,
        shifts,
      })
    })

    return detailMap
  }, [weekDates, weekStays, staffData, scheduleByStaff])

  const weekSummaryItems = useMemo<WeekDaySummaryItem[]>(() => {
    return weekDates.map((date) => {
      const dateStr = format(date, 'yyyy-MM-dd')
      const dayDetail = dayDetailMap.get(dateStr)
      if (!dayDetail) {
        return {
          date,
          dateStr,
          status: 'safe',
          newborns: 0,
          requiredPerShift: 0,
          assignedMin: 0,
          checkins: 0,
          checkouts: 0,
          isToday: isToday(date),
        }
      }

      const dAssigned = dayDetail.shifts.D.length
      const eAssigned = dayDetail.shifts.E.length
      const nAssigned = dayDetail.shifts.N.length

      return {
        date,
        dateStr,
        status: dayDetail.status,
        newborns: dayDetail.newborns,
        requiredPerShift: dayDetail.requiredPerShift,
        assignedMin: Math.min(dAssigned, eAssigned, nAssigned),
        checkins: dayDetail.checkins,
        checkouts: dayDetail.checkouts,
        isToday: isToday(date),
      }
    })
  }, [weekDates, dayDetailMap])

  const selectedDayDetail = useMemo(() => {
    if (!selectedDateStr) return null
    return dayDetailMap.get(selectedDateStr) || null
  }, [selectedDateStr, dayDetailMap])

  const staffDetailModel = useMemo<StaffDetailModel | null>(() => {
    if (!selectedStaffId) return null

    const staff = staffData.find((item) => item.id === selectedStaffId)
    if (!staff) return null

    const baseDate = selectedDayDetail?.date || selectedWeekStart
    const monthStart = startOfMonth(baseDate)
    const monthEnd = endOfMonth(baseDate)
    const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
    const monthLabel = format(baseDate, 'yyyy년 M월', { locale: ko })

    const weekEntries = weekDates.map((date) => {
      const dateStr = format(date, 'yyyy-MM-dd')
      return {
        date,
        dateStr,
        dutyCode: scheduleByStaff.get(staff.id)?.get(dateStr) || '/',
        isWantedOff: wantedOffByStaff.get(staff.id)?.has(dateStr) || false,
      }
    })

    const monthEntries = monthDays.map((date) => {
      const dateStr = format(date, 'yyyy-MM-dd')
      return {
        date,
        dateStr,
        dutyCode: scheduleByStaff.get(staff.id)?.get(dateStr) || '/',
        isWantedOff: wantedOffByStaff.get(staff.id)?.has(dateStr) || false,
      }
    })

    const monthStats = calculateMonthlyStats(monthEntries.map((entry) => ({ type: entry.dutyCode })))

    const offDates = monthEntries
      .filter((entry) => parseShift(entry.dutyCode).type === '/')
      .map((entry) => format(entry.date, 'M/d (EEE)', { locale: ko }))

    const wantedOffDates = monthEntries
      .filter((entry) => entry.isWantedOff)
      .map((entry) => format(entry.date, 'M/d (EEE)', { locale: ko }))

    return {
      id: staff.id,
      name: staff.name,
      roleLabel: getRoleLabel(staff.job_title),
      employmentLabel: getEmploymentLabel(staff.employment_type),
      monthLabel,
      workDays: monthStats.workDays,
      offDays: monthStats.offDays,
      totalOT: monthStats.totalOT,
      weekEntries,
      monthEntries,
      offDates,
      wantedOffDates,
    }
  }, [selectedStaffId, staffData, selectedDayDetail, selectedWeekStart, weekDates, scheduleByStaff, wantedOffByStaff])

  const isCurrentWeek = useMemo(() => isSameDay(selectedWeekStart, currentWeekStart), [selectedWeekStart, currentWeekStart])

  const handleSelectDay = (dateStr: string) => {
    setSelectedDateStr(dateStr)
    setIsDaySheetOpen(true)
  }

  const handleSelectStaff = (staffId: string) => {
    setSelectedStaffId(staffId)
    setIsStaffSheetOpen(true)
  }

  const handleRetry = () => {
    scheduleQueries.forEach((query) => {
      void query.refetch()
    })
    staysQueries.forEach((query) => {
      void query.refetch()
    })
    wantedOffQueries.forEach((query) => {
      void query.refetch()
    })
  }

  if (isWeekLoading) return <WeekOverviewSkeleton />

  if (weekError) {
    const description = weekError instanceof Error ? weekError.message : '주간 데이터를 불러오지 못했습니다.'
    return (
      <div className="space-y-3 rounded-xl border border-destructive/40 bg-destructive/5 p-3">
        <p className="text-sm text-destructive">{description}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleRetry}
          className="h-11"
        >
          다시 시도
        </Button>
      </div>
    )
  }

  if (!staffData.length) {
    return (
      <div className="space-y-3 rounded-xl border border-dashed bg-muted/20 p-4 text-center">
        <p className="text-sm text-muted-foreground">등록된 직원이 없어 주간 요약을 계산할 수 없습니다.</p>
        <Button asChild className="h-11">
          <Link href="/staff/register">
            <UserPlus className="mr-2 h-4 w-4" />
            직원 등록
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <MobileWeekNavigator
        weekStart={selectedWeekStart}
        weekEnd={selectedWeekEnd}
        isCurrentWeek={isCurrentWeek}
        onPrevWeek={() => setSelectedWeekStart((prev) => subWeeks(prev, 1))}
        onNextWeek={() => setSelectedWeekStart((prev) => addWeeks(prev, 1))}
        onGoCurrentWeek={() => setSelectedWeekStart(currentWeekStart)}
      />

      <WeekDaySummaryList
        items={weekSummaryItems}
        selectedDateStr={selectedDateStr}
        onSelectDay={handleSelectDay}
      />

      <DayDetailSheet
        open={isDaySheetOpen}
        dayDetail={selectedDayDetail}
        onOpenChange={setIsDaySheetOpen}
        onSelectStaff={handleSelectStaff}
      />

      <StaffDetailSheet
        open={isStaffSheetOpen}
        model={staffDetailModel}
        onOpenChange={setIsStaffSheetOpen}
      />
    </div>
  )
}
