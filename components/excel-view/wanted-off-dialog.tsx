'use client'

import { isHoliday } from '@/lib/holidays'
import { parseShift } from '@/lib/shift-utils'
import { cn } from '@/lib/utils'
import { addDays, addMonths, eachDayOfInterval, eachWeekOfInterval, endOfMonth, format, isSameMonth, isToday, startOfMonth, subMonths } from 'date-fns'
import { ko } from 'date-fns/locale'
import { CalendarIcon, Check, ChevronLeft, ChevronRight, Copy, Loader2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { authFetch } from '@/lib/api'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { StaffScheduleViewModel, WantedOffRecord } from './types'

interface WantedOffSheetProps {
  staff: StaffScheduleViewModel
  open: boolean
  onOpenChange: (open: boolean) => void
  currentMonth: Date
}

export function WantedOffSheet({ staff, open, onOpenChange, currentMonth }: WantedOffSheetProps) {
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => startOfMonth(currentMonth))
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [initialDates, setInitialDates] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const monthStr = format(selectedMonth, 'yyyy-MM')

  useEffect(() => {
    if (!open) return
    setSelectedMonth(startOfMonth(currentMonth))
  }, [currentMonth, open])

  useEffect(() => {
    setSelectedDates([])
    setInitialDates([])
  }, [monthStr])

  // Fetch existing wanted offs
  const { data: wantedOffs, isLoading } = useQuery<WantedOffRecord[]>({
    queryKey: ['wanted-offs', staff.id, monthStr],
    queryFn: async () => {
      const res = await authFetch(`/api/wanted-offs?staff_id=${staff.id}&month=${monthStr}`)
      return res.json()
    },
    enabled: open
  })

  // Sync state with fetched data (Only initially)
  useEffect(() => {
    if (wantedOffs) {
      const dates = wantedOffs.map((wantedOff) => new Date(wantedOff.wanted_date))
      const dateStrs = dates.map((d: Date) => format(d, 'yyyy-MM-dd'))
      setSelectedDates(dates)
      setInitialDates(dateStrs)
    }
  }, [wantedOffs])

  const handleDateSelect = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const isSelected = selectedDates.some(d => format(d, 'yyyy-MM-dd') === dateStr)

    if (isSelected) {
        // Remove from local state
        setSelectedDates(prev => prev.filter(d => format(d, 'yyyy-MM-dd') !== dateStr))
    } else {
        // Add to local state (Limit check)
        const targetMonthStr = format(date, 'yyyy-MM')
        const currentMonthCount = selectedDates.filter(d => format(d, 'yyyy-MM') === targetMonthStr).length
        
        if (currentMonthCount >= 2) {
          toast({
             variant: "destructive", 
             title: "신청 한도 초과", 
             description: "월 2회까지만 신청 가능합니다." 
          })
          return
        }
        setSelectedDates(prev => [...prev, date])
    }
  }

  const handleApply = async () => {
    setIsSubmitting(true)
    try {
        const currentSelectedStrs = selectedDates.map(d => format(d, 'yyyy-MM-dd'))
        
        // Find Removed
        const toRemove = initialDates.filter(d => !currentSelectedStrs.includes(d))
        // Find Added
        const toAdd = currentSelectedStrs.filter(d => !initialDates.includes(d))

        // Execute API calls
        const promises = []
        
        for (const dateStr of toRemove) {
            promises.push(
                authFetch('/api/wanted-offs', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ staff_id: staff.id, date: dateStr })
                })
            )
        }

        for (const dateStr of toAdd) {
            promises.push(
                authFetch('/api/wanted-offs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ staff_id: staff.id, date: dateStr })
                })
            )
        }

        await Promise.all(promises)
        
        await queryClient.invalidateQueries({ queryKey: ['wanted-offs'] })
        
        toast({ title: "저장 완료", description: "희망 휴무가 적용되었습니다.", className: "bg-green-100 border-green-200" })
        onOpenChange(false)

    } catch {
        toast({
            variant: "destructive",
            title: "오류 발생",
            description: "저장 중 문제가 발생했습니다."
        })
    } finally {
        setIsSubmitting(false)
    }
  }

  // --- Custom Grid Generation ---
  const weeks = useMemo(() => {
    const start = startOfMonth(selectedMonth)
    const end = endOfMonth(selectedMonth)
    return eachWeekOfInterval({ start, end }, { weekStartsOn: 0 }) // Sunday start for typical calendar
  }, [selectedMonth])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col h-full p-0 gap-0 overflow-hidden">
        <SheetHeader className="p-6 pb-2 border-b">
          <SheetTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            직원 일정 관리 ({staff.name})
          </SheetTitle>
          <SheetDescription>
            희망 휴무를 신청하거나 주간 일정을 공유할 수 있습니다.
          </SheetDescription>
          
          <div className="flex items-center justify-between bg-muted/30 p-2 rounded-lg border mt-2">
            <span className="font-bold text-foreground text-sm">{staff.name} ({staff.role === 'Nurse' ? '간호사' : '조무사'})</span>
            <div className="flex gap-2 text-xs">
                <div className="flex flex-col items-center px-2 py-1 bg-blue-50 text-blue-700 rounded border border-blue-100">
                    <span className="text-[10px] text-blue-600/70">근무</span>
                    <span className="font-bold">{staff.stats.workDays}</span>
                </div>
                <div className="flex flex-col items-center px-2 py-1 bg-red-50 text-red-700 rounded border border-red-100">
                    <span className="text-[10px] text-red-600/70">휴무</span>
                    <span className="font-bold">{staff.stats.offDays}</span>
                </div>
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="wanted" className="flex-1 flex flex-col overflow-hidden min-h-0">
            <div className="px-6 pt-2 space-y-3 shrink-0">
                 <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="wanted">희망 휴무 신청</TabsTrigger>
                    <TabsTrigger value="share">일정 공유</TabsTrigger>
                </TabsList>

                <div className="flex items-center gap-1 rounded-lg border bg-muted/30 p-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => setSelectedMonth((prev) => subMonths(prev, 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="min-w-0 flex-1 text-center leading-tight">
                    <p className="text-sm font-semibold">{format(selectedMonth, 'yyyy년 M월', { locale: ko })}</p>
                    <p className="text-[11px] text-muted-foreground">지난달/다음달을 선택할 수 있어요</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 shrink-0 px-2 text-xs"
                    onClick={() => setSelectedMonth(startOfMonth(currentMonth))}
                  >
                    기준월
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => setSelectedMonth((prev) => addMonths(prev, 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
            </div>
            
            <TabsContent value="wanted" className="mt-0 flex-1 min-h-0 overflow-hidden p-6 pt-3 data-[state=active]:flex data-[state=active]:flex-col">
                 <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 flex flex-col relative border rounded-lg shadow-sm">
                    {isLoading && !wantedOffs ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : null}
                    
                    {/* Header Row */}
                    <div className="grid grid-cols-7 border-b bg-muted/50 shrink-0 h-10 sticky top-0 z-10">
                        {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
                            <div 
                              key={day} 
                              className={cn(
                                "flex items-center justify-center text-sm font-medium",
                                i === 0 && "text-red-500",
                                i === 6 && "text-blue-500"
                              )}
                            >
                              {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Body */}
                    <div className="flex-1 flex flex-col divide-y bg-background">
                         {weeks.map((weekStart) => {
                             const weekEnd = addDays(weekStart, 6)
                             const days = eachDayOfInterval({ start: weekStart, end: weekEnd })
                             return (
                                 <div key={weekStart.toISOString()} className="grid grid-cols-7 flex-1 divide-x min-h-0">
                                     {days.map((date, dayIdx) => {
                                         const dateStr = format(date, 'yyyy-MM-dd')
                                         const isCurrentMonth = isSameMonth(date, selectedMonth)
                                         const isSelected = selectedDates.some(d => format(d, 'yyyy-MM-dd') === dateStr)
                                         const isTodayDate = isToday(date)
                                         const holidayName = isHoliday(date)
                                         const isSunday = dayIdx === 0
                                         const isSaturday = dayIdx === 6

                                         return (
                                             <div 
                                                key={dateStr}
                                                onClick={() => isCurrentMonth && !isSubmitting && handleDateSelect(date)}
                                                className={cn(
                                                    "relative flex flex-col items-center justify-start py-2 cursor-pointer transition-colors hover:bg-muted/50",
                                                    !isCurrentMonth && "bg-muted/20 cursor-default opacity-50",
                                                    isSelected && "bg-primary/10",
                                                    isSubmitting && "cursor-not-allowed opacity-50"
                                                )}
                                             >
                                                <div className="flex flex-col items-center gap-1">
                                                     <span className={cn(
                                                        "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full transition-all",
                                                        isSelected && "bg-primary text-primary-foreground font-bold shadow-md",
                                                        !isSelected && isTodayDate && "bg-accent text-accent-foreground",
                                                        !isSelected && !isTodayDate && isSunday && "text-red-500",
                                                        !isSelected && !isTodayDate && isSaturday && "text-blue-500",
                                                        !isSelected && holidayName && "text-red-500"
                                                     )}>
                                                        {format(date, 'd')}
                                                     </span>
                                                     {holidayName && (
                                                        <span className="text-[10px] text-red-500 truncate max-w-[40px] leading-none">
                                                            {holidayName}
                                                        </span>
                                                     )}
                                                </div>
                                             </div>
                                         )
                                     })}
                                 </div>
                             )
                         })}
                    </div>
                 </div>

                 <div className="text-[11px] text-muted-foreground text-center shrink-0 mt-4">
                    {staff.employmentType === 'full-time' 
                        ? "날짜를 클릭하여 선택/해제 (월 최대 2일)" 
                        : "⚠️ 정규직 외 직원도 선택 가능하도록 변경되었습니다."}
                 </div>

                 <div className="flex justify-end gap-2 pt-2 border-t mt-auto shrink-0">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="h-8 text-xs" disabled={isSubmitting}>
                        취소
                    </Button>
                    <Button onClick={handleApply} className="h-8 text-xs" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                        적용
                    </Button>
                 </div>
            </TabsContent>

            <TabsContent value="share" className="mt-0 flex-1 min-h-0 overflow-hidden p-6 data-[state=active]:block">
                <ScheduleShareTab staff={staff} targetMonth={selectedMonth} />
            </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}


function ScheduleShareTab({ staff, targetMonth }: { staff: StaffScheduleViewModel, targetMonth: Date }) {
    const weeks = useMemo(() => {
        const start = startOfMonth(targetMonth)
        const end = endOfMonth(targetMonth)
        return eachWeekOfInterval({ start, end }, { weekStartsOn: 1 }) // Monday start
    }, [targetMonth])

    const [copiedWeek, setCopiedWeek] = useState<string | null>(null)

    const handleCopy = (weekStart: Date) => {
        const weekEnd = addDays(weekStart, 6)
        const days = eachDayOfInterval({ start: weekStart, end: weekEnd })
        
        const weekIndex = weeks.findIndex((week) => week.getTime() === weekStart.getTime())
        const weekNum = weekIndex >= 0 ? weekIndex + 1 : 1
        let text = `${format(targetMonth, 'M월', { locale: ko })} ${weekNum}주차 ${staff.name} 선생님 근무표입니다.\n`
        
        const scheduleLines = days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd')
            const shift = staff.schedule.find((scheduleEntry) => scheduleEntry.date === dateStr)?.type ?? '/'
            const shiftLabel = getReadableShiftLabel(shift)
            const dayName = format(day, 'EEEE', { locale: ko })
            const dayNum = format(day, 'M월 d일')
            return `${dayNum} ${dayName}: ${shiftLabel}`
        })
        
        text += scheduleLines.join('\n')

        navigator.clipboard.writeText(text)
        const key = weekStart.toISOString()
        setCopiedWeek(key)
        setTimeout(() => setCopiedWeek(null), 2000)
    }

    return (
        <div className="h-full min-h-0 overflow-y-auto overflow-x-hidden space-y-4 pb-6 pr-1">
            <div className="rounded-xl border-2 border-primary/20 bg-primary/5 px-4 py-3">
                <p className="text-base font-bold">쉬운 공유 안내</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  각 주차 카드의 `한 주 복사` 버튼을 누른 뒤, 카카오톡에 붙여넣기 하면 됩니다.
                </p>
            </div>

            {weeks.map((weekStart, i) => {
                 const weekEnd = addDays(weekStart, 6)
                 const weekNum = i + 1
                 const days = eachDayOfInterval({ start: weekStart, end: weekEnd })
                 
                 return (
                    <div key={weekStart.toISOString()} className="rounded-xl border-2 border-border bg-card p-4 space-y-3 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div className="flex items-baseline gap-2">
                                <h4 className="text-lg font-black tracking-tight">
                                    {format(targetMonth, 'M월', { locale: ko })} {weekNum}주차
                                </h4>
                                <span className="text-sm text-muted-foreground font-medium">
                                    {format(weekStart, 'MM.dd')} ~ {format(weekEnd, 'MM.dd')}
                                </span>
                            </div>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-10 text-sm font-semibold gap-1.5 px-3 bg-muted/20 hover:bg-muted"
                                onClick={() => handleCopy(weekStart)}
                            >
                                {copiedWeek === weekStart.toISOString() ? (
                                    <>
                                        <Check className="h-3 w-3 text-green-600" />
                                        복사 완료
                                    </>
                                ) : (
                                    <>
                                        <Copy className="h-3 w-3" />
                                        한 주 복사
                                    </>
                                )}
                            </Button>
                        </div>
                        
                        <div className="space-y-2">
                            {days.map((day) => {
                                const dateStr = format(day, 'yyyy-MM-dd')
                                const shift = staff.schedule.find((scheduleEntry) => scheduleEntry.date === dateStr)?.type ?? '/'
                                const dayName = format(day, 'EEEE', { locale: ko })
                                const parsed = parseShift(shift)
                                const readableShift = getReadableShiftLabel(shift)
                                const readableDetail = getReadableShiftDetail(shift)
                                const isHolidayDay = Boolean(isHoliday(day))
                                
                                return (
                                    <div
                                      key={dateStr}
                                      className={cn(
                                        "rounded-lg border-2 px-3 py-2",
                                        parsed.type === '/' && "bg-muted/25 border-muted",
                                        parsed.type !== '/' && "bg-background border-border",
                                        isHolidayDay && "border-red-200 bg-red-50/40"
                                      )}
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                          <p className="text-sm font-semibold">
                                            {format(day, 'M월 d일')} {dayName}
                                          </p>
                                          <span
                                            className={cn(
                                              "rounded-md px-2 py-1 text-sm font-bold",
                                              getShiftBadgeClass(parsed.type)
                                            )}
                                          >
                                            {parsed.original || '/'}
                                          </span>
                                        </div>
                                        <p className={cn(
                                          "mt-1 text-lg font-black tracking-tight",
                                          parsed.type === '/' ? "text-muted-foreground" : "text-foreground"
                                        )}>
                                          {readableShift}
                                        </p>
                                        {readableDetail ? (
                                          <p className="text-sm text-muted-foreground">{readableDetail}</p>
                                        ) : null}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                 )
            })}
        </div>
    )
}

function getReadableShiftLabel(shift: string) {
  const parsed = parseShift(shift)
  if (parsed.type === '/') return '휴무'
  if (parsed.type === 'D') return '데이 근무'
  if (parsed.type === 'E') return '이브닝 근무'
  if (parsed.type === 'N') return '나이트 근무'
  if (parsed.type === 'M') return '미들 근무'
  return '데이 + 이브닝 연속 근무'
}

function getReadableShiftDetail(shift: string) {
  const parsed = parseShift(shift)
  if (!parsed.otHours) return ''
  if (parsed.otPosition === 'pre') return `근무 전 연장 ${parsed.otHours}시간 포함`
  if (parsed.otPosition === 'post') return `근무 후 연장 ${parsed.otHours}시간 포함`
  return ''
}

function getShiftBadgeClass(type: ReturnType<typeof parseShift>['type']) {
  if (type === 'D') return 'bg-amber-100 text-amber-800'
  if (type === 'E') return 'bg-emerald-100 text-emerald-800'
  if (type === 'N') return 'bg-blue-100 text-blue-800'
  if (type === 'M') return 'bg-violet-100 text-violet-800'
  if (type === 'DE') return 'bg-indigo-100 text-indigo-800'
  return 'bg-slate-100 text-slate-700'
}
