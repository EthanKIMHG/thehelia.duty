'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { authFetch } from '@/lib/api'
import { isHoliday } from '@/lib/holidays'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format, isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths
} from 'date-fns'
import { ko } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, LogIn, LogOut, MoreHorizontal } from 'lucide-react'
import { useState } from 'react'

interface Stay {
  id: string
  room_number: string
  mother_name: string
  baby_count: number
  check_in_date: string
  check_out_date: string
  status: string
}

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const monthStr = format(currentDate, 'yyyy-MM')
  const { data: staysData } = useQuery<Stay[]>({
    queryKey: ['stays', monthStr],
    queryFn: async () => {
      const res = await authFetch(`/api/stays?month=${monthStr}`)
      return res.json()
    }
  })

  const firstDayOfMonth = startOfMonth(currentDate)
  const lastDayOfMonth = endOfMonth(currentDate)
  const startDate = startOfWeek(firstDayOfMonth, { weekStartsOn: 0 })
  const endDate = endOfWeek(lastDayOfMonth, { weekStartsOn: 0 })

  const days = eachDayOfInterval({ start: startDate, end: endDate })

  const weeks = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }

  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const goToday = () => setCurrentDate(new Date())

  // Helper to get check-ins and check-outs for a date
  const getEventsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const checkIns = staysData?.filter(s => s.check_in_date === dateStr) || []
    const checkOuts = staysData?.filter(s => s.check_out_date === dateStr) || []
    return { checkIns, checkOuts }
  }

  const handleMoreClick = (date: Date, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedDate(date)
    setDrawerOpen(true)
  }

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : { checkIns: [], checkOuts: [] }

  // Max visible items in calendar cell
  const MAX_VISIBLE = 2

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {format(currentDate, 'yyyy년 M월', { locale: ko })}
        </h2>
        <div className="flex items-center space-x-2">
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-2">
            <Button variant="outline" size="icon" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={goToday}>오늘</Button>
            <Button variant="outline" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Mobile Navigation & Actions */}
          <div className="md:hidden flex items-center gap-1">
             <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8">
                <ChevronLeft className="h-4 w-4" />
            </Button>
             <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8">
                <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs">
        <div className="flex items-center gap-1">
          <LogIn className="h-3 w-3 text-green-600" />
          <span>입실</span>
        </div>
        <div className="flex items-center gap-1">
          <LogOut className="h-3 w-3 text-red-600" />
          <span>퇴실</span>
        </div>
      </div>

      <div className="border rounded-lg shadow-sm bg-card text-card-foreground overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-7 border-b bg-muted/50">
          {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
            <div 
              key={day} 
              className={cn(
                "p-3 text-center text-sm font-medium",
                i === 0 && "text-red-500",
                i === 6 && "text-blue-500"
              )}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="divide-y">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 divide-x">
              {week.map((date, dayIndex) => {
                const holidayName = isHoliday(date)
                const isSunday = dayIndex === 0
                const isSaturday = dayIndex === 6
                const isCurrentMonth = isSameMonth(date, currentDate)
                const isTodayDate = isToday(date)
                const { checkIns, checkOuts } = getEventsForDate(date)
                const totalEvents = checkIns.length + checkOuts.length
                const hasMore = totalEvents > MAX_VISIBLE

                // Combine and limit visible items
                const allEvents = [
                  ...checkIns.map(s => ({ ...s, type: 'in' as const })),
                  ...checkOuts.map(s => ({ ...s, type: 'out' as const }))
                ]
                const visibleEvents = allEvents.slice(0, MAX_VISIBLE)
                const hiddenCount = allEvents.length - MAX_VISIBLE

                return (
                  <div 
                    key={date.toString()} 
                    className={cn(
                      "min-h-[140px] p-2 transition-colors hover:bg-muted/10 bg-background",
                      !isCurrentMonth && "bg-muted/30 text-muted-foreground",
                      isTodayDate && "bg-accent/10"
                    )}
                  >
                    <div className="flex justify-between items-start">
                      <span className={cn(
                        "text-sm font-medium h-6 w-6 flex items-center justify-center rounded-full",
                        isTodayDate && "bg-primary text-primary-foreground",
                        !isTodayDate && isSunday && "text-red-500",
                        !isTodayDate && isSaturday && "text-blue-500",
                        holidayName && "text-red-500"
                      )}>
                        {format(date, 'd')}
                      </span>
                      {holidayName && (
                        <span className="text-xs text-red-500 font-medium truncate max-w-[80px] text-right">
                          {holidayName}
                        </span>
                      )}
                    </div>
                    
                    {/* Check-in/Check-out Events */}
                    <div className="mt-1 space-y-0.5">
                      {visibleEvents.map(event => (
                        <div 
                          key={`${event.type}-${event.id}`}
                          className={cn(
                            "flex items-center gap-1 text-xs px-1.5 py-0.5 rounded truncate",
                            event.type === 'in' 
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                          )}
                        >
                          {event.type === 'in' 
                            ? <span>입실:</span>
                            : <span>퇴실:</span>
                          }
                          <span className="truncate">{event.room_number} {event.mother_name}</span>
                        </div>
                      ))}
                      
                      {/* More button */}
                      {hasMore && (
                        <button
                          onClick={(e) => handleMoreClick(date, e)}
                          className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-muted-foreground w-full justify-center transition-colors"
                        >
                          <MoreHorizontal className="h-3 w-3" />
                          <span>+{hiddenCount}개 더보기</span>
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Day Details Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-xl flex items-center gap-2">
              <span className="bg-primary text-primary-foreground px-3 py-1 rounded">
                {selectedDate && format(selectedDate, 'M월 d일 (E)', { locale: ko })}
              </span>
              일정
            </SheetTitle>
            <SheetDescription>
              이 날의 입실 및 퇴실 예정 산모 목록입니다.
            </SheetDescription>
          </SheetHeader>

          <div className="py-6 space-y-6">
            {/* Check-ins */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <LogIn className="h-4 w-4 text-green-600" />
                <span>입실 예정</span>
                <Badge variant="secondary">{selectedDateEvents.checkIns.length}</Badge>
              </div>
              
              {selectedDateEvents.checkIns.length === 0 ? (
                <div className="text-sm text-muted-foreground py-3 text-center border rounded-lg border-dashed">
                  입실 예정 없음
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedDateEvents.checkIns.map(stay => (
                    <div 
                      key={stay.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                    >
                      <div className="flex items-center gap-3">
                        <Badge className="bg-green-600">{stay.room_number}호</Badge>
                        <div>
                          <div className="font-medium">{stay.mother_name}</div>
                          <div className="text-xs text-muted-foreground">
                            아기 {stay.baby_count}명 • ~{stay.check_out_date}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Check-outs */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <LogOut className="h-4 w-4 text-red-600" />
                <span>퇴실 예정</span>
                <Badge variant="secondary">{selectedDateEvents.checkOuts.length}</Badge>
              </div>
              
              {selectedDateEvents.checkOuts.length === 0 ? (
                <div className="text-sm text-muted-foreground py-3 text-center border rounded-lg border-dashed">
                  퇴실 예정 없음
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedDateEvents.checkOuts.map(stay => (
                    <div 
                      key={stay.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                    >
                      <div className="flex items-center gap-3">
                        <Badge className="bg-red-600">{stay.room_number}호</Badge>
                        <div>
                          <div className="font-medium">{stay.mother_name}</div>
                          <div className="text-xs text-muted-foreground">
                            아기 {stay.baby_count}명 • {stay.check_in_date}~
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
