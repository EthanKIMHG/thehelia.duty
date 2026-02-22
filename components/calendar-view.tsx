'use client'

import { Button } from '@/components/ui/button'
import { authFetch } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { ko } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, LogIn, LogOut } from 'lucide-react'
import { type MouseEvent, useMemo, useState } from 'react'
import { CalendarMonthGrid } from './calendar-view/calendar-month-grid'
import { CalendarViewSkeleton } from './calendar-view/calendar-view-skeleton'
import { DayDetailsSheet } from './calendar-view/day-details-sheet'
import type { CalendarDateEvents, CalendarStay } from './calendar-view/types'

const MAX_VISIBLE_EVENTS = 2
const EMPTY_EVENTS: CalendarDateEvents = { checkIns: [], checkOuts: [] }

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const monthStr = format(currentDate, 'yyyy-MM')
  const {
    data: staysData = [],
    isPending,
    isFetching,
    isError,
    refetch,
  } = useQuery<CalendarStay[]>({
    queryKey: ['stays', monthStr],
    queryFn: async () => {
      const res = await authFetch(`/api/stays?month=${monthStr}`)
      if (!res.ok) throw new Error('캘린더 데이터를 불러오지 못했습니다.')
      return res.json()
    },
    placeholderData: (previousData) => previousData,
  })

  const weeks = useMemo(() => {
    const firstDayOfMonth = startOfMonth(currentDate)
    const lastDayOfMonth = endOfMonth(currentDate)
    const startDate = startOfWeek(firstDayOfMonth, { weekStartsOn: 0 })
    const endDate = endOfWeek(lastDayOfMonth, { weekStartsOn: 0 })
    const days = eachDayOfInterval({ start: startDate, end: endDate })

    const groupedWeeks: Date[][] = []
    for (let i = 0; i < days.length; i += 7) {
      groupedWeeks.push(days.slice(i, i + 7))
    }
    return groupedWeeks
  }, [currentDate])

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarDateEvents>()
    for (const stay of staysData) {
      if (!map.has(stay.check_in_date)) {
        map.set(stay.check_in_date, { checkIns: [], checkOuts: [] })
      }
      map.get(stay.check_in_date)?.checkIns.push(stay)

      if (!map.has(stay.check_out_date)) {
        map.set(stay.check_out_date, { checkIns: [], checkOuts: [] })
      }
      map.get(stay.check_out_date)?.checkOuts.push(stay)
    }
    return map
  }, [staysData])

  const getEventsForDate = (date: Date): CalendarDateEvents =>
    eventsByDate.get(format(date, 'yyyy-MM-dd')) ?? EMPTY_EVENTS

  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return EMPTY_EVENTS
    return eventsByDate.get(format(selectedDate, 'yyyy-MM-dd')) ?? EMPTY_EVENTS
  }, [selectedDate, eventsByDate])

  const handleDayClick = (date: Date) => {
    setSelectedDate(date)
    setDrawerOpen(true)
  }

  const handleMoreClick = (date: Date, event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    handleDayClick(date)
  }

  const prevMonth = () => setCurrentDate((prev) => subMonths(prev, 1))
  const nextMonth = () => setCurrentDate((prev) => addMonths(prev, 1))
  const goToday = () => setCurrentDate(new Date())

  if (isPending) return <CalendarViewSkeleton />

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
        <p className="text-sm text-destructive">캘린더 데이터를 불러오는 중 오류가 발생했습니다.</p>
        <Button size="sm" variant="outline" className="mt-3" onClick={() => void refetch()}>
          다시 시도
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h2 className="text-xl font-semibold">{format(currentDate, 'yyyy년 M월', { locale: ko })}</h2>
          {isFetching ? <p className="text-xs text-muted-foreground">네트워크 동기화 중...</p> : null}
        </div>

        <div className="flex items-center space-x-2">
          <div className="hidden items-center space-x-2 md:flex">
            <Button variant="outline" size="icon" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={goToday}>
              오늘
            </Button>
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-1 md:hidden">
            <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

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

      <CalendarMonthGrid
        currentDate={currentDate}
        weeks={weeks}
        maxVisibleEvents={MAX_VISIBLE_EVENTS}
        getEventsForDate={getEventsForDate}
        onDayClick={handleDayClick}
        onMoreClick={handleMoreClick}
      />

      <DayDetailsSheet
        open={drawerOpen}
        selectedDate={selectedDate}
        events={selectedDateEvents}
        onOpenChange={setDrawerOpen}
      />
    </div>
  )
}
