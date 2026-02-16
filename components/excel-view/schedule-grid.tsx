'use client'

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { parseShift } from "@/lib/shift-utils"
import { cn } from "@/lib/utils"
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { GripVertical } from "lucide-react"
import { useEffect, useState } from 'react'
import { WantedOffSheet } from "./wanted-off-dialog"

import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface DateObj {
    date: Date
    isValid: boolean
    dateStr: string
}

interface DailyWarning {
  newborns: number
  requiredPerShift: number
  dAssigned: number
  eAssigned: number
  nAssigned: number
  dDiff: number
  eDiff: number
  nDiff: number
  checkins: number
  checkouts: number
}


interface ScheduleGridProps {
  dates: DateObj[]
  staffMembers: any[]
  onCellClick: (staffId: string, dateStr: string, newType: string) => void
  dailyWarnings?: Map<string, DailyWarning>
  wantedOffStats?: Map<string, Set<string>>
  onReorderStaffMembers?: (orderedIds: string[]) => Promise<void> | void
}

export function ScheduleGrid({
  dates,
  staffMembers,
  onCellClick,
  dailyWarnings,
  wantedOffStats,
  onReorderStaffMembers
}: ScheduleGridProps) {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)
  const [selectedStaffForOff, setSelectedStaffForOff] = useState<any>(null)
  const [isOffDialogOpen, setIsOffDialogOpen] = useState(false)
  const [orderedStaffMembers, setOrderedStaffMembers] = useState<any[]>(staffMembers)
  const [draggingStaffId, setDraggingStaffId] = useState<string | null>(null)
  const [dragOverStaffId, setDragOverStaffId] = useState<string | null>(null)
  const [dragHandleStaffId, setDragHandleStaffId] = useState<string | null>(null)
  const todayStr = format(new Date(), 'yyyy-MM-dd')

  useEffect(() => {
    setOrderedStaffMembers(staffMembers)
  }, [staffMembers])

  const handleStaffClick = (staff: any) => {
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
      alert('직원 순서 저장에 실패했습니다. 다시 시도해주세요.')
      setOrderedStaffMembers(staffMembers)
    }
  }

  return (
    <div className="border rounded-md bg-card text-card-foreground shadow-sm overflow-x-auto relative">
      <Table>
        <TableHeader>
          
          <TableRow>
            <TableHead className="min-w-[220px] w-[220px] sticky left-0 bg-background z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
              이름 (직종) / 날짜
            </TableHead>
            {dates.map((dateObj, i) => {
              if (!dateObj.isValid) {
                 return <TableHead key={i} className="min-w-[40px] p-1 bg-muted/20" />
              }
              const date = dateObj.date
              const dateStr = format(date, 'd')
              const dayStr = format(date, 'E', { locale: ko })
              const isWeekend = dayStr === '일' || dayStr === '토'
              const isToday = dateObj.dateStr === todayStr
              return (
                <TableHead key={dateObj.dateStr} className={cn(
                  "text-center min-w-[40px] p-1 text-xs",
                  isWeekend && "bg-orange-50/50 text-orange-700",
                  isToday && "bg-primary/15 text-primary font-bold"
                )}>
                  <div>{dateStr}</div>
                  <div className={cn("font-normal text-[10px]", isToday && "font-bold")}>{dayStr}</div>
                </TableHead>
              )
            })}
            {/* Stats Columns */}
            <TableHead className="text-center min-w-[50px] text-xs font-bold border-l">근무</TableHead>
            <TableHead className="text-center min-w-[50px] text-xs font-bold border-l">휴무</TableHead>
            <TableHead className="text-center min-w-[50px] text-xs font-bold border-l">OT</TableHead>
          </TableRow>
          

        </TableHeader>
        <TableBody>
          {/* Newborn Status Row */}
          {dailyWarnings && dailyWarnings.size > 0 && (
            <TableRow className="hover:bg-muted/30 border-b-2 border-primary/20">
              <TableCell className="min-w-[220px] w-[220px] sticky left-0 bg-background z-20 font-bold text-center shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                <div className="flex items-center justify-center gap-1">
                  <span className="text-xs">👶 신생아 현황</span>
                </div>
              </TableCell>
              {dates.map((dateObj, i) => {
                if (!dateObj.isValid) {
                  return <TableCell key={i} className="p-0 border-l bg-muted/20" />
                }

                const data = dailyWarnings.get(dateObj.dateStr)
                if (!data) return <TableCell key={dateObj.dateStr} className="border-l" />

                const amCount = data.newborns - data.checkins + data.checkouts
                const isTodayCol = dateObj.dateStr === todayStr

                return (
                  <TableCell key={dateObj.dateStr} className={cn(
                    "p-1 text-center border-l relative",
                    isTodayCol && "bg-primary/5"
                  )}>
                     {/* Today Highlight Overlay */}
                    {isTodayCol && (
                        <div className="absolute inset-0 bg-primary/10 pointer-events-none z-10 box-border border-x-2 border-primary/20" />
                    )}
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex flex-col items-center justify-center cursor-help">
                            {/* PM Count (Main) */}
                            <div className="text-sm font-bold leading-tight">
                              {data.newborns}
                            </div>
                            
                            {/* Flow (In/Out) */}
                            <div className="flex gap-1 text-[9px] font-medium leading-none mt-0.5">
                              {(data.checkins > 0 || data.checkouts > 0) ? (
                                <>
                                  <span className={cn(data.checkins > 0 ? "text-blue-600" : "text-muted-foreground/20")}>
                                    +{data.checkins}
                                  </span>
                                  <span className="text-muted-foreground/30">/</span>
                                  <span className={cn(data.checkouts > 0 ? "text-orange-600" : "text-muted-foreground/20")}>
                                    -{data.checkouts}
                                  </span>
                                </>
                              ) : (
                                <span className="text-muted-foreground/20">-</span>
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
              <TableCell className="border-l bg-muted/5" />
              <TableCell className="border-l bg-muted/5" />
              <TableCell className="border-l bg-muted/5" />
            </TableRow>
          )}
          {orderedStaffMembers.map((staff) => (
            <TableRow 
              key={staff.id} 
              className={cn(
                "group transition-colors",
                hoveredRow === staff.id && "bg-muted/50",
                draggingStaffId === staff.id && "opacity-50",
                dragOverStaffId === staff.id && draggingStaffId !== staff.id && "bg-primary/10"
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
                className="font-medium min-w-[220px] w-[220px] sticky left-0 bg-background z-30 group-hover:bg-muted/50 transition-colors shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] cursor-pointer hover:bg-muted"
                onClick={() => handleStaffClick(staff)}
              >
                  <div className="flex items-center gap-2 w-full px-2 h-full">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
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
                        <Avatar className="h-6 w-6 shrink-0">
                            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                {staff.name[0]}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
                            <span className="text-sm leading-none whitespace-nowrap overflow-hidden text-ellipsis">{staff.name}</span>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">{staff.role === 'Nurse' ? '간호사' : '조무사'}</span>
                        </div>
                    </div>
              </TableCell>
              
              {dates.map((dateObj, i) => {
                if (!dateObj.isValid) {
                    return <TableCell key={i} className="p-0 border-l bg-muted/20" />
                }

                const shiftEntry = staff.schedule.find((s: any) => s.date === dateObj.dateStr)
                const shift = shiftEntry?.type || '/' 
                
                const isTodayCol = dateObj.dateStr === todayStr
                const isWantedOff = wantedOffStats?.get(staff.id)?.has(dateObj.dateStr)

                return (
                  <TableCell key={dateObj.dateStr} className="p-0 text-center border-l relative group/cell">
                    {/* Today Highlight Overlay */}
                    {isTodayCol && (
                        <div className="absolute inset-0 bg-primary/10 pointer-events-none z-10" />
                    )}
                    
                    {isWantedOff ? (
                        <TooltipProvider delayDuration={0}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="h-10 w-full flex items-center justify-center bg-red-100/50 text-red-400 font-medium text-xs cursor-not-allowed select-none">
                                        <div className="bg-red-200 rounded-full p-1 opacity-70">
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
               <TableCell className="text-center text-xs border-l bg-muted/10 font-medium">
                  {staff.stats.workDays}
               </TableCell>
               <TableCell className="text-center text-xs border-l bg-muted/10 font-medium">
                  {staff.stats.offDays}
               </TableCell>
               <TableCell className="text-center text-xs border-l bg-muted/10 font-medium">
                  {staff.stats.totalOT > 0 ? staff.stats.totalOT : '-'}
               </TableCell>

            </TableRow>
          ))}

          {/* Staffing Warning Row */}
          {dailyWarnings && dailyWarnings.size > 0 && (
            <>
              <TableRow className="border-t-2 border-orange-300/50">
                <TableCell colSpan={dates.length + 4} className="p-0 h-3 bg-orange-50/20" />
              </TableRow>
              <TableRow className="hover:bg-muted/30">
                <TableCell className="min-w-[220px] w-[220px] sticky left-0 bg-background z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  <div className="flex items-center justify-center">
                    <span className="inline-flex items-center justify-center h-6 px-1.5 rounded text-[10px] font-bold bg-orange-500 text-white whitespace-nowrap">
                      ⚠ 인력
                    </span>
                  </div>
                </TableCell>
                {dates.map((dateObj, i) => {
                  if (!dateObj.isValid) {
                    return <TableCell key={i} className="p-0 border-l bg-muted/20" />
                  }

                  const warning = dailyWarnings.get(dateObj.dateStr)
                  if (!warning || warning.newborns === 0) {
                    return (
                      <TableCell key={dateObj.dateStr} className="text-center text-xs p-1 border-l text-muted-foreground/30">
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
                        "text-center text-[10px] p-0.5 border-l font-bold",
                        bgColor, textColor,
                        isTodayCol && "ring-1 ring-inset ring-primary/30"
                      )}
                    >
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="cursor-help leading-tight">
                              <div className="flex justify-center gap-px text-[9px]">
                                <span className={warning.dDiff < 0 ? 'text-red-600' : warning.dDiff === 0 ? 'text-yellow-600' : 'text-green-600'}>{shiftLabel(warning.dDiff)}</span>
                                <span className="text-muted-foreground/40">/</span>
                                <span className={warning.eDiff < 0 ? 'text-red-600' : warning.eDiff === 0 ? 'text-yellow-600' : 'text-green-600'}>{shiftLabel(warning.eDiff)}</span>
                                <span className="text-muted-foreground/40">/</span>
                                <span className={warning.nDiff < 0 ? 'text-red-600' : warning.nDiff === 0 ? 'text-yellow-600' : 'text-green-600'}>{shiftLabel(warning.nDiff)}</span>
                              </div>
                              <div className="text-[8px] font-normal opacity-60">{warning.newborns}명</div>
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
          <TableRow className="border-t-2 border-primary/30">
            <TableCell colSpan={dates.length + 4} className="p-0 h-3 bg-muted/20" />
          </TableRow>
          {(() => {
            const shiftTypes = [
              { key: 'D', label: 'D', color: 'bg-yellow-400 text-white' },
              { key: 'E', label: 'E', color: 'bg-green-500 text-white' },
              { key: 'N', label: 'N', color: 'bg-blue-500 text-white' },
              { key: 'M', label: 'M', color: 'bg-purple-500 text-white' },
              { key: 'DE', label: 'DE', color: 'bg-indigo-500 text-white' },
              { key: '/', label: '/', color: 'bg-gray-400 text-white' },
              { key: 'A', label: 'A', color: 'bg-rose-500 text-white' },
            ]

            return shiftTypes.map(({ key, label, color }) => (
              <TableRow key={key} className="hover:bg-muted/30">
                <TableCell className="min-w-[220px] w-[220px] sticky left-0 bg-background z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  <div className="flex items-center justify-center">
                    <span className={cn(
                      "inline-flex items-center justify-center h-6 w-8 rounded text-xs font-bold",
                      color
                    )}>
                      {label}
                    </span>
                  </div>
                </TableCell>
                {dates.map((dateObj, i) => {
                  if (!dateObj.isValid) {
                    return <TableCell key={i} className="p-0 border-l bg-muted/20" />
                  }

                  let count = 0
                  if (key === 'A') {
                    // Total: count all non-off shifts
                    count = orderedStaffMembers.reduce((acc, staff) => {
                      const entry = staff.schedule.find((s: any) => s.date === dateObj.dateStr)
                      const parsed = parseShift(entry?.type)
                      return acc + (parsed.type !== '/' ? 1 : 0)
                    }, 0)
                  } else {
                    // Count specific shift type
                    count = orderedStaffMembers.reduce((acc, staff) => {
                      const entry = staff.schedule.find((s: any) => s.date === dateObj.dateStr)
                      const parsed = parseShift(entry?.type)
                      return acc + (parsed.type === key ? 1 : 0)
                    }, 0)
                  }

                  const isTodayCol = dateObj.dateStr === todayStr
                  return (
                    <TableCell 
                      key={dateObj.dateStr} 
                      className={cn(
                        "text-center text-xs p-1 border-l font-medium",
                        count > 0 ? "text-foreground" : "text-muted-foreground/40",
                        isTodayCol && "bg-primary/10"
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
            ))
          })()}
        </TableBody>
      </Table>
      
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
    const [otHours, setOtHours] = useState(0)
    const [otPos, setOtPos] = useState<'pre' | 'post'>('pre')

    // Parse current shift when opening
    useEffect(() => {
        if (open) {
            const parsed = parseShift(shift)
            setSelectedType(parsed.type)
            setOtHours(parsed.otHours)
            setOtPos(parsed.otPosition === 'none' ? 'pre' : parsed.otPosition)
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
        if (selectedType !== '/' && otHours > 0) {
            if (otPos === 'pre') finalShift = `${otHours}+${selectedType}`
            else finalShift = `${selectedType}+${otHours}`
        }
        onSelect(staffId, dateStr, finalShift)
        setOpen(false)
        
        // Reset
        setOtHours(0)
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <div 
                    className={cn(
                    "h-10 w-full flex items-center justify-center cursor-pointer hover:brightness-95 transition-all text-xs font-bold select-none truncate px-1",
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
                             <div className="flex items-center gap-2">
                                <Button 
                                    variant={otPos === 'pre' ? 'default' : 'outline'} 
                                    size="sm" 
                                    className="h-8 text-xs"
                                    onClick={() => setOtPos('pre')}
                                >
                                    전
                                </Button>
                                <div className="flex items-center border rounded-md">
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 rounded-none"
                                        onClick={() => setOtHours(Math.max(0, otHours - 1))}
                                    >
                                        -
                                    </Button>
                                    <div className="w-8 text-center text-sm font-bold">{otHours}</div>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 rounded-none"
                                        onClick={() => setOtHours(otHours + 1)}
                                    >
                                        +
                                    </Button>
                                </div>
                                <Button 
                                    variant={otPos === 'post' ? 'default' : 'outline'} 
                                    size="sm" 
                                    className="h-8 text-xs"
                                    onClick={() => setOtPos('post')}
                                >
                                    후
                                </Button>
                             </div>
                             <div className="text-xs text-muted-foreground text-center">
                                {otHours > 0 
                                    ? otPos === 'pre' 
                                        ? `${otHours}시간 + ${selectedType}` 
                                        : `${selectedType} + ${otHours}시간`
                                    : '추가 근무 없음'
                                }
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
