import { addDays, format, subDays } from 'date-fns'
import Holidays from 'date-holidays'

const hd = new Holidays('KR')

export interface Holiday {
  date: string // YYYY-MM-DD
  name: string
  type: string
}

export function getKoreanHolidays(year: number): Holiday[] {
  const holidays = hd.getHolidays(year)
  const expandedHolidays: Holiday[] = []

  holidays.forEach(h => {
    // Add the holiday itself
    expandedHolidays.push({
      date: h.date.split(' ')[0],
      name: h.name,
      type: h.type
    })

    // Expand Seollal (Lunar New Year) and Chuseok (Korean Thanksgiving)
    // These are 3-day holidays: day before, day of, day after
    if (h.name === '설날' || h.name === '추석') {
      const mainDate = new Date(h.date)

      const prevDay = subDays(mainDate, 1)
      const nextDay = addDays(mainDate, 1)

      expandedHolidays.push({
        date: format(prevDay, 'yyyy-MM-dd'),
        name: h.name, // Keep same name or add prefix like 'Day before ...'
        type: h.type
      })

      expandedHolidays.push({
        date: format(nextDay, 'yyyy-MM-dd'),
        name: h.name,
        type: h.type
      })
    }
  })

  // Sort by date
  return expandedHolidays.sort((a, b) => a.date.localeCompare(b.date))
}

export function isHoliday(date: Date): string | null {
  const dateString = format(date, 'yyyy-MM-dd')
  const year = date.getFullYear()
  const holidays = getKoreanHolidays(year)

  const found = holidays.find(h => h.date === dateString)
  return found ? found.name : null
}
