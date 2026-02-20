import { Skeleton } from '@/components/ui/skeleton'

export function CalendarViewSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-36" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-9 w-16 hidden md:block" />
          <Skeleton className="h-9 w-9" />
        </div>
      </div>

      <div className="flex gap-4">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-16" />
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="grid grid-cols-7 border-b">
          {Array.from({ length: 7 }).map((_, idx) => (
            <Skeleton key={idx} className="h-10 rounded-none" />
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px bg-border/40 p-px">
          {Array.from({ length: 35 }).map((_, idx) => (
            <Skeleton key={idx} className="h-[132px] rounded-none bg-background" />
          ))}
        </div>
      </div>
    </div>
  )
}
