import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type MobileWeekNavigatorProps = {
  weekStart: Date
  weekEnd: Date
  isCurrentWeek: boolean
  onPrevWeek: () => void
  onNextWeek: () => void
  onGoCurrentWeek: () => void
}

export function MobileWeekNavigator({
  weekStart,
  weekEnd,
  isCurrentWeek,
  onPrevWeek,
  onNextWeek,
  onGoCurrentWeek,
}: MobileWeekNavigatorProps) {
  const rangeLabel = `${format(weekStart, 'yyyy.MM.dd', { locale: ko })} - ${format(weekEnd, 'MM.dd', { locale: ko })}`

  return (
    <div className="flex items-center gap-2 rounded-xl border bg-card p-2">
      <Button variant="outline" size="icon" className="h-11 w-11" onClick={onPrevWeek}>
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="min-w-0 flex-1 truncate text-center text-sm font-semibold">{rangeLabel}</div>

      <Button variant="outline" size="icon" className="h-11 w-11" onClick={onNextWeek}>
        <ChevronRight className="h-4 w-4" />
      </Button>

      <Button variant="ghost" className="h-11 shrink-0 px-3 text-xs" onClick={onGoCurrentWeek} disabled={isCurrentWeek}>
        이번주
      </Button>
    </div>
  )
}
