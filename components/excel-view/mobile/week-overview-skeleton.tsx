import { Skeleton } from '@/components/ui/skeleton'

export function WeekOverviewSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-[60px] w-full rounded-xl" />
      {Array.from({ length: 7 }).map((_, idx) => (
        <Skeleton key={idx} className="h-[104px] w-full rounded-xl" />
      ))}
    </div>
  )
}
