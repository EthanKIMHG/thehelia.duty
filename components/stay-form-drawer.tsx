'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { authFetch } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'
import { Baby, CalendarDays, Edit2, Plus, Trash2, UserRound } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

type StayStatus = 'upcoming' | 'active' | 'completed'
type StayPeriod = '3weeks' | '2weeks' | '9n10d' | '6n7d' | 'custom'

interface BabyProfileStored {
  name?: string | null
  gender?: string | null
  weight?: number | null
}

interface Stay {
  id: string
  room_number: string
  mother_name: string
  baby_count: number
  baby_names?: string[]
  baby_profiles?: BabyProfileStored[] | null
  gender?: string | null
  baby_weight?: number | null
  birth_hospital?: string | null
  check_in_date: string
  check_out_date: string
  edu_date?: string
  notes?: string
  status: StayStatus
}

interface StayFormDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  roomNumber: string
  activeStay?: Stay | null
  upcomingStays?: Stay[]
}

type BabyProfileForm = {
  name: string
  gender: string
  weight: string
}

type FormData = {
  mother_name: string
  baby_count: number
  birth_hospital: string
  check_in_date: string
  stay_period: StayPeriod
  check_out_date: string
  edu_date: string
  notes: string
  status: StayStatus
  baby_profiles: BabyProfileForm[]
}

type StayPayload = {
  mother_name: string
  baby_count: number
  baby_names: string[]
  baby_profiles: Array<{ name: string | null; gender: string | null; weight: number | null }>
  gender: string | null
  baby_weight: number | null
  birth_hospital: string | null
  check_in_date: string
  check_out_date: string
  edu_date: string | null
  notes: string | null
  status: StayStatus
}

const createEmptyBabyProfile = (): BabyProfileForm => ({
  name: '',
  gender: '',
  weight: ''
})

const STAY_PERIOD_CONFIG: Record<Exclude<StayPeriod, 'custom'>, { label: string; checkoutOffsetDays: number }> = {
  '3weeks': { label: '3주', checkoutOffsetDays: 20 },   // 20박 21일
  '2weeks': { label: '2주', checkoutOffsetDays: 13 },   // 13박 14일
  '9n10d': { label: '9박10일', checkoutOffsetDays: 9 },
  '6n7d': { label: '6박7일', checkoutOffsetDays: 6 }
}

