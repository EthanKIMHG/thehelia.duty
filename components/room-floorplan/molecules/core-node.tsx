import { cn } from '@/lib/utils'

interface CoreNodeProps {
  icon: React.ReactNode
  label: string
  className?: string
}

export function CoreNode({ icon, label, className }: CoreNodeProps) {
  return (
    <div
      className={cn(
        'flex min-h-[64px] items-center gap-2 rounded-xl border border-[hsl(var(--fp-border))] bg-[hsl(var(--fp-core))] px-3 py-2 text-xs text-muted-foreground',
        className,
      )}
      aria-hidden="true"
    >
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[hsl(var(--fp-border))] bg-white/80 text-[hsl(var(--foreground))]">
        {icon}
      </span>
      <span className="font-medium">{label}</span>
    </div>
  )
}
