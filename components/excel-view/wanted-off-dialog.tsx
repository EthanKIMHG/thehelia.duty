'use client'

import { isHoliday } from '@/lib/holidays'
import { parseShift } from '@/lib/shift-utils'
import { cn } from '@/lib/utils'
import { addDays, addMonths, eachDayOfInterval, eachWeekOfInterval, endOfMonth, format, isSameMonth, isToday, startOfMonth, subMonths } from 'date-fns'
import { ko } from 'date-fns/locale'
import { CalendarIcon, ChevronLeft, ChevronRight, Download, Loader2, MessageCircle } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

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
    const { toast } = useToast()
    const kakaoAppKey = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY
    const weeks = useMemo(() => {
        const start = startOfMonth(targetMonth)
        const end = endOfMonth(targetMonth)
        return eachWeekOfInterval({ start, end }, { weekStartsOn: 1 }) // Monday start
    }, [targetMonth])

    const scheduleByDate = useMemo(() => {
      const map = new Map<string, string>()
      staff.schedule.forEach((entry) => {
        map.set(entry.date, entry.type)
      })
      return map
    }, [staff.schedule])

    const [savingWeek, setSavingWeek] = useState<string | null>(null)
    const [sharingWeek, setSharingWeek] = useState<string | null>(null)
    const [isKakaoReady, setIsKakaoReady] = useState(false)
    const imageSaveLockRef = useRef(new Set<string>())
    const kakaoShareLockRef = useRef(new Set<string>())

    useEffect(() => {
      if (!kakaoAppKey) {
        setIsKakaoReady(false)
        return
      }

      let cancelled = false

      ensureKakaoSdk(kakaoAppKey)
        .then(() => {
          if (!cancelled) {
            setIsKakaoReady(true)
          }
        })
        .catch((error) => {
          console.error('[Kakao Share] SDK 초기화 실패', error)
          if (!cancelled) {
            setIsKakaoReady(false)
          }
        })

      return () => {
        cancelled = true
      }
    }, [kakaoAppKey])

    const buildWeekPayload = (weekStart: Date, weekNum: number): WeekSharePayload => {
      const weekEnd = addDays(weekStart, 6)
      const days = eachDayOfInterval({ start: weekStart, end: weekEnd })

      const entries = days.map((day) => {
        const dateStr = format(day, 'yyyy-MM-dd')
        const shift = scheduleByDate.get(dateStr) ?? '/'
        const parsed = parseShift(shift)
        return {
          date: day,
          dateStr,
          dayLabel: format(day, 'M월 d일'),
          dayName: format(day, 'EEEE', { locale: ko }),
          shift,
          parsed,
          readableShift: getReadableShiftLabel(shift),
          readableDetail: getReadableShiftDetail(shift),
          isHolidayDay: Boolean(isHoliday(day)),
        }
      })

      return {
        weekStart,
        weekEnd,
        weekNum,
        entries,
      }
    }

    const handleSaveImage = async (weekStart: Date, weekNum: number) => {
      const weekKey = weekStart.toISOString()
      if (imageSaveLockRef.current.has(weekKey)) return
      imageSaveLockRef.current.add(weekKey)

      const week = buildWeekPayload(weekStart, weekNum)
      setSavingWeek(weekKey)

      try {
        const canvas = renderWeekScheduleImage({
          monthLabel: format(targetMonth, 'M월', { locale: ko }),
          weekNum: week.weekNum,
          rangeLabel: `${format(week.weekStart, 'MM.dd')} ~ ${format(week.weekEnd, 'MM.dd')}`,
          staffName: staff.name,
          roleLabel: staff.role === 'Nurse' ? '간호사' : '조무사',
          entries: week.entries,
        })

        const blob = await canvasToPngBlob(canvas)
        const safeFileName = sanitizeFileName(
          `${format(targetMonth, 'yyyy-MM')}-${week.weekNum}주차-${staff.name}-근무표.png`,
        )
        const file = new File([blob], safeFileName, { type: 'image/png' })

        if (canShareImageFile(file)) {
          await navigator.share({
            title: `${format(targetMonth, 'M월', { locale: ko })} ${week.weekNum}주차 ${staff.name} 근무표`,
            text: `${staff.name} 선생님 주간 근무표입니다.`,
            files: [file],
          })
          toast({
            title: '공유 창 열기 완료',
            description: '열린 공유 창에서 사진 저장 또는 카카오톡 전송을 선택하세요.',
          })
          return
        }

        downloadBlob(blob, safeFileName)
        toast({
          title: '이미지 저장 완료',
          description: '주간 근무표 PNG를 다운로드했습니다.',
        })
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }
        toast({
          variant: 'destructive',
          title: '이미지 생성 실패',
          description: '이미지 저장 중 문제가 발생했습니다.',
        })
      } finally {
        imageSaveLockRef.current.delete(weekKey)
        setSavingWeek(null)
      }
    }

    const handleKakaoShare = async (weekStart: Date, weekNum: number) => {
      const weekKey = weekStart.toISOString()
      if (kakaoShareLockRef.current.has(weekKey)) return
      kakaoShareLockRef.current.add(weekKey)
      setSharingWeek(weekKey)

      const week = buildWeekPayload(weekStart, weekNum)
      const monthLabel = format(targetMonth, 'M월', { locale: ko })
      const monthKey = format(targetMonth, 'yyyy-MM')
      const rangeLabel = `${format(week.weekStart, 'MM.dd')} ~ ${format(week.weekEnd, 'MM.dd')}`
      const shareTitle = `[${monthLabel} ${week.weekNum}주차] 더헬리아 근무표 업데이트 완료!`
      const shareDescription = `${staff.name} 선생님 주간 근무표 (${rangeLabel})`
      const shareMeta = getShareUrls(monthKey, week.weekNum, staff.id)
      const { shareUrl, imageUrl } = shareMeta
      const shouldUseKakaoTemplateOnly = Boolean(kakaoAppKey) && !shareMeta.isLocalhost

      try {
        let sharedWithKakao = false
        if (!shareMeta.isLocalhost) {
          sharedWithKakao = sendViaKakaoTalk({
            title: shareTitle,
            description: shareDescription,
            shareUrl,
            imageUrl,
          })
        } else if (kakaoAppKey) {
          toast({
            title: '공유 링크 설정 필요',
            description: 'localhost 링크는 카카오톡 수신자에게 열리지 않을 수 있습니다. NEXT_PUBLIC_SHARE_BASE_URL을 설정하세요.',
          })
        }

        if (sharedWithKakao) {
          toast({
            title: '카카오톡 공유 창 열기 완료',
            description: '친구 또는 단톡방을 선택해 전송하세요.',
          })
          return
        }

        if (shouldUseKakaoTemplateOnly) {
          toast({
            variant: 'destructive',
            title: '카카오 템플릿 공유 실패',
            description: '도메인/키 설정을 확인해 주세요. 개발자도구 Console 로그를 함께 확인하세요.',
          })
          return
        }

        if (kakaoAppKey && !isKakaoReady) {
          toast({
            variant: 'destructive',
            title: '카카오 SDK 준비 중',
            description: '잠시 후 다시 시도하거나 도메인 설정을 확인해 주세요.',
          })
        }

        if (canUseNativeShare()) {
          await navigator.share({
            title: shareTitle,
            text: `${shareDescription}\n${shareUrl}`,
            url: shareUrl,
          })
          toast({
            title: '공유 창 열기 완료',
            description: '카카오톡을 선택해 전송할 수 있습니다.',
          })
          return
        }

        await navigator.clipboard.writeText(`${shareTitle}\n${shareUrl}`)
        toast({
          title: '링크 복사 완료',
          description: '카카오톡 대화방에 붙여넣어 공유할 수 있습니다.',
        })
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }

        toast({
          variant: 'destructive',
          title: '카카오톡 공유 실패',
          description: '공유 중 문제가 발생했습니다.',
        })
      } finally {
        kakaoShareLockRef.current.delete(weekKey)
        setSharingWeek(null)
      }
    }

    return (
        <div className="h-full min-h-0 overflow-y-auto overflow-x-hidden space-y-4 pb-6 pr-1">
            <div className="rounded-xl border-2 border-primary/20 bg-primary/5 px-4 py-3">
                <p className="text-base font-bold">쉬운 공유 안내</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  각 주차 카드에서 `카카오톡 공유` 또는 `이미지 저장` 버튼으로 바로 공유할 수 있습니다.
                </p>
            </div>

            {weeks.map((weekStart, i) => {
                 const weekNum = i + 1
                 const week = buildWeekPayload(weekStart, weekNum)
                 const weekKey = weekStart.toISOString()
                 
                 return (
                    <div key={weekStart.toISOString()} className="rounded-xl border-2 border-border bg-card p-4 space-y-3 shadow-sm">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex min-w-0 flex-col">
                                <h4 className="text-lg font-black tracking-tight">
                                    {format(targetMonth, 'M월', { locale: ko })} {weekNum}주차
                                </h4>
                                <span className="text-sm text-muted-foreground font-medium">
                                    {format(week.weekStart, 'MM.dd(E)', { locale: ko })} ~ {format(week.weekEnd, 'MM.dd(E)', { locale: ko })}
                                </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-10 text-sm font-semibold gap-1.5 px-3 bg-muted/20 hover:bg-muted"
                                onClick={() => handleSaveImage(weekStart, weekNum)}
                                disabled={savingWeek === weekKey || sharingWeek === weekKey}
                              >
                                {savingWeek === weekKey ? (
                                  <>
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    생성 중
                                  </>
                                ) : (
                                  <>
                                    <Download className="h-3 w-3" />
                                    이미지 저장
                                  </>
                                )}
                              </Button>
                              <Button 
                                  type="button"
                                  variant="outline" 
                                  size="sm" 
                                  className="h-10 text-sm font-semibold gap-1.5 px-3 bg-muted/20 hover:bg-muted"
                                  onClick={() => handleKakaoShare(weekStart, weekNum)}
                                  disabled={sharingWeek === weekKey || savingWeek === weekKey}
                              >
                                  {sharingWeek === weekKey ? (
                                      <>
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                          공유 중
                                      </>
                                  ) : (
                                      <>
                                          <MessageCircle className="h-3 w-3" />
                                          카카오톡 공유
                                      </>
                                  )}
                              </Button>
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            {week.entries.map((entry) => {
                                return (
                                    <div
                                      key={entry.dateStr}
                                      className={cn(
                                        "rounded-lg border-2 px-3 py-2",
                                        entry.parsed.type === '/' && "bg-muted/25 border-muted",
                                        entry.parsed.type !== '/' && "bg-background border-border",
                                        entry.isHolidayDay && "border-red-200 bg-red-50/40"
                                      )}
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                          <p className="text-sm font-semibold">
                                            {entry.dayLabel} {entry.dayName}
                                          </p>
                                          <span
                                            className={cn(
                                              "rounded-md px-2 py-1 text-sm font-bold",
                                              getShiftBadgeClass(entry.parsed.type)
                                            )}
                                          >
                                            {entry.parsed.original || '/'}
                                          </span>
                                        </div>
                                        <p className={cn(
                                          "mt-1 text-lg font-black tracking-tight",
                                          entry.parsed.type === '/' ? "text-muted-foreground" : "text-foreground"
                                        )}>
                                          {entry.readableShift}
                                        </p>
                                        {entry.readableDetail ? (
                                          <p className="text-sm text-muted-foreground">{entry.readableDetail}</p>
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

type WeekShareEntry = {
  date: Date
  dateStr: string
  dayLabel: string
  dayName: string
  shift: string
  parsed: ReturnType<typeof parseShift>
  readableShift: string
  readableDetail: string
  isHolidayDay: boolean
}

type WeekSharePayload = {
  weekStart: Date
  weekEnd: Date
  weekNum: number
  entries: WeekShareEntry[]
}

function renderWeekScheduleImage({
  monthLabel,
  weekNum,
  rangeLabel,
  staffName,
  roleLabel,
  entries,
}: {
  monthLabel: string
  weekNum: number
  rangeLabel: string
  staffName: string
  roleLabel: string
  entries: WeekShareEntry[]
}) {
  const width = 1080
  const outerPadding = 32
  const cardPadding = 40
  const rowHeight = 132
  const rowGap = 12
  const headerHeight = 152
  const footerHeight = 48
  const cardWidth = width - outerPadding * 2
  const rowsHeight = entries.length * rowHeight + Math.max(entries.length - 1, 0) * rowGap
  const cardHeight = cardPadding * 2 + headerHeight + rowsHeight + footerHeight
  const height = cardHeight + outerPadding * 2

  const pixelRatio = typeof window === 'undefined' ? 1 : Math.min(window.devicePixelRatio || 1, 2)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * pixelRatio)
  canvas.height = Math.round(height * pixelRatio)

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('캔버스 컨텍스트를 생성하지 못했습니다.')
  }

  ctx.scale(pixelRatio, pixelRatio)

  const backgroundGradient = ctx.createLinearGradient(0, 0, width, height)
  backgroundGradient.addColorStop(0, '#f8fafc')
  backgroundGradient.addColorStop(1, '#ecfeff')
  ctx.fillStyle = backgroundGradient
  ctx.fillRect(0, 0, width, height)

  const cardX = outerPadding
  const cardY = outerPadding
  drawRoundedRect(ctx, cardX, cardY, cardWidth, cardHeight, 30, '#ffffff', '#c7d2fe', 3)

  const titleX = cardX + cardPadding
  let cursorY = cardY + cardPadding

  ctx.fillStyle = '#0f172a'
  ctx.font = '800 48px "Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif'
  ctx.fillText(`${monthLabel} ${weekNum}주차`, titleX, cursorY + 6)

  ctx.fillStyle = '#475569'
  ctx.font = '600 26px "Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif'
  ctx.fillText(rangeLabel, titleX, cursorY + 52)

  const staffBadgeText = `${staffName} 선생님 (${roleLabel})`
  ctx.font = '700 24px "Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif'
  const badgeWidth = Math.max(280, ctx.measureText(staffBadgeText).width + 34)
  const badgeX = cardX + cardWidth - cardPadding - badgeWidth
  drawRoundedRect(ctx, badgeX, cursorY - 16, badgeWidth, 54, 16, '#eef2ff')
  ctx.fillStyle = '#3730a3'
  ctx.fillText(staffBadgeText, badgeX + 18, cursorY + 20)

  cursorY += headerHeight

  const rowX = cardX + cardPadding
  const rowWidth = cardWidth - cardPadding * 2

  entries.forEach((entry) => {
    const rowFillColor = entry.isHolidayDay ? '#fff1f2' : entry.parsed.type === '/' ? '#f8fafc' : '#ffffff'
    const rowBorderColor = entry.isHolidayDay ? '#fecdd3' : '#e2e8f0'
    drawRoundedRect(ctx, rowX, cursorY, rowWidth, rowHeight, 22, rowFillColor, rowBorderColor, 2)

    const textX = rowX + 26
    const textTop = cursorY + 38

    ctx.fillStyle = '#0f172a'
    ctx.font = '700 26px "Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif'
    ctx.fillText(`${entry.dayLabel} ${entry.dayName}`, textX, textTop)

    ctx.fillStyle = entry.parsed.type === '/' ? '#64748b' : '#111827'
    ctx.font = '800 34px "Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif'
    ctx.fillText(entry.readableShift, textX, textTop + 42)

    if (entry.readableDetail) {
      ctx.fillStyle = '#64748b'
      ctx.font = '500 22px "Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif'
      ctx.fillText(entry.readableDetail, textX, textTop + 76)
    }

    const shiftPalette = getImageShiftPalette(entry.parsed.type)
    const shiftText = entry.parsed.original || entry.shift || '/'
    ctx.font = '800 30px "Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif'
    const shiftBadgeWidth = Math.max(90, ctx.measureText(shiftText).width + 40)
    const shiftBadgeHeight = 54
    const shiftBadgeX = rowX + rowWidth - 24 - shiftBadgeWidth
    const shiftBadgeY = cursorY + (rowHeight - shiftBadgeHeight) / 2

    drawRoundedRect(ctx, shiftBadgeX, shiftBadgeY, shiftBadgeWidth, shiftBadgeHeight, 14, shiftPalette.bg)
    ctx.fillStyle = shiftPalette.text
    ctx.textAlign = 'center'
    ctx.fillText(shiftText, shiftBadgeX + shiftBadgeWidth / 2, shiftBadgeY + 36)
    ctx.textAlign = 'left'

    cursorY += rowHeight + rowGap
  })

  ctx.fillStyle = '#64748b'
  ctx.font = '600 22px "Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif'
  ctx.fillText('The Helia Duty', titleX, cardY + cardHeight - cardPadding + 10)

  ctx.fillStyle = '#94a3b8'
  ctx.font = '500 20px "Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif'
  ctx.fillText(
    `${format(new Date(), 'yyyy.MM.dd HH:mm')} 생성`,
    cardX + cardWidth - cardPadding - 220,
    cardY + cardHeight - cardPadding + 8,
  )

  return canvas
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fillColor: string,
  strokeColor?: string,
  strokeWidth = 1,
) {
  const normalizedRadius = Math.max(0, Math.min(radius, width / 2, height / 2))
  ctx.beginPath()
  ctx.moveTo(x + normalizedRadius, y)
  ctx.lineTo(x + width - normalizedRadius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + normalizedRadius)
  ctx.lineTo(x + width, y + height - normalizedRadius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - normalizedRadius, y + height)
  ctx.lineTo(x + normalizedRadius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - normalizedRadius)
  ctx.lineTo(x, y + normalizedRadius)
  ctx.quadraticCurveTo(x, y, x + normalizedRadius, y)
  ctx.closePath()
  ctx.fillStyle = fillColor
  ctx.fill()

  if (strokeColor && strokeWidth > 0) {
    ctx.strokeStyle = strokeColor
    ctx.lineWidth = strokeWidth
    ctx.stroke()
  }
}

function getImageShiftPalette(type: ReturnType<typeof parseShift>['type']) {
  if (type === 'D') return { bg: '#fef3c7', text: '#92400e' }
  if (type === 'E') return { bg: '#d1fae5', text: '#065f46' }
  if (type === 'N') return { bg: '#dbeafe', text: '#1d4ed8' }
  if (type === 'M') return { bg: '#ede9fe', text: '#6d28d9' }
  if (type === 'DE') return { bg: '#e0e7ff', text: '#3730a3' }
  return { bg: '#e2e8f0', text: '#334155' }
}

function canvasToPngBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('이미지 파일을 생성하지 못했습니다.'))
        return
      }
      resolve(blob)
    }, 'image/png', 1)
  })
}

function canShareImageFile(file: File) {
  if (typeof navigator === 'undefined') return false
  if (!('share' in navigator) || typeof navigator.share !== 'function') return false
  if (!('canShare' in navigator) || typeof navigator.canShare !== 'function') return false
  try {
    return navigator.canShare({ files: [file] })
  } catch {
    return false
  }
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, '')
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

type KakaoSharePayload = {
  title: string
  description: string
  shareUrl: string
  imageUrl: string
}

type KakaoShareSdk = {
  VERSION?: string
  cleanup?: () => void
  isInitialized: () => boolean
  init: (appKey: string) => void
  Share?: {
    sendDefault: (args: Record<string, unknown>) => void
    sendScrap?: (args: Record<string, unknown>) => void
  }
  Link?: {
    sendDefault: (args: Record<string, unknown>) => void
    sendScrap?: (args: Record<string, unknown>) => void
  }
}

declare global {
  interface Window {
    Kakao?: KakaoShareSdk
  }
}

const KAKAO_SDK_SCRIPT_ID = 'kakao-js-sdk'
let kakaoSdkLoadPromise: Promise<void> | null = null

function canUseNativeShare() {
  return typeof navigator !== 'undefined' && 'share' in navigator && typeof navigator.share === 'function'
}

function getShareUrls(monthKey: string, weekNum: number, staffId?: string) {
  const baseOrigin = getShareBaseOrigin()
  const path = `/share/schedule/${monthKey}/${weekNum}`
  const query = staffId ? `?staff_id=${encodeURIComponent(staffId)}` : ''
  const isLocalhost = isLocalhostOrigin(baseOrigin)
  const shareUrl = buildAbsoluteUrl(baseOrigin, `${path}${query}`)
  const imageUrl = buildAbsoluteUrl(baseOrigin, `${path}/opengraph-image`)

  return {
    shareUrl,
    imageUrl,
    isLocalhost,
  }
}

function getShareBaseOrigin() {
  const fromEnv = process.env.NEXT_PUBLIC_SHARE_BASE_URL?.trim()
  if (fromEnv) {
    const normalized = normalizeOriginUrl(fromEnv)
    if (normalized) return normalized
    console.error('[Kakao Share] NEXT_PUBLIC_SHARE_BASE_URL 형식이 잘못되었습니다.', fromEnv)
  }

  if (typeof window !== 'undefined') {
    return normalizeOriginUrl(window.location.origin) ?? stripTrailingSlash(window.location.origin)
  }

  return ''
}

function normalizeOriginUrl(input: string) {
  const candidate = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(input) ? input : `https://${input}`
  try {
    const url = new URL(candidate)
    return stripTrailingSlash(url.origin)
  } catch {
    return null
  }
}

function stripTrailingSlash(url: string) {
  return url.replace(/\/+$/, '')
}

function buildAbsoluteUrl(baseOrigin: string, path: string) {
  if (!baseOrigin) return path
  try {
    return new URL(path, `${baseOrigin}/`).toString()
  } catch {
    return `${stripTrailingSlash(baseOrigin)}${path}`
  }
}

function isLocalhostOrigin(origin: string) {
  try {
    const url = new URL(origin)
    const host = url.hostname
    return host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host.endsWith('.local')
  } catch {
    return true
  }
}

function loadKakaoSdkScript() {
  if (kakaoSdkLoadPromise) {
    return kakaoSdkLoadPromise
  }

  kakaoSdkLoadPromise = new Promise<void>((resolve, reject) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      reject(new Error('브라우저 환경이 아닙니다.'))
      return
    }

    if (window.Kakao) {
      resolve()
      return
    }

    const existing = document.getElementById(KAKAO_SDK_SCRIPT_ID) as HTMLScriptElement | null
    if (!existing) {
      reject(new Error('카카오 SDK 스크립트 태그를 찾을 수 없습니다.'))
      return
    }

    const timeoutAt = Date.now() + 5000

    const check = () => {
      if (window.Kakao) {
        resolve()
        return
      }

      if (Date.now() > timeoutAt) {
        reject(new Error('카카오 SDK 전역 객체를 찾을 수 없습니다.'))
        return
      }

      window.setTimeout(check, 50)
    }

    check()
  })

  return kakaoSdkLoadPromise.catch((error) => {
    kakaoSdkLoadPromise = null
    throw error
  })
}

