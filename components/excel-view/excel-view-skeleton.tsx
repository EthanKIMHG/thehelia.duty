import { Skeleton } from '@/components/ui/skeleton'

export function ExcelViewSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-[84px] w-full rounded-xl" />

      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-7 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>

      <div className="hidden md:block">
        <div className="overflow-hidden rounded-md border">
          <div className="grid grid-cols-12 gap-px border-b bg-muted/40 p-px">
            {Array.from({ length: 12 }).map((_, idx) => (
              <Skeleton key={`head-${idx}`} className="h-10 rounded-none bg-background" />
            ))}
          </div>
          <div className="space-y-px bg-muted/40 p-px">
            {Array.from({ length: 6 }).map((_, rowIdx) => (
              <div key={`row-${rowIdx}`} className="grid grid-cols-12 gap-px">
                {Array.from({ length: 12 }).map((_, colIdx) => (
                  <Skeleton key={`cell-${rowIdx}-${colIdx}`} className="h-10 rounded-none bg-background" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4 md:hidden">
        {Array.from({ length: 3 }).map((_, idx) => (
          <Skeleton key={`mobile-card-${idx}`} className="h-48 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
