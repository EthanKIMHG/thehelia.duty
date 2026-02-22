import type { MonthlyStats } from '@/lib/shift-utils'
import type { Staff } from '@/types'

export type ShiftLabelRole = 'Nurse' | 'Assistant'

export interface DateCell {
  date: Date
  isValid: boolean
  dateStr: string
  isCurrentMonth: boolean
}

export interface ScheduleApiEntry {
  id: string
  staff_id: string
  work_date: string
  duty_type: string
}

export interface WantedOffRecord {
  staff_id: string
  wanted_date: string
}

export interface StaffScheduleEntry {
  date: string
  type: string
}

export interface StaffScheduleViewModel {
  id: string
  name: string
  role: ShiftLabelRole
  employmentType: Staff['employment_type']
  schedule: StaffScheduleEntry[]
  scheduleByDate: Map<string, string>
  stats: MonthlyStats
}

export interface DailyWarning {
  newborns: number
  requiredPerShift: number
  dAssigned: number
  eAssigned: number
  nAssigned: number
  dDiff: number
  eDiff: number
  nDiff: number
  checkins: number
  checkouts: number
}

export type DailyWarningMap = Map<string, DailyWarning>