async function ensureKakaoSdk(appKey: string) {
  if (typeof window === 'undefined') return null

  if (!window.Kakao) {
    await loadKakaoSdkScript()
  }

  const kakao = window.Kakao
  if (!kakao) {
    throw new Error('카카오 SDK를 초기화하지 못했습니다.')
  }

  if (!kakao.isInitialized()) {
    kakao.init(appKey)
  }

  if (!getKakaoShareSender(kakao)) {
    const availableKeys = Object.keys(kakao).join(', ')
    throw new Error(`카카오 공유 모듈을 찾을 수 없습니다. (available: ${availableKeys})`)
  }

  return kakao
}

function sendViaKakaoTalk(payload: KakaoSharePayload) {
  try {
    if (typeof window === 'undefined') return false
    const kakao = window.Kakao
    if (!kakao || !kakao.isInitialized()) return false

    const sender = getKakaoShareSender(kakao)
    if (!sender) return false

    sender.sendDefault({
      objectType: 'feed',
      content: {
        title: payload.title,
        description: payload.description,
        imageUrl: payload.imageUrl,
        link: {
          mobileWebUrl: payload.shareUrl,
          webUrl: payload.shareUrl,
        },
      },
      buttons: [
        {
          title: '근무표 보기',
          link: {
            mobileWebUrl: payload.shareUrl,
            webUrl: payload.shareUrl,
          },
        },
      ],
    })

    return true
  } catch (error) {
    console.error('[Kakao Share] sendDefault 실패', error)
    return false
  }
}

function getKakaoShareSender(kakao: KakaoShareSdk) {
  if (kakao.Share && typeof kakao.Share.sendDefault === 'function') {
    return kakao.Share
  }
  if (kakao.Link && typeof kakao.Link.sendDefault === 'function') {
    return kakao.Link
  }
  return null
}
