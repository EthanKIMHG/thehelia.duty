'use client'

import { AppConfirmDialog } from '@/components/app-confirm-dialog'
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
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
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

const getPreviousSunday = (date: Date) => {
  const day = date.getDay()
  // 교육일은 퇴실일의 "직전(전주) 일요일" 기준.
  // 퇴실일이 일요일이면 같은 날이 아닌 7일 전 일요일을 사용한다.
  const offset = day === 0 ? 7 : day
  const previousSunday = new Date(date)
  previousSunday.setDate(date.getDate() - offset)
  return previousSunday
}

const getEducationDateFromCheckOut = (checkOutDate: string) => {
  const parsed = toValidDate(checkOutDate)
  if (!parsed) return ''
  return format(getPreviousSunday(parsed), 'yyyy-MM-dd')
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

const formatDisplayDate = (value?: string | null) => {
  if (!value) return '-'
  const parsed = toValidDate(value)
  if (!parsed) return value
  return format(parsed, 'yyyy.MM.dd (EEE)', { locale: ko })
}

type NewbornTone = 'default' | 'boy' | 'girl' | 'mixed'

const getNewbornToneFromGender = (gender?: string | null): NewbornTone => {
  const raw = (gender || '').trim()
  if (!raw) return 'default'

  const hasBoy = raw.includes('남아')
  const hasGirl = raw.includes('여아')

  if (hasBoy && hasGirl) return 'mixed'
  if (hasBoy) return 'boy'
  if (hasGirl) return 'girl'
  return 'default'
}

const getNewbornSurfaceClass = (tone: NewbornTone) => {
  if (tone === 'boy') return 'border-sky-100 bg-sky-50/40'
  if (tone === 'girl') return 'border-pink-100 bg-pink-50/40'
  if (tone === 'mixed') return 'border-violet-100 bg-violet-50/40'
  return 'border-border/70 bg-muted/20'
}

function InfoTile({
  label,
  value,
  tone = 'default'
}: {
  label: string
  value?: string | null
  tone?: NewbornTone
}) {
  const displayValue = value && value.trim() !== '' ? value : '-'

  const toneClass = {
    default: 'border-border/70 bg-muted/30',
    boy: 'border-sky-100 bg-sky-50/45',
    girl: 'border-pink-100 bg-pink-50/45',
    mixed: 'border-violet-100 bg-violet-50/45'
  }[tone]

  return (
    <div className={cn('rounded-xl border px-3.5 py-3', toneClass)}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-1 text-base font-semibold leading-tight text-foreground',
          displayValue === '-' && 'font-medium text-muted-foreground'
        )}
      >
        {displayValue}
      </p>
    </div>
  )
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

  const genderValues = normalizedProfiles
    .map((profile) => profile.gender)
    .filter((gender): gender is string => Boolean(gender))

  const mergedGender = genderValues.length > 0 ? genderValues.join('/') : null
  const firstBabyWeight = normalizedProfiles[0]?.weight ?? null

  return {
    mother_name: formData.mother_name.trim(),
    baby_count: formData.baby_count,
    baby_names: babyNames,
    baby_profiles: normalizedProfiles,
    gender: mergedGender,
    baby_weight: firstBabyWeight,
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
  const { toast } = useToast()
  const hasActiveStay = Boolean(activeStay)
  const hasUpcomingStays = upcomingStays.length > 0
  const hasStayData = hasActiveStay || hasUpcomingStays

  const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), [])

  const [mode, setMode] = useState<'view' | 'edit' | 'create' | 'add-upcoming'>('view')
  const [editingStayId, setEditingStayId] = useState<string | null>(null)
  const [stayToDelete, setStayToDelete] = useState<Stay | null>(null)

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
      if (hasStayData) {
        setMode('view')
      } else {
        setMode('create')
        setFormData(getEmptyFormData('active'))
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, hasStayData])

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
      toast({
        title: '입실 정보 저장 완료',
        description: '객실 정보가 최신 상태로 반영되었습니다.',
        duration: 2500,
      })
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
      toast({
        title: '입실 정보 수정 완료',
        description: '변경된 내용이 저장되었습니다.',
        duration: 2500,
      })
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
      toast({
        title: '산모 기록 삭제 완료',
        description: '해당 입실 기록이 제거되었습니다.',
        duration: 2500,
      })
      setMode('view')
      setEditingStayId(null)
      setStayToDelete(null)
    },
    onError: (error) => {
      console.error('Delete failed:', error)
      toast({
        variant: 'destructive',
        title: '산모 기록 삭제 실패',
        description: '잠시 후 다시 시도해주세요.',
        duration: 5000,
      })
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
    setStayToDelete(stay)
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
    if (hasStayData) {
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
      setFormData((prev) => ({ ...prev, check_out_date: '', edu_date: '' }))
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

    const nameFallbacks = (stay.baby_names || [])
      .map((name) => name?.trim())
      .filter((name): name is string => Boolean(name))

    const splitGenders = (stay.gender || '')
      .split('/')
      .map((gender) => gender.trim())
      .filter((gender) => gender.length > 0)

    const displayBabyCount = Math.max(1, stay.baby_count || 1)
    const displayBabies = Array.from({ length: displayBabyCount }, (_, idx) => {
      const profile = stay.baby_profiles?.[idx]
      const name = profile?.name?.trim() || nameFallbacks[idx] || null
      const gender = profile?.gender?.trim() || splitGenders[idx] || (idx === 0 ? stay.gender || null : null)
      const weight = profile?.weight ?? (idx === 0 ? stay.baby_weight : null)

      return { name, gender, weight }
    })

    const babyNameSummary = displayBabies
      .map((baby) => baby.name)
      .filter((name): name is string => Boolean(name))
      .join(', ')
    const babyGenderSummary = displayBabies
      .map((baby) => baby.gender)
      .filter((gender): gender is string => Boolean(gender))
      .join('/')
    const newbornTone = getNewbornToneFromGender(babyGenderSummary || stay.gender || null)

    return (
      <Card className={cn(
        'overflow-hidden rounded-2xl border bg-card shadow-sm',
        isActive && 'border-primary/40 ring-1 ring-primary/20',
        isUpcoming && 'animate-pulse border-blue-300 ring-1 ring-blue-200',
        isCheckoutSoon && 'border-red-300 ring-1 ring-red-200'
      )}>
        <CardContent className="p-0">
          <div className="border-b bg-gradient-to-r from-muted/40 via-background to-background px-4 py-3 sm:px-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={badgeInfo.variant} className="h-6 px-2.5 text-[11px] font-semibold">
                    {badgeInfo.text}
                  </Badge>
                  <h3 className="truncate text-xl font-bold leading-none">{stay.mother_name}</h3>
                </div>
                <p className="truncate text-sm text-muted-foreground">
                  태명 {babyNameSummary || '-'}
                </p>
              </div>
              <div className="flex items-center">
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => handleEdit(stay)}>
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:text-red-600"
                  onClick={() => handleDelete(stay)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-4 px-4 py-4 sm:px-5">
            <div className={cn('space-y-2 rounded-xl border p-3', getNewbornSurfaceClass(newbornTone))}>
              <p className="text-xs font-semibold tracking-wide text-muted-foreground">신생아 및 산모 정보</p>
              {displayBabyCount > 1 ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {displayBabies.map((baby, idx) => (
                    <div
                      key={`${stay.id}-${idx}`}
                      className={cn('rounded-xl border p-3', getNewbornSurfaceClass(getNewbornToneFromGender(baby.gender)))}
                    >
                      <p className="text-xs font-semibold text-muted-foreground">아기 {idx + 1}</p>
                      <div className="mt-2 space-y-1.5 text-sm">
                        <p><span className="text-muted-foreground">태명</span> <span className="font-medium">{baby.name || '-'}</span></p>
                        <p><span className="text-muted-foreground">성별</span> <span className="font-medium">{baby.gender || '-'}</span></p>
                        <p><span className="text-muted-foreground">몸무게</span> <span className="font-medium">{formatWeight(baby.weight)}</span></p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <InfoTile label="태명" value={displayBabies[0]?.name || '-'} tone={newbornTone} />
                  <InfoTile label="성별" value={displayBabies[0]?.gender || '-'} tone={newbornTone} />
                  <InfoTile label="몸무게" value={formatWeight(displayBabies[0]?.weight)} tone={newbornTone} />
                  <InfoTile label="출산병원" value={stay.birth_hospital || '-'} tone="default" />
                </div>
              )}
              {displayBabyCount > 1 && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <InfoTile label="출산병원" value={stay.birth_hospital || '-'} tone="default" />
                  <InfoTile label="전체 태명" value={babyNameSummary || '-'} tone={newbornTone} />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground">일정 정보</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <InfoTile label="입실일자" value={formatDisplayDate(stay.check_in_date)} tone="default" />
                <InfoTile label="퇴실일자" value={formatDisplayDate(stay.check_out_date)} tone="default" />
                <InfoTile label="교육일자" value={formatDisplayDate(stay.edu_date)} tone="default" />
              </div>
            </div>

            {stay.notes && (
              <div className="rounded-xl border border-border/70 bg-muted/30 px-3.5 py-3">
                <p className="text-xs font-semibold text-muted-foreground">메모</p>
                <p className="mt-1 text-sm leading-relaxed text-foreground whitespace-pre-wrap">{stay.notes}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-[560px] overflow-y-auto">
        <SheetHeader className="space-y-2 border-b pb-4">
          <SheetTitle className="flex items-center gap-2.5">
            <span className="inline-flex h-9 items-center rounded-lg bg-primary px-3 text-sm font-bold text-primary-foreground shadow-sm">
              {roomNumber}호
            </span>
            <span className="text-xl font-semibold tracking-tight">
              {mode === 'view' && '객실 정보'}
              {mode === 'create' && '입실 등록'}
              {mode === 'edit' && '정보 수정'}
              {mode === 'add-upcoming' && '입실 예정 추가'}
            </span>
          </SheetTitle>
          <SheetDescription className="text-sm leading-6">
            {mode === 'view' && (hasActiveStay
              ? '현재 입실 정보 및 예정된 입실 내역입니다.'
              : '현재는 비어있는 객실이며, 예정된 입실 내역입니다.')}
            {mode === 'create' && '필수 항목부터 빠르게 입력하고, 아기 정보를 상세하게 등록하세요.'}
            {mode === 'edit' && '입실 정보를 수정합니다.'}
            {mode === 'add-upcoming' && '다음 입실 예정 정보를 등록합니다.'}
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {mode === 'view' && hasStayData && (
            <>
              {activeStay && <StayInfoCard stay={activeStay} isActive />}

              {upcomingStays.length > 0 && (
                <div className="space-y-3">
                  <div className="text-sm font-medium text-muted-foreground">
                    {activeStay ? '입실 예정' : '다음 입실 예정'}
                  </div>
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
              <Card className="border-border/70 bg-muted/20 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-foreground">
                    <UserRound className="h-4 w-4 text-muted-foreground" />
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

              <Card className="border-border/70 bg-muted/20 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-foreground">
                    <Baby className="h-4 w-4 text-muted-foreground" />
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

              <Card className="border-border/70 bg-muted/20 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-foreground">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
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
                      퇴실일 기준 직전(전주) 일요일로 자동 반영됩니다.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/70 bg-muted/20 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-foreground">메모</CardTitle>
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

      <AppConfirmDialog
        open={Boolean(stayToDelete)}
        title="산모 기록을 삭제하시겠습니까?"
        description="이 작업은 되돌릴 수 없습니다. 해당 산모의 입실 정보가 객실 현황에서 제거됩니다."
        confirmLabel="삭제"
        confirmVariant="destructive"
        confirmDisabled={deleteMutation.isPending}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setStayToDelete(null)
        }}
        onCancel={() => setStayToDelete(null)}
        onConfirm={() => {
          if (!stayToDelete) return
          deleteMutation.mutate(stayToDelete.id)
        }}
      />
    </>
  )
}
