export type MobileDayStatus = 'safe' | 'caution' | 'danger'

export interface WeekDaySummaryItem {
  date: Date
  dateStr: string
  status: MobileDayStatus
  newborns: number
  requiredPerShift: number
  assignedMin: number
  checkins: number
  checkouts: number
  isToday: boolean
}

export interface DayShiftStaffItem {
  staffId: string
  name: string
  roleLabel: string
  employmentLabel: string
  dutyCode: string
}

export interface DayShiftGroups {
  D: DayShiftStaffItem[]
  E: DayShiftStaffItem[]
  N: DayShiftStaffItem[]
  M: DayShiftStaffItem[]
}

export interface DayDetailModel {
  date: Date
  dateStr: string
  status: MobileDayStatus
  newborns: number
  checkins: number
  checkouts: number
  requiredPerShift: number
  shifts: DayShiftGroups
}

export interface StaffWeekEntry {
  date: Date
  dateStr: string
  dutyCode: string
  isWantedOff: boolean
}

export interface StaffMonthEntry {
  date: Date
  dateStr: string
  dutyCode: string
  isWantedOff: boolean
}

export interface StaffDetailModel {
  id: string
  name: string
  roleLabel: string
  employmentLabel: string
  monthLabel: string
  workDays: number
  offDays: number
  totalOT: number
  weekEntries: StaffWeekEntry[]
  monthEntries: StaffMonthEntry[]
  offDates: string[]
  wantedOffDates: string[]
}
