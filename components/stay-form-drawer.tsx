'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription, SheetHeader,
  SheetTitle
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { authFetch } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Baby, CalendarDays, Edit2, Plus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

interface Stay {
  id: string
  room_number: string
  mother_name: string
  baby_count: number
  // Array of names to support multiple babies (optional)
  baby_names?: string[]
  check_in_date: string
  check_out_date: string
  edu_date?: string
  notes?: string
  status: 'upcoming' | 'active' | 'completed'
}

interface StayFormDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  roomNumber: string
  activeStay?: Stay | null
  upcomingStays?: Stay[]
}

type FormData = {
  mother_name: string
  baby_count: number
  baby_names: string[]
  check_in_date: string
  check_out_date: string
  edu_date: string
  notes: string
  status: 'upcoming' | 'active' | 'completed'
}

export function StayFormDrawer({ 
  open, 
  onOpenChange, 
  roomNumber, 
  activeStay,
  upcomingStays = []
}: StayFormDrawerProps) {
  const queryClient = useQueryClient()
  
  const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), [])
  const defaultCheckOut = useMemo(() => format(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'), [])

  const [mode, setMode] = useState<'view' | 'edit' | 'create' | 'add-upcoming'>('view')
  const [editingStayId, setEditingStayId] = useState<string | null>(null)

  const getEmptyFormData = useCallback((status: 'active' | 'upcoming' = 'active'): FormData => ({
    mother_name: '',
    baby_count: 1,
    baby_names: [''], // Default 1 empty name
    check_in_date: today,
    check_out_date: defaultCheckOut,
    edu_date: '',
    notes: '',
    status
  }), [today, defaultCheckOut])

  const [formData, setFormData] = useState<FormData>(getEmptyFormData())

  // Reset mode only when drawer opens (not on activeStay changes to avoid focus loss)
  useEffect(() => {
    if (open) {
      if (activeStay) {
        setMode('view')
      } else {
        setMode('create')
        setFormData(getEmptyFormData('active'))
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: FormData & { room_number: string }) => {
      const res = await authFetch('/api/stays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!res.ok) throw new Error('Failed to create stay')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stays'] })
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      setMode('view')
      setFormData(getEmptyFormData())
    }
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: FormData & { id: string }) => {
      const res = await authFetch('/api/stays', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!res.ok) throw new Error('Failed to update stay')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stays'] })
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      setMode('view')
      setEditingStayId(null)
    }
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await authFetch(`/api/stays?id=${id}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error('Failed to delete stay')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stays'] })
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      // If the deleted stay was the active one being viewed/edited, close or reset
      if (activeStay && editingStayId === activeStay.id) {
          onOpenChange(false)
      }
      setMode('view')
      setEditingStayId(null)
    },
    onError: (error) => {
      console.error("Delete failed:", error)
      alert("삭제에 실패했습니다. 다시 시도해주세요.")
    }
  })

  const handleDelete = (stay: Stay) => {
    if (confirm('정말로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      deleteMutation.mutate(stay.id)
    }
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    // Filter out empty names if any? Or keep empty strings?
    // Let's keep existing logic to pass data as is.
    if (mode === 'edit' && editingStayId) {
      updateMutation.mutate({ ...formData, id: editingStayId })
    } else {
      createMutation.mutate({ ...formData, room_number: roomNumber })
    }
  }

  const handleEdit = (stay: Stay) => {
    setEditingStayId(stay.id)
    setFormData({
      mother_name: stay.mother_name,
      baby_count: stay.baby_count,
      baby_names: stay.baby_names && stay.baby_names.length > 0 
        ? stay.baby_names 
        : Array(stay.baby_count).fill(''),
      check_in_date: stay.check_in_date,
      check_out_date: stay.check_out_date,
      edu_date: stay.edu_date || '',
      notes: stay.notes || '',
      status: stay.status
    })
    setMode('edit')
  }

  const handleAddUpcoming = () => {
    setFormData(getEmptyFormData('upcoming'))
    setMode('add-upcoming')
  }

  const handleCancelEdit = () => {
    if (activeStay) {
      setMode('view')
    } else {
      setMode('create')
    }
    setEditingStayId(null)
    setFormData(getEmptyFormData())
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  // View mode - show stay info
  const StayInfoCard = ({ stay, isActive }: { stay: Stay, isActive?: boolean }) => {
    const isUpcoming = stay.status === 'upcoming'
    
    // Check if checkout is approaching (within 2 days)
    const today = new Date()
    const checkoutDate = new Date(stay.check_out_date)
    const daysUntilCheckout = Math.ceil((checkoutDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    const isCheckoutSoon = isActive && daysUntilCheckout >= 0 && daysUntilCheckout <= 2
    
    // Badge text and style
    const getBadgeInfo = () => {
      if (isCheckoutSoon) return { text: '퇴실예정', variant: 'destructive' as const }
      if (isActive) return { text: '입실 중', variant: 'default' as const }
      return { text: '입실 예정', variant: 'secondary' as const }
    }
    const badgeInfo = getBadgeInfo()
    
    return (
      <Card className={cn(
        isActive ? "border-primary border-2" : "border-dashed",
        isUpcoming && "animate-pulse border-blue-400 border-2",
        isCheckoutSoon && "border-red-300 border-2"
      )}>
        <CardContent className="p-4 space-y-3">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <Badge variant={badgeInfo.variant}>
                {badgeInfo.text}
              </Badge>
              <div className="flex flex-col">
                <span className="font-bold text-lg">{stay.mother_name}</span>
                {/* Show Baby Names if available */}
                {stay.baby_names && stay.baby_names.some(n => n.trim() !== '') && (
                   <span className="text-xs text-muted-foreground">
                     (태명: {stay.baby_names.filter(n => n).join(', ')})
                   </span>
                )}
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => handleEdit(stay)}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button 
              type="button"
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-muted-foreground hover:text-red-600"
              onClick={() => handleDelete(stay)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Baby className="h-4 w-4" />
              <span>신생아 {stay.baby_count}명</span>
            </div>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-xs font-medium">
                {stay.check_in_date}
              </span>
              <span className="text-muted-foreground">~</span>
              <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-xs font-medium">
                {stay.check_out_date}
              </span>
            </div>
          </div>

          {stay.edu_date && (
            <div className="text-sm text-muted-foreground">
              교육일: {stay.edu_date}
            </div>
          )}

          {stay.notes && (
            <div className="text-sm bg-muted/50 p-2 rounded">
              {stay.notes}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }


  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-xl flex items-center gap-2">
            <span className="bg-primary text-primary-foreground px-2 py-1 rounded text-base">
              {roomNumber}호
            </span>
            {mode === 'view' && activeStay && '객실 정보'}
            {mode === 'create' && '입실 등록'}
            {mode === 'edit' && '정보 수정'}
            {mode === 'add-upcoming' && '입실 예정 추가'}
          </SheetTitle>
          <SheetDescription>
            {mode === 'view' && '현재 입실 정보 및 예정된 입실 내역입니다.'}
            {mode === 'create' && '새로운 산모/신생아 정보를 입력하세요.'}
            {mode === 'edit' && '산모/신생아 정보를 수정하세요.'}
            {mode === 'add-upcoming' && '다음 입실 예정 정보를 입력하세요.'}
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* View Mode */}
          {mode === 'view' && activeStay && (
            <>
              <StayInfoCard stay={activeStay} isActive />
              
              {/* Upcoming Stays */}
              {upcomingStays.length > 0 && (
                <div className="space-y-3">
                  <div className="text-sm font-medium text-muted-foreground">입실 예정</div>
                  {upcomingStays.map(stay => (
                    <StayInfoCard key={stay.id} stay={stay} />
                  ))}
                </div>
              )}

              {/* Add Upcoming Button */}
              <Card 
                className="border-dashed border-2 cursor-pointer hover:border-primary/50 transition-colors"
                onClick={handleAddUpcoming}
              >
                <CardContent className="p-4 flex items-center justify-center gap-2 text-muted-foreground">
                  <Plus className="h-5 w-5" />
                  <span>입실 예정 추가</span>
                </CardContent>
              </Card>
            </>
          )}

          {/* Create/Edit/Add-upcoming Mode */}
          {(mode === 'create' || mode === 'edit' || mode === 'add-upcoming') && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mother_name">산모 이름 *</Label>
                <Input
                  id="mother_name"
                  value={formData.mother_name}
                  onChange={(e) => setFormData({ ...formData, mother_name: e.target.value })}
                  placeholder="김산모"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="baby_count">신생아 수</Label>
                  <Input
                    id="baby_count"
                    type="number"
                    min={1}
                    max={4}
                    value={formData.baby_count}
                    onChange={(e) => {
                      const count = parseInt(e.target.value) || 1
                      // Resize baby_names array
                      const currentNames = formData.baby_names
                      const newNames = Array(count).fill('').map((_, i) => currentNames[i] || '')
                      
                      setFormData({ 
                        ...formData, 
                        baby_count: count,
                        baby_names: newNames
                      })
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">상태</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upcoming">입실 예정</SelectItem>
                      <SelectItem value="active">입실 중</SelectItem>
                      <SelectItem value="completed">퇴실 완료</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Dynamic Baby Names Inputs */}
              <div className="space-y-2">
                 <Label>태명 (선택)</Label>
                 <div className="grid grid-cols-2 gap-2">
                   {Array.from({ length: formData.baby_count }).map((_, index) => (
                     <Input
                       key={index}
                       placeholder={`태명 ${index + 1}`}
                       value={formData.baby_names[index] || ''}
                       onChange={(e) => {
                         const newNames = [...formData.baby_names]
                         newNames[index] = e.target.value
                         setFormData({ ...formData, baby_names: newNames })
                       }}
                     />
                   ))}
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="check_in_date">입실일 *</Label>
                  <Input
                    id="check_in_date"
                    type="date"
                    value={formData.check_in_date}
                    onChange={(e) => {
                      const newCheckIn = e.target.value
                      if (!newCheckIn) {
                        setFormData({ ...formData, check_in_date: newCheckIn })
                        return;
                      }

                      // Auto-calculate check-out (13 nights = +13 days)
                      const checkInDate = new Date(newCheckIn)
                      const checkOutDate = new Date(checkInDate)
                      checkOutDate.setDate(checkOutDate.getDate() + 13) // 13 nights
                      const checkOutStr = format(checkOutDate, 'yyyy-MM-dd')

                      // Auto-calculate edu-date (Sunday of checkout week)
                      const eduDate = new Date(checkOutDate)
                      const dayOfWeek = eduDate.getDay() // 0 = Sunday
                      eduDate.setDate(eduDate.getDate() - dayOfWeek) // Previous Sunday (or same day if Sunday)
                      const eduStr = format(eduDate, 'yyyy-MM-dd')

                      setFormData({ 
                        ...formData, 
                        check_in_date: newCheckIn,
                        check_out_date: checkOutStr,
                        edu_date: eduStr
                      })
                    }}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="check_out_date">퇴실일 *</Label>
                  <Input
                    id="check_out_date"
                    type="date"
                    value={formData.check_out_date}
                    onChange={(e) => {
                        const newCheckOut = e.target.value
                        if (!newCheckOut) {
                            setFormData({ ...formData, check_out_date: newCheckOut })
                            return;
                        }

                        // Auto-calculate edu-date (Sunday of checkout week) when checkout changes
                        const checkOutDate = new Date(newCheckOut)
                        const dayOfWeek = checkOutDate.getDay()
                        const eduDate = new Date(checkOutDate)
                        eduDate.setDate(eduDate.getDate() - dayOfWeek)
                        const eduStr = format(eduDate, 'yyyy-MM-dd')

                        setFormData({ 
                            ...formData, 
                            check_out_date: newCheckOut, 
                            edu_date: eduStr
                        })
                    }}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edu_date">교육일</Label>
                <Input
                  id="edu_date"
                  type="date"
                  value={formData.edu_date}
                  onChange={(e) => setFormData({ ...formData, edu_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">메모</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="특이사항, 알러지, 요청사항 등"
                  rows={2}
                />
              </div>

              <div className="flex gap-2 pt-2">
                {(mode === 'edit' || mode === 'add-upcoming') && (
                  <Button type="button" variant="outline" className="flex-1" onClick={handleCancelEdit}>
                    취소
                  </Button>
                )}
                <Button type="submit" className="flex-1" disabled={isPending}>
                  {isPending ? '저장 중...' : (mode === 'edit' ? '수정 완료' : '등록')}
                </Button>
              </div>
            </form>
          )}

          {/* Show upcoming stays below form when editing active stay */}
          {mode === 'edit' && editingStayId === activeStay?.id && upcomingStays.length > 0 && (
            <div className="space-y-3 pt-4 border-t">
              <div className="text-sm font-medium text-muted-foreground">입실 예정</div>
              {upcomingStays.map(stay => (
                <StayInfoCard key={stay.id} stay={stay} />
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
