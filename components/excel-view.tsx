'use client'

import { Button } from '@/components/ui/button'
import { authFetch } from '@/lib/api'
import { generateAutoSchedule } from '@/lib/auto-scheduler'
import { calculateMonthlyStats, parseShift } from '@/lib/shift-utils'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { endOfWeek, format, isWithinInterval, startOfWeek } from 'date-fns'
import { Download, Upload, UserPlus, Wand2 } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import { MobileCard } from './excel-view/mobile-card'
import { ScheduleGrid } from './excel-view/schedule-grid'
import { StaffingMeter } from './excel-view/staffing-meter'

const SCHEDULE_DATE_COL_REGEX = /^\d{4}-\d{2}-\d{2}$/
const CALENDAR_MONTH_LABEL_REGEX = /^\d+\s*월$/
const CSV_CALENDAR_SECTION_END_MARKERS = new Set(['투입인원', '필요인원'])
const CSV_NON_STAFF_NAMES = new Set([
  '입실',
  '퇴실',
  '요일',
  'DAY',
  'EVENING',
  'NIGHT',
  '근무일수',
  '휴무일수',
  '추가근무',
  'OT'
])

type PendingScheduleEntry = {
  work_date: string
  duty_type: string
}

type PendingStaffRow = {
  staffIdHint: string
  staffNameHint: string
  entries: PendingScheduleEntry[]
}

type ParsedCsvPayload = {
  rows: PendingStaffRow[]
  invalidCells: number
}

const escapeCsvValue = (value: string) => {
  if (value.includes('"') || value.includes(',') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

const parseCsvRows = (content: string) => {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false
  const normalized = content.replace(/^\uFEFF/, '')

  for (let i = 0; i < normalized.length; i += 1) {
    const ch = normalized[i]

    if (ch === '"') {
      if (inQuotes && normalized[i + 1] === '"') {
        cell += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (ch === ',' && !inQuotes) {
      row.push(cell)
      cell = ''
      continue
    }

    if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && normalized[i + 1] === '\n') i += 1
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
      continue
    }

    cell += ch
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }

  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ''))
}

const normalizeDutyForImport = (raw: string) => {
  const normalized = raw.trim().toUpperCase()
  if (!normalized || normalized === '가능') return '/'

  const parsed = parseShift(normalized)
  if (parsed.type === '/' && normalized !== '/') return null
  return normalized
}

const normalizeCsvName = (name: string) => name.replace(/\s+/g, ' ').trim()
const compactText = (value: string) => value.replace(/\s+/g, '').toUpperCase()

const buildHeaderBasedRows = (rows: string[][], monthStr: string): ParsedCsvPayload => {
  const header = rows[0].map((cell) => cell.trim())
  const headerIndex = new Map<string, number>()
  header.forEach((name, idx) => headerIndex.set(name, idx))

  const staffIdIdx = headerIndex.get('staff_id') ?? -1
  const staffNameIdx = headerIndex.get('staff_name') ?? -1
  if (staffIdIdx < 0 && staffNameIdx < 0) {
    throw new Error('CSV 헤더에 staff_id 또는 staff_name 컬럼이 필요합니다.')
  }

  const dateCols = header.filter((name) => SCHEDULE_DATE_COL_REGEX.test(name) && name.startsWith(`${monthStr}-`))
  if (dateCols.length === 0) {
    throw new Error(`CSV에 현재 월(${monthStr}) 날짜 컬럼이 없습니다.`)
  }

  const parsedRows: PendingStaffRow[] = []
  let invalidCells = 0

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex]
    if (row.every((cell) => cell.trim() === '')) continue

    const staffIdHint = staffIdIdx >= 0 ? (row[staffIdIdx] || '').trim() : ''
    const staffNameHint = staffNameIdx >= 0 ? normalizeCsvName(row[staffNameIdx] || '') : ''
    if (!staffIdHint && !staffNameHint) continue

    const entries: PendingScheduleEntry[] = []
    for (const dateCol of dateCols) {
      const idx = headerIndex.get(dateCol)
      if (idx === undefined) continue

      const rawShift = row[idx] || ''
      const duty = normalizeDutyForImport(rawShift)
      if (!duty) {
        if (rawShift.trim() !== '') invalidCells += 1
        continue
      }

      entries.push({
        work_date: dateCol,
        duty_type: duty
      })
    }

    parsedRows.push({
      staffIdHint,
      staffNameHint,
      entries
    })
  }

  return { rows: parsedRows, invalidCells }
}

