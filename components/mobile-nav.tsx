'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { BedDouble, Calendar, LayoutGrid } from 'lucide-react'

interface MobileNavProps {
  currentView: 'excel' | 'calendar' | 'room'
  onViewChange: (view: 'excel' | 'calendar' | 'room') => void
}

export function MobileNav({ currentView, onViewChange }: MobileNavProps) {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t p-2 pb-safe-bottom flex justify-around items-center z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "flex flex-col items-center h-auto py-2 gap-1 rounded-xl w-full hover:bg-transparent",
          currentView === 'excel' ? "text-primary" : "text-muted-foreground"
        )}
        onClick={() => onViewChange('excel')}
      >
        <LayoutGrid className={cn("h-6 w-6", currentView === 'excel' && "fill-primary/20")} />
        <span className="text-[10px] font-medium">엑셀 뷰</span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "flex flex-col items-center h-auto py-2 gap-1 rounded-xl w-full hover:bg-transparent",
          currentView === 'calendar' ? "text-primary" : "text-muted-foreground"
        )}
        onClick={() => onViewChange('calendar')}
      >
        <Calendar className={cn("h-6 w-6", currentView === 'calendar' && "fill-primary/20")} />
        <span className="text-[10px] font-medium">캘린더</span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "flex flex-col items-center h-auto py-2 gap-1 rounded-xl w-full hover:bg-transparent",
          currentView === 'room' ? "text-primary" : "text-muted-foreground"
        )}
        onClick={() => onViewChange('room')}
      >
        <BedDouble className={cn("h-6 w-6", currentView === 'room' && "fill-primary/20")} />
        <span className="text-[10px] font-medium">객실 현황</span>
      </Button>
    </div>
  )
}
