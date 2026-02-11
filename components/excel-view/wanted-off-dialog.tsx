'use client'

import { isHoliday } from '@/lib/holidays'
import { cn } from '@/lib/utils'
import { addDays, eachDayOfInterval, eachWeekOfInterval, endOfMonth, format, getWeek, isSameMonth, isToday, startOfMonth } from 'date-fns'
import { ko } from 'date-fns/locale'
import { CalendarIcon, Check, Copy, Loader2 } from 'lucide-react'
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

interface WantedOffSheetProps {
  staff: any
  open: boolean
  onOpenChange: (open: boolean) => void
  currentMonth: Date
}

export function WantedOffSheet({ staff, open, onOpenChange, currentMonth }: WantedOffSheetProps) {
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [initialDates, setInitialDates] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const monthStr = format(currentMonth, 'yyyy-MM')

  // Fetch existing wanted offs
  const { data: wantedOffs, isLoading } = useQuery<any[]>({
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
      const dates = wantedOffs.map((w: any) => new Date(w.wanted_date))
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

    } catch (error: any) {
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
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)
    return eachWeekOfInterval({ start, end }, { weekStartsOn: 0 }) // Sunday start for typical calendar
  }, [currentMonth])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col h-full p-0 gap-0">
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

        <Tabs defaultValue="wanted" className="flex-1 flex flex-col overflow-hidden">
            <div className="px-6 pt-2">
                 <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="wanted">희망 휴무 신청</TabsTrigger>
                    <TabsTrigger value="share">일정 공유</TabsTrigger>
                </TabsList>
            </div>
            
            <TabsContent value="wanted" className="flex-1 flex flex-col overflow-hidden p-6 pt-4 space-y-4">
                 <div className="flex-1 overflow-y-auto min-h-0 flex flex-col relative border rounded-lg shadow-sm">
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
                         {weeks.map((weekStart, i) => {
                             const weekEnd = addDays(weekStart, 6)
                             const days = eachDayOfInterval({ start: weekStart, end: weekEnd })
                             return (
                                 <div key={weekStart.toISOString()} className="grid grid-cols-7 flex-1 divide-x min-h-0">
                                     {days.map((date, dayIdx) => {
                                         const dateStr = format(date, 'yyyy-MM-dd')
                                         const isCurrentMonth = isSameMonth(date, currentMonth)
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

                 <div className="text-[11px] text-muted-foreground text-center">
                    {staff.employment_type === 'full-time' 
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

            <TabsContent value="share" className="flex-1 p-6">
                <ScheduleShareTab staff={staff} currentMonth={currentMonth} />
            </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}


function ScheduleShareTab({ staff, currentMonth }: { staff: any, currentMonth: Date }) {
    const weeks = useMemo(() => {
        const start = startOfMonth(currentMonth)
        const end = endOfMonth(currentMonth)
        return eachWeekOfInterval({ start, end }, { weekStartsOn: 1 }) // Monday start
    }, [currentMonth])

    const [copiedWeek, setCopiedWeek] = useState<string | null>(null)

    const handleCopy = (weekStart: Date) => {
        const weekEnd = addDays(weekStart, 6)
        const days = eachDayOfInterval({ start: weekStart, end: weekEnd })
        
        let text = `${format(currentMonth, 'M월')} ${getWeek(weekStart, { weekStartsOn: 1 }) - getWeek(startOfMonth(currentMonth), { weekStartsOn: 1 }) + 1}주차 일정 (${staff.name})\n`
        
        const scheduleLines = days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd')
            const shift = staff.schedule.find((s: any) => s.date === dateStr)?.type || '/'
            const dayName = format(day, 'E', { locale: ko })
            const dayNum = format(day, 'd')
            return `${dayName}(${dayNum}): ${shift}`
        })
        
        text += scheduleLines.join('\n')

        navigator.clipboard.writeText(text)
        const key = weekStart.toISOString()
        setCopiedWeek(key)
        setTimeout(() => setCopiedWeek(null), 2000)
    }

    return (
        <div className="space-y-4 pb-6">
            {weeks.map((weekStart, i) => {
                 const weekEnd = addDays(weekStart, 6)
                 const weekNum = i + 1
                 const days = eachDayOfInterval({ start: weekStart, end: weekEnd })
                 
                 return (
                    <div key={weekStart.toISOString()} className="border rounded-md p-3 space-y-2 bg-card shadow-sm">
                        <div className="flex items-center justify-between">
                            <div className="flex items-baseline gap-2">
                                <h4 className="font-bold text-sm">
                                    {format(currentMonth, 'M월')} {weekNum}주차 
                                </h4>
                                <span className="text-muted-foreground text-xs font-normal">
                                    {format(weekStart, 'MM.dd')} ~ {format(weekEnd, 'MM.dd')}
                                </span>
                            </div>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-7 text-xs gap-1.5 px-2 bg-muted/20 hover:bg-muted"
                                onClick={() => handleCopy(weekStart)}
                            >
                                {copiedWeek === weekStart.toISOString() ? (
                                    <>
                                        <Check className="h-3 w-3 text-green-600" />
                                        복사됨
                                    </>
                                ) : (
                                    <>
                                        <Copy className="h-3 w-3" />
                                        복사
                                    </>
                                )}
                            </Button>
                        </div>
                        
                        <div className="grid grid-cols-7 gap-px border rounded-md overflow-hidden bg-muted">
                            {['월', '화', '수', '목', '금', '토', '일'].map((dayName, idx) => (
                                <div key={dayName} className={cn(
                                    "py-1.5 text-center text-[10px] font-medium text-muted-foreground bg-gray-50",
                                    dayName === '일' && "text-red-500 bg-red-50/50",
                                    dayName === '토' && "text-blue-500 bg-blue-50/50"
                                )}>
                                    {dayName}
                                </div>
                            ))}
                            {days.map((day, idx) => {
                                const dateStr = format(day, 'yyyy-MM-dd')
                                const shift = staff.schedule.find((s: any) => s.date === dateStr)?.type || '/'
                                const dayName = format(day, 'E', { locale: ko })
                                const isHolidayDay = isHoliday(day)
                                
                                return (
                                    <div key={dateStr} className={cn(
                                        "flex flex-col items-center justify-center py-1.5 h-[42px] transition-colors bg-background",
                                        isHolidayDay && "bg-red-50/30"
                                    )}>
                                        <div className={cn(
                                            "text-[10px] font-medium mb-0.5 w-4 h-4 flex items-center justify-center rounded-full leading-none",
                                            dayName === '일' && "text-red-500",
                                            dayName === '토' && "text-blue-500",
                                            isHolidayDay && "text-red-500 font-bold",
                                            format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') && "bg-primary text-primary-foreground"
                                        )}>
                                            {format(day, 'd')}
                                        </div>
                                        {isHolidayDay && (
                                            <span className="text-[8px] text-red-500 truncate max-w-full px-1 leading-none mb-0.5">
                                                {isHolidayDay}
                                            </span>
                                        )}
                                        <span className={cn(
                                            "text-xs font-bold",
                                            shift === '/' ? "text-muted-foreground/30 font-normal" : "text-foreground"
                                        )}>{shift}</span>
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
