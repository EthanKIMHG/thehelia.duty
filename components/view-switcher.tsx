'use client'

import { Button } from '@/components/ui/button'
import { APP_VIEW_ITEMS, type AppView } from '@/lib/app-views'
import { cn } from '@/lib/utils'
import { BedDouble, Calendar, LayoutGrid } from 'lucide-react'
import Link from 'next/link'

interface ViewSwitcherProps {
  currentView: AppView
}

const getIcon = (view: AppView) => {
  if (view === 'calendar') return Calendar
  if (view === 'room-floor') return BedDouble
  return LayoutGrid
}

export function ViewSwitcher({ currentView }: ViewSwitcherProps) {
  return (
    <div className="flex items-center space-x-2 bg-muted p-1 rounded-lg">
      {APP_VIEW_ITEMS.map(({ href, label, view }) => {
        const Icon = getIcon(view)

        return (
          <Button
            key={view}
            asChild
            variant="ghost"
            size="sm"
            className={cn('flex-1', currentView === view && 'bg-background shadow-sm')}
          >
            <Link href={href}>
              <Icon className="mr-2 h-4 w-4" />
              {label}
            </Link>
          </Button>
        )
      })}
    </div>
  )
}
