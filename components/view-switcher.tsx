'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Calendar, LayoutGrid } from 'lucide-react'

interface ViewSwitcherProps {
  currentView: 'excel' | 'calendar' | 'room'
  onViewChange: (view: 'excel' | 'calendar' | 'room') => void
}

export function ViewSwitcher({ currentView, onViewChange }: ViewSwitcherProps) {
  return (
    <div className="flex items-center space-x-2 bg-muted p-1 rounded-lg">
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "flex-1",
          currentView === 'excel' && "bg-background shadow-sm"
        )}
        onClick={() => onViewChange('excel')}
      >
        <LayoutGrid className="w-4 h-4 mr-2" />
        엑셀 뷰
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "flex-1",
          currentView === 'calendar' && "bg-background shadow-sm"
        )}
        onClick={() => onViewChange('calendar')}
      >
        <Calendar className="w-4 h-4 mr-2" />
        캘린더 뷰
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "flex-1",
          currentView === 'room' && "bg-background shadow-sm"
        )}
        onClick={() => onViewChange('room')}
      >
        <LayoutGrid className="w-4 h-4 mr-2" />
        객실 현황
      </Button>
    </div>
  )
}
