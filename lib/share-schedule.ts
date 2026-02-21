import { addDays, eachWeekOfInterval, endOfMonth, startOfMonth } from 'date-fns'

const SHARE_MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/

export function getCurrentMonthKey(baseDate = new Date()) {
  const year = baseDate.getFullYear()
  const month = String(baseDate.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

export function normalizeShareMonth(month?: string | null) {
  if (month && SHARE_MONTH_REGEX.test(month)) return month
  return getCurrentMonthKey()
}

export function normalizeShareWeek(week?: string | number | null) {
  const raw = typeof week === 'number' ? week : Number.parseInt(String(week ?? ''), 10)
  if (Number.isNaN(raw)) return 1
  return Math.min(6, Math.max(1, raw))
}

export function monthToKoreanLabel(month: string) {
  const monthNum = Number.parseInt(month.split('-')[1] ?? '1', 10)
  return `${monthNum}월`
}

export function resolveShareWeekRange(month: string, week: number) {
  const monthStart = new Date(`${month}-01T00:00:00`)
  const safeMonthStart = Number.isNaN(monthStart.getTime()) ? new Date(`${getCurrentMonthKey()}-01T00:00:00`) : monthStart

  const weekStarts = eachWeekOfInterval(
    { start: startOfMonth(safeMonthStart), end: endOfMonth(safeMonthStart) },
    { weekStartsOn: 1 },
  )

  const safeWeekNumber = Math.min(Math.max(week, 1), weekStarts.length || 1)
  const weekStart = weekStarts[safeWeekNumber - 1] ?? weekStarts[0] ?? startOfMonth(safeMonthStart)
  const weekEnd = addDays(weekStart, 6)

  return {
    weekStart,
    weekEnd,
    weekCount: weekStarts.length || 1,
    weekNumber: safeWeekNumber,
  }
}
