import { Skeleton } from '@/components/ui/skeleton'

interface RoomFloorplanSkeletonProps {
  mode?: 'board' | 'list'
}

export function RoomFloorplanSkeleton({ mode = 'board' }: RoomFloorplanSkeletonProps) {
  if (mode === 'list') {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, idx) => (
          <Skeleton key={idx} className="h-36 rounded-2xl" />
        ))}
      </div>
    )
  }

  return (
    <section className="rounded-2xl border border-[hsl(var(--fp-border))] bg-[hsl(var(--fp-surface))] p-4 md:p-6">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, idx) => (
            <Skeleton key={idx} className="h-36 rounded-2xl" />
          ))}
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_1.6fr]">
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 3 }).map((_, idx) => (
              <Skeleton key={idx} className="h-16 rounded-xl" />
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <Skeleton key={idx} className="h-20 rounded-xl" />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, idx) => (
            <Skeleton key={idx} className="h-36 rounded-2xl" />
          ))}
        </div>
      </div>
    </section>
  )
}
