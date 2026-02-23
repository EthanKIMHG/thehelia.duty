import { cn } from '@/lib/utils'
import type { FloorKey } from '@/components/room-floorplan/types'

interface FloorSwitchProps {
  value: FloorKey
  onChange: (nextFloor: FloorKey) => void
  className?: string
}

export function FloorSwitch({ value, onChange, className }: FloorSwitchProps) {
  return (
    <div
      className={cn(
        'inline-flex h-10 items-center rounded-full border border-[hsl(var(--fp-border))] bg-[hsl(var(--fp-surface))] p-1',
        className,
      )}
      role="tablist"
      aria-label="층 전환"
    >
      {(['5F', '6F'] as const).map((floor) => {
        const isActive = value === floor
        return (
          <button
            key={floor}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={cn(
              'h-8 min-w-[64px] rounded-full px-4 text-sm font-semibold transition-colors',
              isActive
                ? 'bg-white text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => onChange(floor)}
          >
            {floor}
          </button>
        )
      })}
    </div>
  )
}
