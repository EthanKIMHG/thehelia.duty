import { parseShift } from '@/lib/shift-utils'

type DutyType = 'D' | 'E' | 'N' | 'M' | 'DE' | '/'
type EmploymentType = 'full-time' | 'part-time'

type StaffInput = {
  id: string
  name: string
  employment_type: EmploymentType
}

type ScheduleInput = {
  staff_id: string
  work_date: string
  duty_type: string
}

type StayInput = {
  check_in_date: string
  check_out_date: string
  baby_count?: number | null
}

type Coverage = {
  D: number
  E: number
  N: number
}

type StaffState = {
  id: string
  name: string
  employmentType: EmploymentType
  nightSpecialist: boolean
  offTarget: number | null
  wantedOff: Set<string>
  lockedDates: Set<string>
  assignments: Map<string, DutyType>
  workDays: number
  offDays: number
  shiftCount: Record<'D' | 'E' | 'N' | 'M' | 'DE', number>
}

export type AutoScheduleEntry = {
  staff_id: string
  work_date: string
  duty_type: DutyType
}

export type AutoSchedulerResult = {
  entries: AutoScheduleEntry[]
  unmetCoverage: Array<{
    date: string
    required: number
    assignedD: number
    assignedE: number
    assignedN: number
  }>
  staffSummary: Array<{
    id: string
    name: string
    employmentType: EmploymentType
    nightSpecialist: boolean
    workDays: number
    offDays: number
    offTarget: number | null
  }>
}

export function generateAutoSchedule(params: {
  staffData: StaffInput[]
  scheduleData: ScheduleInput[]
  staysData: StayInput[]
  wantedOffStats: Map<string, Set<string>>
  dates: string[]
}): AutoSchedulerResult {
  const { staffData, scheduleData, staysData, wantedOffStats, dates } = params

  const datesSet = new Set(dates)
  const configuredDates = getConfiguredDates(scheduleData, datesSet)
  const existingAssignments = getExistingAssignments(scheduleData, datesSet)
  const requiredPerDate = getRequiredPerDate(dates, staysData)
  const existingNightCounts = getExistingNightCounts(scheduleData)
  const nightSpecialistIds = pickNightSpecialists(staffData, dates.length, requiredPerDate, existingNightCounts)

  const staffStates: StaffState[] = staffData.map((staff) => {
    const wantedOff = staff.employment_type === 'full-time'
      ? new Set(wantedOffStats.get(staff.id) || [])
      : new Set<string>()

    const isNight = nightSpecialistIds.has(staff.id)
    const baseOffTarget = staff.employment_type === 'full-time'
      ? (isNight ? 11 : 9)
      : null

    return {
      id: staff.id,
      name: staff.name,
      employmentType: staff.employment_type,
      nightSpecialist: isNight,
      offTarget: baseOffTarget === null ? null : Math.max(baseOffTarget, wantedOff.size),
      wantedOff,
      lockedDates: new Set<string>(),
      assignments: new Map<string, DutyType>(),
      workDays: 0,
      offDays: 0,
      shiftCount: { D: 0, E: 0, N: 0, M: 0, DE: 0 }
    }
  })

  // Existing configured dates are immutable during auto-assignment.
  // If a date has at least one saved schedule row, that date is treated as fixed.
  for (const state of staffStates) {
    const existingByDate = existingAssignments.get(state.id)

    for (const date of dates) {
      if (!configuredDates.has(date)) continue

      const duty = existingByDate?.get(date) || '/'

      state.assignments.set(date, duty)
      state.lockedDates.add(date)

      if (duty === '/') {
        state.offDays += 1
        continue
      }

      state.workDays += 1
      state.shiftCount[duty] += 1
    }
  }

  // Wanted off is fixed OFF for full-time staff.
  for (const state of staffStates) {
    if (state.employmentType !== 'full-time') continue
    for (const date of dates) {
      if (!state.wantedOff.has(date)) continue
      if (state.lockedDates.has(date)) continue
      if (state.assignments.has(date)) continue
      state.assignments.set(date, '/')
      state.offDays += 1
    }
  }

  const unmetCoverage: AutoSchedulerResult['unmetCoverage'] = []
  const partTimeStates = staffStates.filter((s) => s.employmentType === 'part-time')
  const fullTimeStates = staffStates.filter((s) => s.employmentType === 'full-time')

  for (let dayIndex = 0; dayIndex < dates.length; dayIndex += 1) {
    const date = dates[dayIndex]
    const required = requiredPerDate.get(date) || 0
    const coverage = getCoverageForDate(staffStates, date)

    const fullTimeNight = fullTimeStates.filter((s) => s.nightSpecialist)
    const fullTimeDay = fullTimeStates.filter((s) => !s.nightSpecialist)

    fillShiftTarget({
      shift: 'N',
      target: required,
      coverage,
      date,
      dayIndex,
      dates,
      pools: [partTimeStates, fullTimeNight, fullTimeDay],
      staffStates
    })

    fillShiftTarget({
      shift: 'D',
      target: required,
      coverage,
      date,
      dayIndex,
      dates,
      pools: [partTimeStates, fullTimeDay, fullTimeNight],
      staffStates
    })

    fillShiftTarget({
      shift: 'E',
      target: required,
      coverage,
      date,
      dayIndex,
      dates,
      pools: [partTimeStates, fullTimeDay, fullTimeNight],
      staffStates
    })

    // If D/E is still short, use DE or M as flexible cover.
    while (coverage.D < required || coverage.E < required) {
      const flexShift: DutyType = coverage.D < required && coverage.E < required ? 'DE' : 'M'
      const candidate = pickCandidate({
        candidates: [...partTimeStates, ...fullTimeDay, ...fullTimeNight]
          .filter((state) => canAssignShift(state, flexShift, date, dayIndex, dates)),
        shift: flexShift,
        dayIndex,
        dates
      })

      if (!candidate) break
      assignShift(candidate, date, flexShift, coverage)
    }

    // Finalize unassigned as OFF.
    for (const state of staffStates) {
      if (state.assignments.has(date)) continue
      state.assignments.set(date, '/')
      state.offDays += 1
    }

    if (coverage.D < required || coverage.E < required || coverage.N < required) {
      unmetCoverage.push({
        date,
        required,
        assignedD: coverage.D,
        assignedE: coverage.E,
        assignedN: coverage.N
      })
    }
  }

  const entries: AutoScheduleEntry[] = []
  for (const state of staffStates) {
    for (const date of dates) {
      if (state.lockedDates.has(date)) continue
      entries.push({
        staff_id: state.id,
        work_date: date,
        duty_type: state.assignments.get(date) || '/'
      })
    }
  }

  return {
    entries,
    unmetCoverage,
    staffSummary: staffStates.map((state) => ({
      id: state.id,
      name: state.name,
      employmentType: state.employmentType,
      nightSpecialist: state.nightSpecialist,
      workDays: state.workDays,
      offDays: state.offDays,
      offTarget: state.offTarget
    }))
  }
}

