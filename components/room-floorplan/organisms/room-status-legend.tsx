import { CalendarClock, BedDouble, LogIn, UserRound } from 'lucide-react'

import { cn } from '@/lib/utils'

const legendItems = [
  {
    key: 'occupied',
    label: '입실중',
    icon: <UserRound className="h-3.5 w-3.5" />,
    className: 'border-[hsl(var(--room-occupied-border))] bg-[hsl(var(--room-occupied-bg))]',
  },
  {
    key: 'empty',
    label: '비어있음',
    icon: <BedDouble className="h-3.5 w-3.5" />,
    className: 'border-[hsl(var(--room-empty-border))] bg-[hsl(var(--room-empty-bg))]',
  },
  {
    key: 'checkout-d2',
    label: '퇴실임박 D-2',
    icon: <CalendarClock className="h-3.5 w-3.5" />,
    className: 'border-[hsl(var(--room-checkout-yellow-border))] bg-[hsl(var(--room-checkout-yellow-bg))]',
  },
  {
    key: 'checkout-red',
    label: '퇴실임박 D-1/D-Day',
    icon: <CalendarClock className="h-3.5 w-3.5" />,
    className: 'border-[hsl(var(--room-checkout-red-border))] bg-[hsl(var(--room-checkout-red-bg))]',
  },
  {
    key: 'upcoming',
    label: '입실예정',
    icon: <LogIn className="h-3.5 w-3.5" />,
    className: 'border-sky-200 bg-sky-50',
  },
]

export function RoomStatusLegend() {
  return (
    <section className="rounded-2xl border border-[hsl(var(--fp-border))] bg-[hsl(var(--fp-surface))] p-4">
      <h4 className="text-sm font-semibold">상태 범례</h4>
      <div className="mt-3 flex flex-wrap gap-2">
        {legendItems.map((item) => (
          <span
            key={item.key}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs text-foreground',
              item.className,
            )}
          >
            {item.icon}
            {item.label}
          </span>
        ))}
      </div>
    </section>
  )
}
