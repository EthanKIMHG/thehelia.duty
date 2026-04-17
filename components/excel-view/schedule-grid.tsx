'use client'

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { parseShift } from "@/lib/shift-utils"
import { cn } from "@/lib/utils"
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { GripVertical } from "lucide-react"
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { WantedOffSheet } from "./wanted-off-dialog"
import { useToast } from '@/hooks/use-toast'
import type { DailyWarningMap, DateCell, StaffScheduleViewModel } from "./types"

import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface ScheduleGridProps {
  dates: DateCell[]
  staffMembers: StaffScheduleViewModel[]
  onCellClick: (staffId: string, dateStr: string, newType: string) => void
  dailyWarnings?: DailyWarningMap
  wantedOffStats?: Map<string, Set<string>>
  onReorderStaffMembers?: (orderedIds: string[]) => Promise<void> | void
  compactLayout?: boolean
}

type SummaryShiftKey = 'D' | 'E' | 'N' | 'M' | 'DE' | '/' | 'A'
type SummaryCountRecord = Record<SummaryShiftKey, number>

const SUMMARY_SHIFT_TYPES: Array<{ key: SummaryShiftKey; label: string; color: string }> = [
  { key: 'D', label: 'D', color: 'bg-yellow-400 text-white' },
  { key: 'E', label: 'E', color: 'bg-green-500 text-white' },
  { key: 'N', label: 'N', color: 'bg-blue-500 text-white' },
  { key: 'M', label: 'M', color: 'bg-purple-500 text-white' },
  { key: 'DE', label: 'DE', color: 'bg-indigo-500 text-white' },
  { key: '/', label: '/', color: 'bg-gray-400 text-white' },
  { key: 'A', label: 'A', color: 'bg-rose-500 text-white' },
]

const createSummaryCountRecord = (): SummaryCountRecord => ({
  D: 0,
  E: 0,
  N: 0,
  M: 0,
  DE: 0,
  '/': 0,
  A: 0,
})