function normalizeDutyType(rawDutyType: string | null | undefined): DutyType {
  const parsed = parseShift(rawDutyType || '').type
  if (parsed === 'D' || parsed === 'E' || parsed === 'N' || parsed === 'M' || parsed === 'DE' || parsed === '/') {
    return parsed
  }
  return '/'
}

function getConfiguredDates(scheduleData: ScheduleInput[], datesSet: Set<string>) {
  const configuredDates = new Set<string>()

  for (const row of scheduleData || []) {
    if (!datesSet.has(row.work_date)) continue
    configuredDates.add(row.work_date)
  }

  return configuredDates
}

function getExistingAssignments(scheduleData: ScheduleInput[], datesSet: Set<string>) {
  const map = new Map<string, Map<string, DutyType>>()

  for (const row of scheduleData || []) {
    if (!datesSet.has(row.work_date)) continue

    const dutyType = normalizeDutyType(row.duty_type)
    if (!map.has(row.staff_id)) {
      map.set(row.staff_id, new Map<string, DutyType>())
    }

    map.get(row.staff_id)?.set(row.work_date, dutyType)
  }

  return map
}

function getRequiredPerDate(dates: string[], staysData: StayInput[]) {
  const result = new Map<string, number>()

  for (const date of dates) {
    let newborns = 0
    for (const stay of staysData || []) {
      const checkIn = stay.check_in_date
      const checkOut = stay.check_out_date
      const babies = stay.baby_count || 1

      if (checkIn <= date && checkOut > date) {
        newborns += babies
      }
    }
    result.set(date, Math.max(0, Math.ceil(newborns / 4)))
  }

  return result
}

function getExistingNightCounts(scheduleData: ScheduleInput[]) {
  const map = new Map<string, number>()

  for (const row of scheduleData || []) {
    if (normalizeDutyType(row.duty_type) !== 'N') continue
    map.set(row.staff_id, (map.get(row.staff_id) || 0) + 1)
  }

  return map
}

function pickNightSpecialists(
  staffData: StaffInput[],
  daysInMonth: number,
  requiredPerDate: Map<string, number>,
  existingNightCounts: Map<string, number>
) {
  const fullTime = staffData.filter((s) => s.employment_type === 'full-time')
  const selected = new Set<string>()
  if (fullTime.length === 0) return selected

  const totalNightNeed = Array.from(requiredPerDate.values()).reduce((acc, value) => acc + value, 0)
  if (totalNightNeed <= 0) return selected

  const maxNightPerSpecialist = Math.max(1, daysInMonth - 11)
  const targetCount = Math.max(1, Math.min(fullTime.length, Math.ceil(totalNightNeed / maxNightPerSpecialist)))

  const sortedByNightExp = [...fullTime].sort((a, b) => {
    const aCount = existingNightCounts.get(a.id) || 0
    const bCount = existingNightCounts.get(b.id) || 0
    if (aCount !== bCount) return bCount - aCount
    return a.name.localeCompare(b.name, 'ko')
  })

  for (const staff of sortedByNightExp) {
    if ((existingNightCounts.get(staff.id) || 0) <= 0) continue
    selected.add(staff.id)
  }

  for (const staff of sortedByNightExp) {
    if (selected.size >= targetCount) break
    selected.add(staff.id)
  }

  return selected
}

