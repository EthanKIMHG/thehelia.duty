import { cn } from '@/lib/utils'
import type { MouseEvent } from 'react'
import { CalendarDayCell } from './calendar-day-cell'
import type { CalendarDateEvents } from './types'

type CalendarMonthGridProps = {
  currentDate: Date
  weeks: Date[][]
  maxVisibleEvents: number
  getEventsForDate: (date: Date) => CalendarDateEvents
  onMoreClick: (date: Date, event: MouseEvent<HTMLButtonElement>) => void
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const

export function CalendarMonthGrid({
  currentDate,
  weeks,
  maxVisibleEvents,
  getEventsForDate,
  onMoreClick,
}: CalendarMonthGridProps) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="grid grid-cols-7 border-b bg-muted/50">
        {DAY_LABELS.map((day, idx) => (
          <div
            key={day}
            className={cn(
              'p-3 text-center text-sm font-medium',
              idx === 0 && 'text-red-500',
              idx === 6 && 'text-blue-500',
            )}
          >
            {day}
          </div>
        ))}
      </div>

      <div className="divide-y">
        {weeks.map((week) => (
          <div key={week[0].toISOString()} className="grid grid-cols-7 divide-x">
            {week.map((date, dayIndex) => (
              <CalendarDayCell
                key={date.toISOString()}
                date={date}
                dayIndex={dayIndex}
                currentDate={currentDate}
                events={getEventsForDate(date)}
                maxVisibleEvents={maxVisibleEvents}
                onMoreClick={onMoreClick}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
