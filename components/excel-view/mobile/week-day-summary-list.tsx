import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { WeekDaySummaryItem } from './types'
import { getStatusBadgeClass, getStatusLabel, getStatusSurfaceClass } from './status'

type WeekDaySummaryListProps = {
  items: WeekDaySummaryItem[]
  selectedDateStr: string | null
  onSelectDay: (dateStr: string) => void
}

export function WeekDaySummaryList({ items, selectedDateStr, onSelectDay }: WeekDaySummaryListProps) {
  return (
    <div className="space-y-2">
      {items.map((item) => {
        const statusLabel = getStatusLabel(item.status)
        const isSelected = selectedDateStr === item.dateStr

        return (
          <button
            key={item.dateStr}
            type="button"
            role="button"
            aria-expanded={isSelected}
            aria-controls="mobile-day-detail-sheet"
            onClick={() => onSelectDay(item.dateStr)}
            className={cn(
              'w-full rounded-xl border p-3 text-left transition-colors active:scale-[0.995]',
              getStatusSurfaceClass(item.status),
              item.isToday && 'ring-1 ring-primary/40',
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{format(item.date, 'EEE M/d', { locale: ko })}</p>
                <p className="mt-1 text-xs text-muted-foreground">입실 +{item.checkins} / 퇴실 -{item.checkouts}</p>
              </div>
              <Badge variant="outline" className={cn('h-6 shrink-0 border', getStatusBadgeClass(item.status))}>
                {statusLabel}
              </Badge>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <MetricCell label="신생아" value={`${item.newborns}명`} />
              <MetricCell label="필요" value={`${item.requiredPerShift}명`} />
              <MetricCell label="배치" value={`${item.assignedMin}명`} />
            </div>
          </button>
        )
      })}
    </div>
  )
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-h-11 rounded-lg border bg-background/70 px-2 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  )
}