function getCoverageForDate(states: StaffState[], date: string): Coverage {
  const coverage: Coverage = { D: 0, E: 0, N: 0 }
  for (const state of states) {
    const shift = state.assignments.get(date)
    if (!shift || shift === '/') continue
    applyCoverage(coverage, shift)
  }
  return coverage
}

function applyCoverage(coverage: Coverage, shift: DutyType) {
  if (shift === 'D') {
    coverage.D += 1
    return
  }
  if (shift === 'E') {
    coverage.E += 1
    return
  }
  if (shift === 'N') {
    coverage.N += 1
    return
  }
  if (shift === 'DE' || shift === 'M') {
    coverage.D += 1
    coverage.E += 1
  }
}

function fillShiftTarget(params: {
  shift: Extract<DutyType, 'D' | 'E' | 'N'>
  target: number
  coverage: Coverage
  date: string
  dayIndex: number
  dates: string[]
  pools: StaffState[][]
  staffStates: StaffState[]
}) {
  const { shift, target, coverage, date, dayIndex, dates, pools } = params

  while (coverage[shift] < target) {
    let assigned = false

    for (const pool of pools) {
      const candidate = pickCandidate({
        candidates: pool.filter((state) => canAssignShift(state, shift, date, dayIndex, dates)),
        shift,
        dayIndex,
        dates
      })

      if (!candidate) continue
      assignShift(candidate, date, shift, coverage)
      assigned = true
      break
    }

    if (!assigned) break
  }
}

function canAssignShift(
  state: StaffState,
  shift: DutyType,
  date: string,
  dayIndex: number,
  dates: string[]
) {
  if (state.lockedDates.has(date)) {
    return false
  }

  const existing = state.assignments.get(date)
  if (existing) {
    // Wanted off is immutable.
    if (state.wantedOff.has(date)) return false
    // Already assigned a work shift.
    if (existing !== '/') return false
  }

  if (state.employmentType === 'full-time' && state.offTarget !== null) {
    const remainingDaysAfterToday = dates.length - dayIndex - 1
    if (state.offDays + remainingDaysAfterToday < state.offTarget) {
      return false
    }
  }

  const prevShiftType = dayIndex > 0
    ? parseShift(state.assignments.get(dates[dayIndex - 1]) || '/').type
    : '/'
  if (prevShiftType === 'N' && shift !== 'N') {
    return false
  }

  if (countConsecutiveWorkDays(state, dates, dayIndex) >= 5) {
    return false
  }

  return true
}

function countConsecutiveWorkDays(state: StaffState, dates: string[], dayIndex: number) {
  let count = 0
  for (let i = dayIndex - 1; i >= 0; i -= 1) {
    const shift = state.assignments.get(dates[i]) || '/'
    if (parseShift(shift).type === '/') break
    count += 1
  }
  return count
}

function pickCandidate(params: {
  candidates: StaffState[]
  shift: DutyType
  dayIndex: number
  dates: string[]
}) {
  const { candidates, shift, dayIndex, dates } = params
  if (!candidates.length) return null

  return [...candidates].sort((a, b) => {
    const scoreA = getCandidateScore(a, shift, dayIndex, dates)
    const scoreB = getCandidateScore(b, shift, dayIndex, dates)
    if (scoreA !== scoreB) return scoreA - scoreB
    return a.name.localeCompare(b.name, 'ko')
  })[0]
}

function getCandidateScore(state: StaffState, shift: DutyType, dayIndex: number, dates: string[]) {
  const consecutive = countConsecutiveWorkDays(state, dates, dayIndex)
  const shiftLoad = shift === '/' ? 0 : state.shiftCount[shift as keyof StaffState['shiftCount']] || 0

  let score = state.workDays * 10 + consecutive * 3 + shiftLoad * 2

  if (state.offTarget !== null) {
    const remainingDaysIncludingToday = dates.length - dayIndex
    const remainingOffNeed = Math.max(0, state.offTarget - state.offDays)
    if (remainingDaysIncludingToday > 0) {
      score += (remainingOffNeed / remainingDaysIncludingToday) * 20
    }
  }

  if (shift === 'N' && state.nightSpecialist) {
    score -= 6
  } else if (shift === 'N' && state.employmentType === 'full-time') {
    score += 6
  }

  return score
}

function assignShift(state: StaffState, date: string, shift: DutyType, coverage: Coverage) {
  const existing = state.assignments.get(date)
  if (existing === '/') {
    state.offDays = Math.max(0, state.offDays - 1)
  }

  state.assignments.set(date, shift)
  state.workDays += 1

  if (shift !== '/') {
    state.shiftCount[shift as keyof StaffState['shiftCount']] += 1
    applyCoverage(coverage, shift)
  }
}
