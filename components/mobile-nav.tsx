'use client'

import { Button } from '@/components/ui/button'
import { APP_VIEW_ITEMS, type AppView } from '@/lib/app-views'
import { cn } from '@/lib/utils'
import { BedDouble, Calendar, LayoutGrid } from 'lucide-react'
import Link from 'next/link'

interface MobileNavProps {
  currentView: AppView
}

const getIcon = (view: AppView) => {
  if (view === 'calendar') return Calendar
  if (view === 'room-floor') return BedDouble
  return LayoutGrid
}

export function MobileNav({ currentView }: MobileNavProps) {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t p-2 pb-safe-bottom flex justify-around items-center z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
      {APP_VIEW_ITEMS.map(({ href, mobileLabel, view }) => {
        const Icon = getIcon(view)

        return (
          <Button
            key={view}
            asChild
            variant="ghost"
            size="sm"
            className={cn(
              'flex h-auto w-full flex-col items-center gap-1 rounded-xl py-2 hover:bg-transparent',
              currentView === view ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <Link href={href}>
              <Icon className={cn('h-6 w-6', currentView === view && 'fill-primary/20')} />
              <span className="text-[10px] font-medium">{mobileLabel}</span>
            </Link>
          </Button>
        )
      })}
    </div>
  )
}