export function ScheduleGrid({
  dates,
  staffMembers,
  onCellClick,
  dailyWarnings,
  wantedOffStats,
  onReorderStaffMembers,
  compactLayout = false
}: ScheduleGridProps) {
  const { toast } = useToast()
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)
  const [selectedStaffForOff, setSelectedStaffForOff] = useState<StaffScheduleViewModel | null>(null)
  const [isOffDialogOpen, setIsOffDialogOpen] = useState(false)
  const [orderedStaffMembers, setOrderedStaffMembers] = useState<StaffScheduleViewModel[]>(staffMembers)
  const [draggingStaffId, setDraggingStaffId] = useState<string | null>(null)
  const [dragOverStaffId, setDragOverStaffId] = useState<string | null>(null)
  const [dragHandleStaffId, setDragHandleStaffId] = useState<string | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const hasCenteredXScrollRef = useRef(false)
  const todayStr = format(new Date(), 'yyyy-MM-dd')

  useEffect(() => {
    setOrderedStaffMembers(staffMembers)
  }, [staffMembers])

  useLayoutEffect(() => {
    if (hasCenteredXScrollRef.current) return
    const container = scrollContainerRef.current
    if (!container) return

    let rafId1 = 0
    let rafId2 = 0

    rafId1 = window.requestAnimationFrame(() => {
      rafId2 = window.requestAnimationFrame(() => {
        const maxScrollLeft = container.scrollWidth - container.clientWidth
        if (maxScrollLeft > 0) {
          container.scrollLeft = Math.floor(maxScrollLeft / 2)
        }
        hasCenteredXScrollRef.current = true
      })
    })

    return () => {
      if (rafId1) window.cancelAnimationFrame(rafId1)
      if (rafId2) window.cancelAnimationFrame(rafId2)
    }
  }, [])

  const staffScheduleById = useMemo(() => {
    const lookup = new Map<string, Map<string, string>>()
    orderedStaffMembers.forEach((staff) => {
      if (staff.scheduleByDate instanceof Map) {
        lookup.set(staff.id, staff.scheduleByDate)
        return
      }
      lookup.set(
        staff.id,
        new Map(staff.schedule.map((entry) => [entry.date, entry.type]))
      )
    })
    return lookup
  }, [orderedStaffMembers])

  const summaryCountsByDate = useMemo(() => {
    const summary = new Map<string, SummaryCountRecord>()
    dates.forEach((dateObj) => {
      if (dateObj.isValid) {
        summary.set(dateObj.dateStr, createSummaryCountRecord())
      }
    })

    orderedStaffMembers.forEach((staff) => {
      const scheduleByDate = staffScheduleById.get(staff.id)
      if (!scheduleByDate) return

      dates.forEach((dateObj) => {
        if (!dateObj.isValid) return
        const dailySummary = summary.get(dateObj.dateStr)
        if (!dailySummary) return

        const parsed = parseShift(scheduleByDate.get(dateObj.dateStr))
        dailySummary[parsed.type] += 1
        if (parsed.type !== '/') {
          dailySummary.A += 1
        }
      })
    })

    return summary
  }, [dates, orderedStaffMembers, staffScheduleById])

  const handleStaffClick = (staff: StaffScheduleViewModel) => {
    setSelectedStaffForOff(staff)
    setIsOffDialogOpen(true)
  }

  const getReorderedStaffMembers = (sourceId: string, targetId: string) => {
    if (!sourceId || !targetId || sourceId === targetId) return

    const sourceIndex = orderedStaffMembers.findIndex((staff) => staff.id === sourceId)
    const targetIndex = orderedStaffMembers.findIndex((staff) => staff.id === targetId)
    if (sourceIndex < 0 || targetIndex < 0) return

    const next = [...orderedStaffMembers]
    const [moved] = next.splice(sourceIndex, 1)
    next.splice(targetIndex, 0, moved)
    return next
  }

  const persistReorder = async (sourceId: string, targetId: string) => {
    const next = getReorderedStaffMembers(sourceId, targetId)
    if (!next) return

    setOrderedStaffMembers(next)
    try {
      await onReorderStaffMembers?.(next.map((staff) => staff.id))
    } catch (error) {
      console.error('Failed to persist staff order:', error)
      toast({
        variant: 'destructive',
        title: '직원 순서 저장 실패',
        description: '잠시 후 다시 시도해주세요.',
        duration: 5000,
      })
      setOrderedStaffMembers(staffMembers)
    }
  }

  return (
    <div className="relative rounded-lg border bg-card text-card-foreground shadow-sm">
      <div
        ref={scrollContainerRef}
        className={cn(
          'min-h-[420px] overflow-auto overscroll-contain',
          compactLayout ? 'max-h-[calc(100vh-10.5rem)]' : 'max-h-[calc(100vh-16rem)]'
        )}
      >
      <table className="w-full caption-bottom text-[15px]">
        <TableHeader>
          
          <TableRow>
            <TableHead className="h-14 min-w-[252px] w-[252px] sticky left-0 top-0 bg-background px-3 text-sm font-semibold z-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
              이름 (직종) / 날짜
            </TableHead>
            {dates.map((dateObj, i) => {
              if (!dateObj.isValid) {
                 return <TableHead key={i} className="h-14 min-w-[52px] bg-muted sticky top-0 z-40" />
              }
              const date = dateObj.date
              const dateStr = format(date, 'd')
              const dayStr = format(date, 'E', { locale: ko })
              const isWeekend = dayStr === '일' || dayStr === '토'
              const isToday = dateObj.dateStr === todayStr
              const isOutOfMonthCol = !dateObj.isCurrentMonth
              const isMonthBoundary = i > 0 && dates[i - 1]?.isCurrentMonth !== dateObj.isCurrentMonth
              return (
                <TableHead key={dateObj.dateStr} className={cn(
                  "h-14 min-w-[52px] p-1.5 text-center text-sm font-semibold sticky top-0 z-40 bg-background",
                  isWeekend && "bg-orange-50 text-orange-700",
                  isToday && "bg-sky-100 text-sky-700 font-bold",
                  isOutOfMonthCol && "bg-slate-100 text-slate-700",
                  isMonthBoundary && "border-l-2 border-l-slate-400"
                )}>
                  <div>{dateStr}</div>
                  <div className={cn("font-normal text-[11px]", isToday && "font-bold")}>{dayStr}</div>
                </TableHead>
              )
            })}
            {/* Stats Columns */}
            <TableHead className="h-14 min-w-[60px] border-l text-center text-sm font-bold sticky top-0 z-40 bg-background">근무</TableHead>
            <TableHead className="h-14 min-w-[60px] border-l text-center text-sm font-bold sticky top-0 z-40 bg-background">휴무</TableHead>
            <TableHead className="h-14 min-w-[60px] border-l text-center text-sm font-bold sticky top-0 z-40 bg-background">OT</TableHead>
          </TableRow>
          

        </TableHeader>
        <TableBody>
          {/* Newborn Status Row */}
          {dailyWarnings && dailyWarnings.size > 0 && (
            <TableRow className="hover:bg-muted border-b-2 border-sky-200">
              <TableCell className="min-w-[252px] w-[252px] sticky left-0 top-14 bg-background z-40 font-bold text-center shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                <div className="flex items-center justify-center gap-1">
                  <span className="text-sm font-semibold">👶 신생아 현황</span>
                </div>
              </TableCell>
              {dates.map((dateObj, i) => {
                if (!dateObj.isValid) {
                  return <TableCell key={i} className="p-0 border-l bg-muted sticky top-14 z-30" />
                }

                const data = dailyWarnings.get(dateObj.dateStr)
                const isOutOfMonthCol = !dateObj.isCurrentMonth
                const isMonthBoundary = i > 0 && dates[i - 1]?.isCurrentMonth !== dateObj.isCurrentMonth
                if (!data) return <TableCell key={dateObj.dateStr} className={cn(
                  "border-l sticky top-14 z-30 bg-background",
                  isOutOfMonthCol && "bg-slate-100",
                  isMonthBoundary && "border-l-2 border-l-slate-300"
                )} />

                const amCount = data.newborns - data.checkins + data.checkouts
                const isTodayCol = dateObj.dateStr === todayStr

                return (
                  <TableCell key={dateObj.dateStr} className={cn(
                    "p-1.5 text-center border-l relative sticky top-14 z-30 bg-background",
                    isTodayCol && "bg-sky-50",
                    isOutOfMonthCol && "bg-slate-100",
                    isMonthBoundary && "border-l-2 border-l-slate-300"
                  )}>
                     {/* Today Highlight Overlay */}
                    {isTodayCol && (
                        <div className="absolute inset-0 pointer-events-none z-10 box-border border-x-2 border-sky-300" />
                    )}
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex flex-col items-center justify-center cursor-help">
                            {/* PM Count (Main) */}
                            <div className="text-base font-bold leading-tight">
                              {data.newborns}
                            </div>
                            
                            {/* Flow (In/Out) */}
                            <div className="mt-0.5 flex gap-1 text-[10px] font-medium leading-none">
                              {(data.checkins > 0 || data.checkouts > 0) ? (
                                <>
                                  <span className={cn(data.checkins > 0 ? "text-blue-600" : "text-slate-300")}>
                                    +{data.checkins}
                                  </span>
                                  <span className="text-slate-300">/</span>
                                  <span className={cn(data.checkouts > 0 ? "text-orange-600" : "text-slate-300")}>
                                    -{data.checkouts}
                                  </span>
                                </>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="text-xs p-2 space-y-1">
                          <p className="font-bold border-b pb-1 mb-1">{format(dateObj.date, 'MM월 dd일')} 신생아 흐름</p>
                          <div className="grid grid-cols-[auto_1fr] gap-x-3 text-[11px]">
                            <span className="text-muted-foreground">오전 (10시):</span>
                            <span>{amCount}명</span>
                            
                            <span className="text-orange-600">퇴실 (10시~):</span>
                            <span>-{data.checkouts}명</span>
                            
                            <span className="text-blue-600">입실 (11시~):</span>
                            <span>+{data.checkins}명</span>
                            
                            <span className="font-bold border-t pt-0.5 mt-0.5">오후 (4시~):</span>
                            <span className="font-bold border-t pt-0.5 mt-0.5">{data.newborns}명 (최대)</span>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                )
              })}
              {/* Empty stats columns */}
              <TableCell className="border-l bg-muted sticky top-14 z-30" />
              <TableCell className="border-l bg-muted sticky top-14 z-30" />
              <TableCell className="border-l bg-muted sticky top-14 z-30" />
            </TableRow>
          )}
          {orderedStaffMembers.map((staff) => (
            <TableRow 
              key={staff.id} 
              className={cn(
                "group transition-colors",
                hoveredRow === staff.id && "bg-muted",
                draggingStaffId === staff.id && "bg-muted",
                dragOverStaffId === staff.id && draggingStaffId !== staff.id && "bg-sky-100"
              )}
              draggable={dragHandleStaffId === staff.id}
              onDragStart={(e) => {
                if (dragHandleStaffId !== staff.id) {
                  e.preventDefault()
                  return
                }
                setDraggingStaffId(staff.id)
                e.dataTransfer.effectAllowed = 'move'
              }}
              onDragOver={(e) => {
                if (!draggingStaffId || draggingStaffId === staff.id) return
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                setDragOverStaffId(staff.id)
              }}
              onDrop={(e) => {
                e.preventDefault()
                if (!draggingStaffId || draggingStaffId === staff.id) return
                void persistReorder(draggingStaffId, staff.id)
                setDragOverStaffId(null)
              }}
              onDragEnd={() => {
                setDraggingStaffId(null)
                setDragOverStaffId(null)
                setDragHandleStaffId(null)
              }}
              onMouseEnter={() => setHoveredRow(staff.id)}
              onMouseLeave={() => setHoveredRow(null)}
            >
              <TableCell 
                className="min-w-[252px] w-[252px] sticky left-0 bg-background z-30 font-medium group-hover:bg-muted transition-colors shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] cursor-pointer hover:bg-muted"
                onClick={() => handleStaffClick(staff)}
              >
                  <div className="flex h-full w-full items-center gap-3 px-3 py-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
                          onMouseDown={(e) => {
                            e.stopPropagation()
                            setDragHandleStaffId(staff.id)
                          }}
                          onMouseUp={() => setDragHandleStaffId(null)}
                          onMouseLeave={() => {
                            if (draggingStaffId !== staff.id) {
                              setDragHandleStaffId(null)
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          title="드래그해서 순서 변경"
                        >
                          <GripVertical className="h-4 w-4" />
                        </Button>
                        <Avatar className="h-7 w-7 shrink-0">
                            <AvatarFallback className="bg-sky-100 text-xs text-sky-700">
                                {staff.name[0]}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
                            <span className="truncate whitespace-nowrap text-base font-medium leading-none">{staff.name}</span>
                            <span className="whitespace-nowrap text-xs text-muted-foreground">{staff.role === 'Nurse' ? '간호사' : '조무사'}</span>
                        </div>
                    </div>
              </TableCell>
              
              {dates.map((dateObj, i) => {
                if (!dateObj.isValid) {
                    return <TableCell key={i} className="p-0 border-l bg-muted" />
                }

                const shift = staffScheduleById.get(staff.id)?.get(dateObj.dateStr) || '/'
                
                const isTodayCol = dateObj.dateStr === todayStr
                const isWantedOff = wantedOffStats?.get(staff.id)?.has(dateObj.dateStr)
                const isOutOfMonthCol = !dateObj.isCurrentMonth
                const isMonthBoundary = i > 0 && dates[i - 1]?.isCurrentMonth !== dateObj.isCurrentMonth

                return (
                  <TableCell key={dateObj.dateStr} className={cn(
                    "p-0 text-center border-l relative group/cell",
                    isOutOfMonthCol && "bg-slate-100",
                    isMonthBoundary && "border-l-2 border-l-slate-300"
                  )}>
                    {/* Today Highlight Overlay */}
                    {isTodayCol && (
                        <div className="absolute inset-0 pointer-events-none z-20 border border-sky-300" />
                    )}
                    
                    {isWantedOff ? (
                        <TooltipProvider delayDuration={0}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="flex h-11 w-full items-center justify-center bg-red-100 text-sm font-medium text-red-400 cursor-not-allowed select-none">
                                        <div className="bg-red-200 rounded-full p-1">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                                        </div>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent className="bg-destructive text-destructive-foreground font-bold">
                                    <p>희망 휴무일 입니다</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    ) : (
                        <ShiftCell 
                            shift={shift} 
                            staffId={staff.id} 
                            dateStr={dateObj.dateStr} 
                            onSelect={onCellClick} 
                        />
                    )}
                  </TableCell>
                )
              })}

               {/* Stats Data */}
               <TableCell className="h-11 border-l bg-muted text-center text-sm font-semibold">
                  {staff.stats.workDays}
               </TableCell>
               <TableCell className="h-11 border-l bg-muted text-center text-sm font-semibold">
                  {staff.stats.offDays}
               </TableCell>
               <TableCell className="h-11 border-l bg-muted text-center text-sm font-semibold">
                  {staff.stats.totalOT > 0 ? staff.stats.totalOT : '-'}
               </TableCell>

            </TableRow>
          ))}

          {/* Staffing Warning Row */}
          {dailyWarnings && dailyWarnings.size > 0 && (
            <>
              <TableRow className="border-t-2 border-orange-300">
                <TableCell colSpan={dates.length + 4} className="p-0 h-3 bg-orange-50" />
              </TableRow>
              <TableRow className="hover:bg-muted">
                <TableCell className="min-w-[252px] w-[252px] sticky left-0 bg-background z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  <div className="flex items-center justify-center">
                    <span className="inline-flex h-7 items-center justify-center rounded bg-orange-500 px-2 text-xs font-bold text-white whitespace-nowrap">
                      ⚠ 인력
                    </span>
                  </div>
                </TableCell>
                {dates.map((dateObj, i) => {
                  if (!dateObj.isValid) {
                    return <TableCell key={i} className="p-0 border-l bg-muted" />
                  }

                  const warning = dailyWarnings.get(dateObj.dateStr)
                  const isOutOfMonthCol = !dateObj.isCurrentMonth
                  const isMonthBoundary = i > 0 && dates[i - 1]?.isCurrentMonth !== dateObj.isCurrentMonth
                  if (!warning || warning.newborns === 0) {
                    return (
                      <TableCell key={dateObj.dateStr} className={cn(
                        "text-center text-xs p-1 border-l text-slate-400",
                        isOutOfMonthCol && "bg-slate-100",
                        isMonthBoundary && "border-l-2 border-l-slate-300"
                      )}>
                        -
                      </TableCell>
                    )
                  }

                  // Worst deficit across D, E, N determines the color
                  const worstDiff = Math.min(warning.dDiff, warning.eDiff, warning.nDiff)
                  const isTodayCol = dateObj.dateStr === todayStr
                  let bgColor = ''
                  let textColor = ''

                  if (worstDiff < 0) {
                    bgColor = 'bg-red-100'
                    textColor = 'text-red-700'
                  } else if (worstDiff === 0) {
                    bgColor = 'bg-yellow-50'
                    textColor = 'text-yellow-700'
                  } else {
                    bgColor = 'bg-green-50'
                    textColor = 'text-green-700'
                  }

                  // Build compact display: show per-shift status
                  const shiftLabel = (diff: number) => diff < 0 ? diff.toString() : diff === 0 ? '=' : `+${diff}`

                  return (
                    <TableCell
                      key={dateObj.dateStr}
                      className={cn(
                        "border-l p-1 text-center text-xs font-bold",
                        bgColor, textColor,
                        isTodayCol && "ring-1 ring-inset ring-sky-300",
                        isMonthBoundary && "border-l-2 border-l-slate-300"
                      )}
                    >
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="cursor-help leading-tight">
                              <div className="flex justify-center gap-px text-[11px]">
                                <span className={warning.dDiff < 0 ? 'text-red-600' : warning.dDiff === 0 ? 'text-yellow-600' : 'text-green-600'}>{shiftLabel(warning.dDiff)}</span>
                                <span className="text-slate-300">/</span>
                                <span className={warning.eDiff < 0 ? 'text-red-600' : warning.eDiff === 0 ? 'text-yellow-600' : 'text-green-600'}>{shiftLabel(warning.eDiff)}</span>
                                <span className="text-slate-300">/</span>
                                <span className={warning.nDiff < 0 ? 'text-red-600' : warning.nDiff === 0 ? 'text-yellow-600' : 'text-green-600'}>{shiftLabel(warning.nDiff)}</span>
                              </div>
                              <div className="text-[10px] font-normal text-slate-500">{warning.newborns}명</div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="text-xs space-y-1.5 min-w-[160px]">
                            <p className="font-bold border-b pb-1">신생아: {warning.newborns}명 (각 {warning.requiredPerShift}명 필요)</p>
                            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
                              <span className="font-medium text-yellow-700">D:</span>
                              <span className={warning.dDiff < 0 ? 'text-red-600 font-bold' : ''}>{warning.dAssigned}/{warning.requiredPerShift}명 {warning.dDiff < 0 ? `(${warning.dDiff})` : '✓'}</span>
                              <span className="font-medium text-green-700">E:</span>
                              <span className={warning.eDiff < 0 ? 'text-red-600 font-bold' : ''}>{warning.eAssigned}/{warning.requiredPerShift}명 {warning.eDiff < 0 ? `(${warning.eDiff})` : '✓'}</span>
                              <span className="font-medium text-blue-700">N:</span>
                              <span className={warning.nDiff < 0 ? 'text-red-600 font-bold' : ''}>{warning.nAssigned}/{warning.requiredPerShift}명 {warning.nDiff < 0 ? `(${warning.nDiff})` : '✓'}</span>
                            </div>
                            {(warning.checkins > 0 || warning.checkouts > 0) && (
                              <div className="border-t pt-1 space-y-0.5">
                                {warning.checkins > 0 && <p className="text-blue-600">↗ 입실: +{warning.checkins}명</p>}
                                {warning.checkouts > 0 && <p className="text-orange-600">↘ 퇴실: -{warning.checkouts}명</p>}
                              </div>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  )
                })}
                <TableCell className="border-l" />
                <TableCell className="border-l" />
                <TableCell className="border-l" />
              </TableRow>
            </>
          )}

          {/* Summary Rows */}
          <TableRow className="border-t-2 border-sky-300">
            <TableCell colSpan={dates.length + 4} className="p-0 h-3 bg-muted" />
          </TableRow>
          {SUMMARY_SHIFT_TYPES.map(({ key, label, color }) => (
              <TableRow key={key} className="hover:bg-muted">
                <TableCell className="min-w-[252px] w-[252px] sticky left-0 bg-background z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  <div className="flex items-center justify-center">
                    <span className={cn(
                      "inline-flex h-7 w-9 items-center justify-center rounded text-sm font-bold",
                      color
                    )}>
                      {label}
                    </span>
                  </div>
                </TableCell>
                {dates.map((dateObj, i) => {
                  if (!dateObj.isValid) {
                    return <TableCell key={i} className="p-0 border-l bg-muted" />
                  }

                  const count = summaryCountsByDate.get(dateObj.dateStr)?.[key] ?? 0

                  const isTodayCol = dateObj.dateStr === todayStr
                  const isOutOfMonthCol = !dateObj.isCurrentMonth
                  const isMonthBoundary = i > 0 && dates[i - 1]?.isCurrentMonth !== dateObj.isCurrentMonth
                  return (
                    <TableCell 
                      key={dateObj.dateStr} 
                      className={cn(
                        "border-l p-1 text-center text-sm font-semibold",
                        count > 0 ? "text-foreground" : "text-slate-400",
                        isTodayCol && "bg-sky-100",
                        isOutOfMonthCol && "bg-slate-100",
                        isMonthBoundary && "border-l-2 border-l-slate-300"
                      )}
                    >
                      {count}
                    </TableCell>
                  )
                })}
                {/* Empty stats columns */}
                <TableCell className="border-l" />
                <TableCell className="border-l" />
                <TableCell className="border-l" />
              </TableRow>
            ))}
        </TableBody>
      </table>
      </div>
      
      {selectedStaffForOff && (
        <WantedOffSheet 
            open={isOffDialogOpen} 
            onOpenChange={setIsOffDialogOpen}
            staff={selectedStaffForOff}
            currentMonth={dates[0]?.date || new Date()} 
        />
      )}
    </div>
  )
}

function ShiftCell({ shift, staffId, dateStr, onSelect }: { 
    shift: string, 
    staffId: string, 
    dateStr: string, 
    onSelect: (id: string, date: string, type: string) => void 
}) {
    const [open, setOpen] = useState(false)
    const [selectedType, setSelectedType] = useState('D')
    const [preOtHours, setPreOtHours] = useState(0)
    const [postOtHours, setPostOtHours] = useState(0)

    // Parse current shift when opening
    useEffect(() => {
        if (open) {
            const parsed = parseShift(shift)
            setSelectedType(parsed.type)
            setPreOtHours(parsed.otPreHours)
            setPostOtHours(parsed.otPostHours)
        }
    }, [open, shift])

    // Parse current shift for initial state
    // Simple parse logic for now, ideally use shared util
    const getShiftColor = (s: string) => {
        if (s.includes('DE')) return 'bg-indigo-100 text-indigo-800 border-indigo-200'
        if (s.includes('D')) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
        if (s.includes('E')) return 'bg-green-100 text-green-800 border-green-200'
        if (s.includes('N')) return 'bg-blue-100 text-blue-800 border-blue-200'
        if (s.includes('M')) return 'bg-purple-100 text-purple-800 border-purple-200'
        return 'bg-gray-100 text-gray-400'
    }

    const handleApply = () => {
        let finalShift = selectedType
        if (selectedType !== '/') {
            if (preOtHours > 0 && postOtHours > 0) {
                finalShift = `${preOtHours}+${selectedType}+${postOtHours}`
            } else if (preOtHours > 0) {
                finalShift = `${preOtHours}+${selectedType}`
            } else if (postOtHours > 0) {
                finalShift = `${selectedType}+${postOtHours}`
            }
        }
        onSelect(staffId, dateStr, finalShift)
        setOpen(false)
        
        // Reset
        setPreOtHours(0)
        setPostOtHours(0)
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <div 
                    className={cn(
                    "flex h-11 w-full items-center justify-center truncate px-1 text-sm font-semibold cursor-pointer select-none transition-all hover:brightness-95",
                    getShiftColor(shift)
                    )}
                >
                    {shift}
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold">근무 형태</Label>
                        <div className="grid grid-cols-5 gap-2">
                            {['D', 'E', 'N', 'M', 'DE', '/'].map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setSelectedType(type)}
                                    className={cn(
                                        "flex items-center justify-center h-8 rounded text-xs font-bold border",
                                        selectedType === type 
                                            ? "ring-2 ring-primary border-transparent" 
                                            : "hover:bg-muted"
                                    )}
                                >
                                    {type === '/' ? 'OFF' : type}
                                </button>
                            ))}
                        </div>
                    </div>

                    {selectedType !== '/' && (
                        <div className="space-y-2">
                             <Label className="text-xs font-semibold">추가 근무 (OT)</Label>
                             <div className="grid gap-2">
                                <div className="flex items-center justify-between rounded-md border px-2 py-1">
                                    <span className="text-xs font-medium text-muted-foreground">근무 전</span>
                                    <div className="flex items-center border rounded-md">
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 rounded-none"
                                            onClick={() => setPreOtHours(Math.max(0, preOtHours - 1))}
                                        >
                                            -
                                        </Button>
                                        <div className="w-8 text-center text-sm font-bold">{preOtHours}</div>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 rounded-none"
                                            onClick={() => setPreOtHours(preOtHours + 1)}
                                        >
                                            +
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between rounded-md border px-2 py-1">
                                    <span className="text-xs font-medium text-muted-foreground">근무 후</span>
                                    <div className="flex items-center border rounded-md">
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 rounded-none"
                                            onClick={() => setPostOtHours(Math.max(0, postOtHours - 1))}
                                        >
                                            -
                                        </Button>
                                        <div className="w-8 text-center text-sm font-bold">{postOtHours}</div>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 rounded-none"
                                            onClick={() => setPostOtHours(postOtHours + 1)}
                                        >
                                            +
                                        </Button>
                                    </div>
                                </div>
                             </div>
                             <div className="text-xs text-muted-foreground text-center">
                                {preOtHours > 0 && postOtHours > 0 && `${preOtHours}+${selectedType}+${postOtHours}`}
                                {preOtHours > 0 && postOtHours === 0 && `${preOtHours}+${selectedType}`}
                                {preOtHours === 0 && postOtHours > 0 && `${selectedType}+${postOtHours}`}
                                {preOtHours === 0 && postOtHours === 0 && '추가 근무 없음'}
                             </div>
                        </div>
                    )}
                    
                    <Button onClick={handleApply} className="w-full h-8 text-xs">
                        적용
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    )
}