const buildCalendarDateColumns = (monthRow: string[], monthStr: string) => {
  const [yearStr, monthNumStr] = monthStr.split('-')
  const targetYear = Number.parseInt(yearStr, 10)
  const targetMonthIndex = Number.parseInt(monthNumStr, 10) - 1
  const dayCells: Array<{ index: number; day: number }> = []

  for (let i = 2; i < monthRow.length; i += 1) {
    const raw = monthRow[i] || ''
    const digit = raw.trim().match(/^\d+$/)?.[0]
    if (!digit) continue
    const day = Number.parseInt(digit, 10)
    if (Number.isNaN(day)) continue
    dayCells.push({ index: i, day })
  }

  if (dayCells.length === 0) {
    throw new Error('캘린더형 CSV에서 날짜 열을 찾을 수 없습니다.')
  }

  const firstCurrentMonthCol = dayCells.find((cell) => cell.day === 1)?.index ?? dayCells[0].index
  const secondCurrentMonthCol =
    dayCells.find((cell) => cell.day === 1 && cell.index > firstCurrentMonthCol)?.index ?? Number.POSITIVE_INFINITY

  const dateCols: Array<{ index: number; work_date: string }> = []
  for (const dayCell of dayCells) {
    let date: Date
    if (dayCell.index < firstCurrentMonthCol) {
      date = new Date(targetYear, targetMonthIndex - 1, dayCell.day)
    } else if (dayCell.index >= secondCurrentMonthCol) {
      date = new Date(targetYear, targetMonthIndex + 1, dayCell.day)
    } else {
      date = new Date(targetYear, targetMonthIndex, dayCell.day)
    }

    if (date.getDate() !== dayCell.day) continue

    const workDate = format(date, 'yyyy-MM-dd')
    if (!workDate.startsWith(`${monthStr}-`)) continue

    dateCols.push({ index: dayCell.index, work_date: workDate })
  }

  if (dateCols.length === 0) {
    throw new Error(`캘린더형 CSV에서 현재 월(${monthStr}) 날짜 열을 찾지 못했습니다.`)
  }

  return dateCols
}

const buildCalendarBasedRows = (rows: string[][], monthStr: string): ParsedCsvPayload => {
  const monthRowIndex = rows.findIndex((row) => CALENDAR_MONTH_LABEL_REGEX.test((row[1] || '').trim()))
  if (monthRowIndex < 0) {
    throw new Error('지원하지 않는 CSV 형식입니다. 헤더형 또는 캘린더형 CSV를 사용해주세요.')
  }

  const dateCols = buildCalendarDateColumns(rows[monthRowIndex], monthStr)

  const endIndex = rows.findIndex((row, idx) => {
    if (idx <= monthRowIndex) return false
    const firstCell = compactText(row[0] || '')
    return CSV_CALENDAR_SECTION_END_MARKERS.has(firstCell)
  })
  const sectionEnd = endIndex < 0 ? rows.length : endIndex

  const parsedRows: PendingStaffRow[] = []
  let invalidCells = 0

  for (let rowIndex = monthRowIndex + 1; rowIndex < sectionEnd; rowIndex += 1) {
    const row = rows[rowIndex]
    const staffNameHint = normalizeCsvName(row[1] || '')
    if (!staffNameHint) continue

    const compactName = compactText(staffNameHint)
    if (CALENDAR_MONTH_LABEL_REGEX.test(staffNameHint) || CSV_NON_STAFF_NAMES.has(compactName)) continue

    const entries: PendingScheduleEntry[] = []
    for (const dateCol of dateCols) {
      const rawShift = row[dateCol.index] || ''
      const duty = normalizeDutyForImport(rawShift)
      if (!duty) {
        if (rawShift.trim() !== '') invalidCells += 1
        continue
      }

      entries.push({
        work_date: dateCol.work_date,
        duty_type: duty
      })
    }

    parsedRows.push({
      staffIdHint: '',
      staffNameHint,
      entries
    })
  }

  return { rows: parsedRows, invalidCells }
}

const parseScheduleCsv = (rows: string[][], monthStr: string): ParsedCsvPayload => {
  if (!rows.length) {
    throw new Error('CSV 데이터가 비어 있습니다.')
  }

  const normalizedHeader = new Set(rows[0].map((cell) => cell.trim().toLowerCase()))
  const isHeaderBased = normalizedHeader.has('staff_id') || normalizedHeader.has('staff_name')

  return isHeaderBased ? buildHeaderBasedRows(rows, monthStr) : buildCalendarBasedRows(rows, monthStr)
}