const toValidDate = (value?: string) => {
  if (!value) return null
  const parsed = parseISO(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const getNearestSunday = (date: Date) => {
  const day = date.getDay()

  const previousSunday = new Date(date)
  previousSunday.setDate(date.getDate() - day)

  const nextSunday = new Date(date)
  nextSunday.setDate(date.getDate() + (day === 0 ? 0 : 7 - day))

  const prevDiff = Math.abs(differenceInCalendarDays(date, previousSunday))
  const nextDiff = Math.abs(differenceInCalendarDays(nextSunday, date))

  return nextDiff < prevDiff ? nextSunday : previousSunday
}

const getEducationDateFromCheckOut = (checkOutDate: string) => {
  const parsed = toValidDate(checkOutDate)
  if (!parsed) return ''
  return format(getNearestSunday(parsed), 'yyyy-MM-dd')
}

const getScheduleByPeriod = (checkInDate: string, period: StayPeriod) => {
  if (period === 'custom') return null
  const parsed = toValidDate(checkInDate)
  if (!parsed) return null

  const checkOut = addDays(parsed, STAY_PERIOD_CONFIG[period].checkoutOffsetDays)
  const checkOutStr = format(checkOut, 'yyyy-MM-dd')
  return {
    check_out_date: checkOutStr,
    edu_date: getEducationDateFromCheckOut(checkOutStr)
  }
}

const inferStayPeriod = (checkInDate: string, checkOutDate: string): StayPeriod => {
  const checkIn = toValidDate(checkInDate)
  const checkOut = toValidDate(checkOutDate)
  if (!checkIn || !checkOut) return 'custom'

  const offset = differenceInCalendarDays(checkOut, checkIn)
  const matched = (Object.entries(STAY_PERIOD_CONFIG) as Array<[Exclude<StayPeriod, 'custom'>, { label: string; checkoutOffsetDays: number }]>)
    .find(([, value]) => value.checkoutOffsetDays === offset)

  return matched ? matched[0] : 'custom'
}

const parseWeight = (value?: number | string | null) => {
  if (value === undefined || value === null || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const formatWeight = (value?: number | string | null) => {
  const parsed = parseWeight(value)
  if (parsed === null) return '-'
  return `${parsed}kg`
}

const ensureProfileCount = (profiles: BabyProfileForm[], count: number): BabyProfileForm[] =>
  Array.from({ length: count }, (_, idx) => profiles[idx] ?? createEmptyBabyProfile())

const buildStayPayload = (formData: FormData): StayPayload => {
  const normalizedProfiles = ensureProfileCount(formData.baby_profiles, formData.baby_count)
    .map((profile) => ({
      name: profile.name.trim() || null,
      gender: profile.gender.trim() || null,
      weight: parseWeight(profile.weight),
    }))

  const babyNames = normalizedProfiles
    .map((profile) => profile.name)
    .filter((name): name is string => Boolean(name))

  const genderValues = Array.from(
    new Set(
      normalizedProfiles
        .map((profile) => profile.gender)
        .filter((gender): gender is string => Boolean(gender))
    )
  )

  const mergedGender = genderValues.length > 0 ? genderValues.join('/') : null
  const singleWeight = formData.baby_count === 1 ? normalizedProfiles[0]?.weight ?? null : null

  return {
    mother_name: formData.mother_name.trim(),
    baby_count: formData.baby_count,
    baby_names: babyNames,
    baby_profiles: normalizedProfiles,
    gender: mergedGender,
    baby_weight: singleWeight,
    birth_hospital: formData.birth_hospital.trim() || null,
    check_in_date: formData.check_in_date,
    check_out_date: formData.check_out_date,
    edu_date: formData.edu_date || null,
    notes: formData.notes.trim() || null,
    status: formData.status
  }
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

  const [mode, setMode] = useState<'view' | 'edit' | 'create' | 'add-upcoming'>('view')
  const [editingStayId, setEditingStayId] = useState<string | null>(null)

  const getEmptyFormData = useCallback((status: 'active' | 'upcoming' = 'active'): FormData => {
    const defaultPeriod: StayPeriod = '2weeks'
    const derived = getScheduleByPeriod(today, defaultPeriod)

    return {
      mother_name: '',
      baby_count: 1,
      birth_hospital: '',
      check_in_date: today,
      stay_period: defaultPeriod,
      check_out_date: derived?.check_out_date || today,
      edu_date: derived?.edu_date || '',
      notes: '',
      status,
      baby_profiles: [createEmptyBabyProfile()]
    }
  }, [today])

  const [formData, setFormData] = useState<FormData>(getEmptyFormData())

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

  const createMutation = useMutation({
    mutationFn: async (data: StayPayload & { room_number: string }) => {
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
      queryClient.invalidateQueries({ queryKey: ['daily-stats'] })
      setMode('view')
      setFormData(getEmptyFormData())
    }
  })

  const updateMutation = useMutation({
    mutationFn: async (data: StayPayload & { id: string }) => {
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
      queryClient.invalidateQueries({ queryKey: ['daily-stats'] })
      setMode('view')
      setEditingStayId(null)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await authFetch(`/api/stays?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete stay')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stays'] })
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      queryClient.invalidateQueries({ queryKey: ['daily-stats'] })
      if (activeStay && editingStayId === activeStay.id) {
        onOpenChange(false)
      }
      setMode('view')
      setEditingStayId(null)
    },
    onError: (error) => {
      console.error('Delete failed:', error)
      alert('삭제에 실패했습니다. 다시 시도해주세요.')
    }
  })

  const isPending = createMutation.isPending || updateMutation.isPending

  const updateBabyProfile = (index: number, key: keyof BabyProfileForm, value: string) => {
    setFormData((prev) => {
      const nextProfiles = [...prev.baby_profiles]
      const target = nextProfiles[index] ?? createEmptyBabyProfile()
      nextProfiles[index] = { ...target, [key]: value }
      return { ...prev, baby_profiles: nextProfiles }
    })
  }

  const handleBabyCountChange = (value: string) => {
    const count = Math.max(1, Math.min(4, Number(value) || 1))
    setFormData((prev) => ({
      ...prev,
      baby_count: count,
      baby_profiles: ensureProfileCount(prev.baby_profiles, count)
    }))
  }

  const handleDelete = (stay: Stay) => {
    if (confirm('정말로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      deleteMutation.mutate(stay.id)
    }
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const payload = buildStayPayload(formData)

    if (mode === 'edit' && editingStayId) {
      updateMutation.mutate({ ...payload, id: editingStayId })
      return
    }
    createMutation.mutate({ ...payload, room_number: roomNumber })
  }

  const handleEdit = (stay: Stay) => {
    const fromStoredProfiles = Array.isArray(stay.baby_profiles) ? stay.baby_profiles : []
    const profiles: BabyProfileForm[] = ensureProfileCount(
      (fromStoredProfiles.length > 0 ? fromStoredProfiles : Array.from({ length: stay.baby_count }, (_, idx) => ({
        name: stay.baby_names?.[idx] || '',
        gender: idx === 0 ? stay.gender || '' : '',
        weight: idx === 0 ? stay.baby_weight ?? null : null
      }))).map((profile) => ({
        name: profile.name?.toString() || '',
        gender: profile.gender?.toString() || '',
        weight: profile.weight !== null && profile.weight !== undefined ? String(profile.weight) : ''
      })),
      stay.baby_count
    )

    setEditingStayId(stay.id)
    setFormData({
      mother_name: stay.mother_name,
      baby_count: stay.baby_count,
      birth_hospital: stay.birth_hospital || '',
      check_in_date: stay.check_in_date,
      stay_period: inferStayPeriod(stay.check_in_date, stay.check_out_date),
      check_out_date: stay.check_out_date,
      edu_date: stay.edu_date || '',
      notes: stay.notes || '',
      status: stay.status,
      baby_profiles: profiles
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

  const handleCheckInChange = (newCheckIn: string) => {
    if (!newCheckIn) {
      setFormData((prev) => ({ ...prev, check_in_date: '' }))
      return
    }

    setFormData((prev) => {
      const derived = getScheduleByPeriod(newCheckIn, prev.stay_period)
      if (!derived) {
        return { ...prev, check_in_date: newCheckIn }
      }

      return {
        ...prev,
        check_in_date: newCheckIn,
        check_out_date: derived.check_out_date,
        edu_date: derived.edu_date
      }
    })
  }

  const handleStayPeriodChange = (value: string) => {
    const period = value as StayPeriod
    setFormData((prev) => {
      const derived = getScheduleByPeriod(prev.check_in_date, period)
      if (!derived) {
        return { ...prev, stay_period: period }
      }

      return {
        ...prev,
        stay_period: period,
        check_out_date: derived.check_out_date,
        edu_date: derived.edu_date
      }
    })
  }

  const handleCheckOutChange = (newCheckOut: string) => {
    if (!newCheckOut) {
      setFormData((prev) => ({ ...prev, check_out_date: '' }))
      return
    }

    setFormData((prev) => ({
      ...prev,
      stay_period: inferStayPeriod(prev.check_in_date, newCheckOut),
      check_out_date: newCheckOut,
      edu_date: getEducationDateFromCheckOut(newCheckOut)
    }))
  }

  const StayInfoCard = ({ stay, isActive }: { stay: Stay; isActive?: boolean }) => {
    const isUpcoming = stay.status === 'upcoming'
    const todayDate = new Date()
    const checkoutDate = new Date(stay.check_out_date)
    const daysUntilCheckout = Math.ceil((checkoutDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24))
    const isCheckoutSoon = isActive && daysUntilCheckout >= 0 && daysUntilCheckout <= 2

    const badgeInfo = isCheckoutSoon
      ? { text: '퇴실예정', variant: 'destructive' as const }
      : isActive
        ? { text: '입실 중', variant: 'default' as const }
        : { text: '입실 예정', variant: 'secondary' as const }

    const babyProfiles = (stay.baby_profiles || [])
      .filter(
        (profile) =>
          profile?.name ||
          profile?.gender ||
          (profile?.weight !== null && profile?.weight !== undefined)
      )

    return (
      <Card className={cn(
        isActive ? 'border-primary border-2' : 'border-dashed',
        isUpcoming && 'animate-pulse border-blue-400 border-2',
        isCheckoutSoon && 'border-red-300 border-2'
      )}>
        <CardContent className="p-4 space-y-3">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2 min-w-0">
              <Badge variant={badgeInfo.variant}>{badgeInfo.text}</Badge>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-lg">{stay.mother_name}</span>
                <span className="text-xs text-muted-foreground truncate">
                  태명: {stay.baby_names?.filter((name) => name.trim() !== '').join(', ') || '-'}
                </span>
              </div>
            </div>
            <div className="flex items-center">
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(stay)}>
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
          </div>

          {babyProfiles.length > 1 ? (
            <div className="grid grid-cols-2 gap-2">
              {babyProfiles.map((baby, idx) => (
                <div key={`${stay.id}-${idx}`} className="rounded-lg border bg-muted/30 p-2 text-xs space-y-1">
                  <div className="font-semibold">아기 {idx + 1}</div>
                  <div>태명: {baby.name || '-'}</div>
                  <div>성별: {baby.gender || '-'}</div>
                  <div>몸무게: {formatWeight(baby.weight)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
              <span className="text-muted-foreground">성별</span>
              <span>{stay.gender || '-'}</span>

              <span className="text-muted-foreground">몸무게</span>
              <span>{formatWeight(stay.baby_weight)}</span>

              <span className="text-muted-foreground">출산병원</span>
              <span className="truncate">{stay.birth_hospital || '-'}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
            <span className="text-muted-foreground">입실일자</span>
            <span>{stay.check_in_date}</span>

            <span className="text-muted-foreground">퇴실일자</span>
            <span>{stay.check_out_date}</span>

            <span className="text-muted-foreground">교육일자</span>
            <span>{stay.edu_date || '-'}</span>
          </div>

          {stay.notes && <div className="text-sm bg-muted/50 p-2 rounded">{stay.notes}</div>}
        </CardContent>
      </Card>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[560px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-xl flex items-center gap-2">
            <span className="bg-primary text-primary-foreground px-2 py-1 rounded text-base">{roomNumber}호</span>
            {mode === 'view' && activeStay && '객실 정보'}
            {mode === 'create' && '입실 등록'}
            {mode === 'edit' && '정보 수정'}
            {mode === 'add-upcoming' && '입실 예정 추가'}
          </SheetTitle>
          <SheetDescription>
            {mode === 'view' && '현재 입실 정보 및 예정된 입실 내역입니다.'}
            {mode === 'create' && '필수 항목부터 빠르게 입력하고, 아기 정보를 상세하게 등록하세요.'}
            {mode === 'edit' && '입실 정보를 수정합니다.'}
            {mode === 'add-upcoming' && '다음 입실 예정 정보를 등록합니다.'}
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {mode === 'view' && activeStay && (
            <>
              <StayInfoCard stay={activeStay} isActive />

              {upcomingStays.length > 0 && (
                <div className="space-y-3">
                  <div className="text-sm font-medium text-muted-foreground">입실 예정</div>
                  {upcomingStays.map((stay) => (
                    <StayInfoCard key={stay.id} stay={stay} />
                  ))}
                </div>
              )}

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

          {(mode === 'create' || mode === 'edit' || mode === 'add-upcoming') && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <UserRound className="h-4 w-4" />
                    산모 기본정보
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="mother_name">산모 이름 *</Label>
                      <Input
                        id="mother_name"
                        value={formData.mother_name}
                        onChange={(e) => setFormData((prev) => ({ ...prev, mother_name: e.target.value }))}
                        placeholder="김산모"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="birth_hospital">출산병원</Label>
                      <Input
                        id="birth_hospital"
                        value={formData.birth_hospital}
                        onChange={(e) => setFormData((prev) => ({ ...prev, birth_hospital: e.target.value }))}
                        placeholder="OO병원"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">상태</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value as StayStatus }))}
                    >
                      <SelectTrigger id="status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="upcoming">입실 예정</SelectItem>
                        <SelectItem value="active">입실 중</SelectItem>
                        <SelectItem value="completed">퇴실 완료</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Baby className="h-4 w-4" />
                    신생아 정보
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="baby_count">신생아 수</Label>
                    <Select value={String(formData.baby_count)} onValueChange={handleBabyCountChange}>
                      <SelectTrigger id="baby_count">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1명</SelectItem>
                        <SelectItem value="2">2명</SelectItem>
                        <SelectItem value="3">3명</SelectItem>
                        <SelectItem value="4">4명</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.baby_count === 2 && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                      쌍둥이 입력 모드입니다. 아기별 정보를 각각 입력해주세요.
                    </div>
                  )}

                  <div className={cn(
                    'grid gap-3',
                    formData.baby_count === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'
                  )}>
                    {ensureProfileCount(formData.baby_profiles, formData.baby_count).map((baby, index) => (
                      <Card key={`baby-${index}`} className={cn(
                        'border bg-gradient-to-br from-muted/40 to-background',
                        formData.baby_count === 2 && 'border-primary/20 shadow-sm'
                      )}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-semibold">아기 {index + 1}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-2">
                            <Label htmlFor={`baby_name_${index}`}>태명</Label>
                            <Input
                              id={`baby_name_${index}`}
                              value={baby.name}
                              onChange={(e) => updateBabyProfile(index, 'name', e.target.value)}
                              placeholder={`태명 ${index + 1}`}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`baby_gender_${index}`}>성별</Label>
                            <Select
                              value={baby.gender || 'none'}
                              onValueChange={(value) => updateBabyProfile(index, 'gender', value === 'none' ? '' : value)}
                            >
                              <SelectTrigger id={`baby_gender_${index}`}>
                                <SelectValue placeholder="선택" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">미입력</SelectItem>
                                <SelectItem value="남아">남아</SelectItem>
                                <SelectItem value="여아">여아</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`baby_weight_${index}`}>몸무게(kg)</Label>
                            <Input
                              id={`baby_weight_${index}`}
                              type="number"
                              min={0}
                              step="0.01"
                              value={baby.weight}
                              onChange={(e) => updateBabyProfile(index, 'weight', e.target.value)}
                              placeholder="3.2"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    일정 정보
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="check_in_date">입실일 *</Label>
                      <Input
                        id="check_in_date"
                        type="date"
                        value={formData.check_in_date}
                        onChange={(e) => handleCheckInChange(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="stay_period">입실기간 *</Label>
                      <Select value={formData.stay_period} onValueChange={handleStayPeriodChange}>
                        <SelectTrigger id="stay_period">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STAY_PERIOD_CONFIG).map(([value, config]) => (
                            <SelectItem key={value} value={value}>
                              {config.label}
                            </SelectItem>
                          ))}
                          <SelectItem value="custom">직접입력</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="check_out_date">퇴실일 *</Label>
                      <Input
                        id="check_out_date"
                        type="date"
                        value={formData.check_out_date}
                        onChange={(e) => handleCheckOutChange(e.target.value)}
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
                      onChange={(e) => setFormData((prev) => ({ ...prev, edu_date: e.target.value }))}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      퇴실일 기준 가장 가까운 일요일로 자동 반영됩니다.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">메모</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="특이사항, 보호자 요청사항, 참고 메모 등을 입력하세요."
                    rows={3}
                  />
                </CardContent>
              </Card>

              <div className="flex gap-2 pt-2">
                {(mode === 'edit' || mode === 'add-upcoming') && (
                  <Button type="button" variant="outline" className="flex-1" onClick={handleCancelEdit}>
                    취소
                  </Button>
                )}
                <Button type="submit" className="flex-1" disabled={isPending}>
                  {isPending ? '저장 중...' : mode === 'edit' ? '수정 완료' : '등록'}
                </Button>
              </div>
            </form>
          )}

          {mode === 'edit' && editingStayId === activeStay?.id && upcomingStays.length > 0 && (
            <div className="space-y-3 pt-4 border-t">
              <div className="text-sm font-medium text-muted-foreground">입실 예정</div>
              {upcomingStays.map((stay) => (
                <StayInfoCard key={stay.id} stay={stay} />
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
