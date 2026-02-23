import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface SharedSpaceNodeProps {
  icon: React.ReactNode
  title: string
  description: string
  className?: string
}

export function SharedSpaceNode({ icon, title, description, className }: SharedSpaceNodeProps) {
  return (
    <TooltipProvider delayDuration={120}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            tabIndex={0}
            role="note"
            aria-label={`${title}, 공용 공간`}
            className={cn(
              'flex aspect-square min-h-[172px] flex-col rounded-2xl border border-[hsl(var(--fp-border))] bg-white/80 px-3 py-3 text-left shadow-sm md:min-h-[196px] md:p-4',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              className,
            )}
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[hsl(var(--fp-border))] bg-[hsl(var(--fp-surface))] text-foreground">
              {icon}
            </span>
            <div className="mt-3">
              <p className="text-base font-bold text-foreground">{title}</p>
              <p className="mt-1 max-h-[2.8em] overflow-hidden text-xs leading-relaxed text-muted-foreground">{description}</p>
              <p className="mt-2 text-[11px] font-medium text-muted-foreground">터치하여 정보 보기</p>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[240px] text-xs leading-relaxed">
          {description}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
