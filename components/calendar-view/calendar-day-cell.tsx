import { isHoliday } from '@/lib/holidays'
import { cn } from '@/lib/utils'
import { format, isSameMonth, isToday } from 'date-fns'
import { MoreHorizontal } from 'lucide-react'
import type { MouseEvent } from 'react'
import type { CalendarDateEvents, CalendarStayEvent } from './types'

type CalendarDayCellProps = {
  date: Date
  dayIndex: number
  currentDate: Date
  events: CalendarDateEvents
  maxVisibleEvents: number
  onMoreClick: (date: Date, event: MouseEvent<HTMLButtonElement>) => void
}

export function CalendarDayCell({
  date,
  dayIndex,
  currentDate,
  events,
  maxVisibleEvents,
  onMoreClick,
}: CalendarDayCellProps) {
  const holidayName = isHoliday(date)
  const isSunday = dayIndex === 0
  const isSaturday = dayIndex === 6
  const isCurrentMonth = isSameMonth(date, currentDate)
  const isTodayDate = isToday(date)

  const allEvents: CalendarStayEvent[] = [
    ...events.checkIns.map((stay) => ({ ...stay, type: 'in' as const })),
    ...events.checkOuts.map((stay) => ({ ...stay, type: 'out' as const })),
  ]

  const visibleEvents = allEvents.slice(0, maxVisibleEvents)
  const hiddenCount = Math.max(0, allEvents.length - maxVisibleEvents)

  return (
    <div
      className={cn(
        'min-h-[140px] bg-background p-2 transition-colors hover:bg-muted/10',
        !isCurrentMonth && 'bg-muted/30 text-muted-foreground',
        isTodayDate && 'bg-accent/10',
      )}
    >
      <div className="flex items-start justify-between">
        <span
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium',
            isTodayDate && 'bg-primary text-primary-foreground',
            !isTodayDate && isSunday && 'text-red-500',
            !isTodayDate && isSaturday && 'text-blue-500',
            holidayName && 'text-red-500',
          )}
        >
          {format(date, 'd')}
        </span>
        {holidayName ? (
          <span className="max-w-[80px] truncate text-right text-xs font-medium text-red-500">{holidayName}</span>
        ) : null}
      </div>

      <div className="mt-1 space-y-0.5">
        {visibleEvents.map((event) => (
          <div
            key={`${event.type}-${event.id}`}
            className={cn(
              'flex items-center gap-1 truncate rounded px-1.5 py-0.5 text-xs',
              event.type === 'in'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
            )}
          >
            <span>{event.type === 'in' ? '입실:' : '퇴실:'}</span>
            <span className="truncate">{event.room_number} {event.mother_name}</span>
          </div>
        ))}

        {hiddenCount > 0 ? (
          <button
            type="button"
            onClick={(event) => onMoreClick(date, event)}
            className="flex w-full items-center justify-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted/80"
          >
            <MoreHorizontal className="h-3 w-3" />
            <span>+{hiddenCount}개 더보기</span>
          </button>
        ) : null}
      </div>
    </div>
  )
}