export function ExcelView() {
  const queryClient = useQueryClient()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isAutoAssigning, setIsAutoAssigning] = useState(false)
  const [isImportingCsv, setIsImportingCsv] = useState(false)
  const csvInputRef = useRef<HTMLInputElement | null>(null)

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

  const handleStaffReorder = async (orderedIds: string[]) => {
    const res = await authFetch('/api/staff', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ordered_ids: orderedIds })
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body?.error || '직원 순서 저장에 실패했습니다.')
    }

    await queryClient.invalidateQueries({ queryKey: ['staff'] })
  }

  const handleAutoAssign = async () => {
    if (!staffData?.length) {
      alert('직원 데이터가 없어 자동배치를 진행할 수 없습니다.')
      return
    }

    if (!staysData) {
      alert('신생아/입퇴실 데이터를 불러온 뒤 다시 시도해주세요.')
      return
    }

    const shouldProceed = window.confirm(
      '현재 이미 입력된 근무는 유지하고, 비어 있는 일정만 자동 배치합니다.\n계속할까요?'
    )
    if (!shouldProceed) return

    setIsAutoAssigning(true)
    try {
      const result = generateAutoSchedule({
        staffData: staffData.map((staff: any) => ({
          id: staff.id,
          name: staff.name,
          employment_type: staff.employment_type === 'part-time' ? 'part-time' : 'full-time'
        })),
        scheduleData: scheduleData || [],
        staysData: staysData || [],
        wantedOffStats,
        dates: dates.filter((d) => d.isValid).map((d) => d.dateStr)
      })

      if (result.entries.length > 0) {
        const res = await authFetch('/api/schedules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(result.entries)
        })

        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.error || '자동배치 저장에 실패했습니다.')
        }
      }

      await Promise.all([
        refetchSchedules(),
        queryClient.invalidateQueries({ queryKey: ['schedules', monthStr] })
      ])

      const unmetCount = result.unmetCoverage.length
      const generatedCount = result.entries.length
      const generatedMessage = generatedCount > 0
        ? `\n새로 반영된 일정 ${generatedCount}건`
        : '\n추가로 배치할 빈 일정이 없어 기존 근무표를 유지했습니다.'
      const coverageMessage = unmetCount > 0
        ? `\n주의: 인력 미충족 일자 ${unmetCount}일`
        : '\n모든 일자 D/E/N 요구 인원을 충족했습니다.'

      alert(`자동배치가 완료되었습니다.${generatedMessage}${coverageMessage}`)
    } catch (error) {
      alert(error instanceof Error ? error.message : '자동배치 중 오류가 발생했습니다.')
    } finally {
      setIsAutoAssigning(false)
    }
  }

  const handleCsvExport = () => {
    if (!staffData?.length || !dates.length) {
      alert('내보낼 데이터가 없습니다.')
      return
    }

    const dateCols = dates.filter((d) => d.isValid).map((d) => d.dateStr)
    const header = ['staff_id', 'staff_name', 'employment_type', 'role', ...dateCols]
    const staffMap = new Map((staffData || []).map((staff: any) => [staff.id, staff]))

    const lines = [
      header.map((value) => escapeCsvValue(value)).join(',')
    ]

    for (const staff of staffList) {
      const rawStaff = staffMap.get(staff.id)
      const scheduleMap = new Map((staff.schedule || []).map((entry: any) => [entry.date, entry.type || '/']))
      const row = [
        staff.id,
        staff.name || '',
        rawStaff?.employment_type || '',
        rawStaff?.job_title || '',
        ...dateCols.map((dateStr) => scheduleMap.get(dateStr) || '/')
      ]

      lines.push(row.map((value) => escapeCsvValue(String(value ?? ''))).join(','))
    }

    const csvText = `\uFEFF${lines.join('\r\n')}`
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `schedule-${monthStr}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  }

  const handleCsvImportClick = () => {
    csvInputRef.current?.click()
  }

  const handleCsvImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsImportingCsv(true)
    try {
      const text = await file.text()
      const rows = parseCsvRows(text)
      if (rows.length < 2) {
        throw new Error('CSV 데이터가 비어 있습니다.')
      }

      const parsedCsv = parseScheduleCsv(rows, monthStr)
      const staffById = new Map((staffData || []).map((staff: any) => [String(staff.id), staff]))
      const staffByName = new Map((staffData || []).map((staff: any) => [normalizeCsvName(String(staff.name)), staff]))

      const namesToCreate = new Set<string>()
      parsedCsv.rows.forEach((row) => {
        const resolvedStaff =
          (row.staffIdHint && staffById.get(row.staffIdHint)) ||
          (row.staffNameHint && staffByName.get(normalizeCsvName(row.staffNameHint)))

        if (!resolvedStaff && row.staffNameHint) {
          namesToCreate.add(normalizeCsvName(row.staffNameHint))
        }
      })

      let createdStaffCount = 0
      const failedToCreate: string[] = []
      for (const name of namesToCreate) {
        const res = await authFetch('/api/staff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            job_title: 'nurse',
            employment_type: 'part-time'
          })
        })

        if (res.ok) {
          const created = await res.json()
          staffById.set(String(created.id), created)
          staffByName.set(normalizeCsvName(String(created.name)), created)
          createdStaffCount += 1
          continue
        }

        failedToCreate.push(name)
      }

      if (failedToCreate.length > 0) {
        const refreshRes = await authFetch('/api/staff')
        if (refreshRes.ok) {
          const latestStaff = await refreshRes.json()
          const latestStaffList = Array.isArray(latestStaff) ? latestStaff : []
          latestStaffList.forEach((staff: any) => {
            staffById.set(String(staff.id), staff)
            staffByName.set(normalizeCsvName(String(staff.name)), staff)
          })
        }
      }

      const upsertMap = new Map<string, { staff_id: string; work_date: string; duty_type: string }>()
      let unresolvedRows = 0
      for (const row of parsedCsv.rows) {
        const resolvedStaff =
          (row.staffIdHint && staffById.get(row.staffIdHint)) ||
          (row.staffNameHint && staffByName.get(normalizeCsvName(row.staffNameHint)))

        if (!resolvedStaff) {
          unresolvedRows += 1
          continue
        }

        for (const entry of row.entries) {
          upsertMap.set(`${resolvedStaff.id}|${entry.work_date}`, {
            staff_id: resolvedStaff.id,
            work_date: entry.work_date,
            duty_type: entry.duty_type
          })
        }
      }

      const entries = Array.from(upsertMap.values())
      if (entries.length === 0 && createdStaffCount === 0) {
        throw new Error('가져올 스케줄 항목이 없습니다.')
      }

      if (entries.length > 0) {
        const res = await authFetch('/api/schedules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entries)
        })

        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.error || 'CSV 가져오기 저장에 실패했습니다.')
        }
      }

      await Promise.all([
        refetchSchedules(),
        queryClient.invalidateQueries({ queryKey: ['schedules'] })
      ])
      if (createdStaffCount > 0) {
        await queryClient.invalidateQueries({ queryKey: ['staff'] })
      }

      const messages = [`CSV 가져오기 완료: ${entries.length}건 반영`]
      if (createdStaffCount > 0) messages.push(`신규 직원 ${createdStaffCount}명 계약직으로 자동 등록`)
      if (unresolvedRows > 0) messages.push(`직원 미매칭 행 ${unresolvedRows}건 건너뜀`)
      if (parsedCsv.invalidCells > 0) messages.push(`유효하지 않은 근무값 ${parsedCsv.invalidCells}건 건너뜀`)
      if (failedToCreate.length > 0) messages.push(`자동 등록 실패 ${failedToCreate.length}명`)
      alert(messages.join('\n'))
    } catch (error) {
      alert(error instanceof Error ? error.message : 'CSV 가져오기 중 오류가 발생했습니다.')
    } finally {
      setIsImportingCsv(false)
      event.target.value = ''
    }
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
            <Button onClick={handleCsvExport} variant="outline" className="gap-2">
                <Upload className="h-4 w-4" />
                CSV 내보내기
            </Button>
            <Button onClick={handleCsvImportClick} variant="outline" className="gap-2" disabled={isImportingCsv}>
                
                <Download className="h-4 w-4" />
                {isImportingCsv ? 'CSV 가져오는 중...' : 'CSV 가져오기'}
            </Button>
            <Button onClick={handleAutoAssign} variant="outline" className="gap-2" disabled={isAutoAssigning}>
                <Wand2 className="h-4 w-4" />
                {isAutoAssigning ? '자동 배치 중...' : 'AI 자동 배치'}
            </Button>
        </div>
      </div>

      <input
        ref={csvInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleCsvImport}
      />

      {/* 2. Desktop Grid */}
      <div className="hidden md:block">
        <ScheduleGrid 
            dates={dates} 
            staffMembers={staffList} 
            onCellClick={handleCellUpdate}
            dailyWarnings={dailyWarnings}
            wantedOffStats={wantedOffStats}
            onReorderStaffMembers={handleStaffReorder}
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
