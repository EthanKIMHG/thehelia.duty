'use client'

import { format } from 'date-fns'
import { CalendarIcon, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { authFetch } from '@/lib/api'
import { useQuery, useQueryClient } from '@tanstack/react-query'

interface WantedOffDialogProps {
  staff: any
  open: boolean
  onOpenChange: (open: boolean) => void
  currentMonth: Date
}

export function WantedOffDialog({ staff, open, onOpenChange, currentMonth }: WantedOffDialogProps) {
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

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return
    
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            희망 휴무 신청
          </DialogTitle>
          <DialogDescription className="space-y-3 pt-2">
             <div className="flex items-center justify-between bg-muted/30 p-2 rounded-lg border">
                <span className="font-bold text-foreground text-sm">{staff.name}</span>
                <div className="flex gap-2 text-xs">
                    <div className="flex flex-col items-center px-2 py-1 bg-blue-50 text-blue-700 rounded border border-blue-100">
                        <span className="text-[10px] text-blue-600/70">근무</span>
                        <span className="font-bold">{staff.stats.workDays}</span>
                    </div>
                    <div className="flex flex-col items-center px-2 py-1 bg-red-50 text-red-700 rounded border border-red-100">
                        <span className="text-[10px] text-red-600/70">휴무</span>
                        <span className="font-bold">{staff.stats.offDays}</span>
                    </div>
                    <div className="flex flex-col items-center px-2 py-1 bg-orange-50 text-orange-700 rounded border border-orange-100">
                        <span className="text-[10px] text-orange-600/70">OT</span>
                        <span className="font-bold">{staff.stats.totalOT}시간</span>
                    </div>
                </div>
             </div>
             <div className="text-[11px] text-muted-foreground text-center">
                {staff.employment_type === 'full-time' 
                    ? "날짜를 클릭하여 선택/해제 (월 최대 2일)" 
                    : "⚠️ 정규직 외 직원도 선택 가능하도록 변경되었습니다."}
             </div>
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center p-2 relative min-h-[300px]">
            {isLoading && !wantedOffs ? (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : null}
            
            <Calendar
                defaultMonth={currentMonth}
                onDayClick={handleDateSelect}
                className="rounded-md border shadow w-full flex justify-center"
                modifiers={{
                    wanted: selectedDates
                }}
                modifiersClassNames={{
                    wanted: "bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-full"
                }}
                disabled={isSubmitting}
            />
        </div>
        <div className="flex justify-end gap-2 p-2 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="h-8 text-xs" disabled={isSubmitting}>
                취소
            </Button>
            <Button onClick={handleApply} className="h-8 text-xs" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                적용
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
