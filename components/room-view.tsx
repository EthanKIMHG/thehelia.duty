'use client'

import { StayFormDrawer } from '@/components/stay-form-drawer'
import { StayHistoryView } from '@/components/stay-history-view'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { authFetch } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addDays, differenceInDays, format, parseISO } from 'date-fns'
import { Baby, BedDouble, CalendarRange, Eye, EyeOff, GripVertical, LogIn, LogOut, RefreshCw, Users } from 'lucide-react'
import { useMemo, useState, type DragEvent } from 'react'

interface Stay {
  id: string
  room_number: string
  mother_name: string
  baby_count: number
  baby_names?: string[]
  baby_profiles?: Array<{
    name?: string | null
    gender?: string | null
    weight?: number | null
  }> | null
  gender?: string | null
  baby_weight?: number | null
  birth_hospital?: string | null
  check_in_date: string
  check_out_date: string
  edu_date?: string
  notes?: string
  status: 'upcoming' | 'active' | 'completed'
}

interface RoomFromAPI {
  room_number: string
  room_type: 'Prestige' | 'VIP' | 'VVIP'
  floor: number
  active_stay: Stay | null
  upcoming_stays: Stay[]
  current_stay: Stay | null
}

interface Room {
  id: string
  number: string
  type: 'Prestige' | 'VIP' | 'VVIP'
  status: 'Empty' | 'Occupied'
  activeStayId?: string
  motherName?: string
  babyCount?: number
  babyNames?: string[]
  babyProfiles?: Array<{
    name?: string | null
    gender?: string | null
    weight?: number | null
  }> | null
  gender?: string | null
  babyWeight?: number | null
  birthHospital?: string | null
  checkInDate?: string
  checkOutDate?: string
  eduDate?: string
  checkOutDday?: number
  upcomingStays: Stay[]
}

interface SyncStatusResponse {
  success: boolean
  today_kst: string
  completed_count: number
  completed: Array<{
    id: string
    room_number: string
    mother_name: string
    check_out_date: string
  }>
  promoted_count: number
  promoted: Array<{
    id: string
    room_number: string
    mother_name: string
    check_in_date: string
  }>
}

interface DashboardStaysResponse {
  today_kst: string | null
  today_checkins: Stay[]
  today_checkouts: Stay[]
  tomorrow_checkins: Stay[]
  tomorrow_checkouts: Stay[]
  census: Stay[]
  totals: {
    newborns: number
    mothers: number
  }
}

type StatCardType =
  | 'todayCheckIn'
  | 'todayCheckOut'
  | 'newborns'
  | 'mothers'
  | 'tomorrowCheckIn'
  | 'tomorrowCheckOut'

const dedupeByStayId = (stays: Stay[]) => {
  const seen = new Set<string>()
  return stays.filter((stay) => {
    if (seen.has(stay.id)) return false
    seen.add(stay.id)
    return true
  })
}

const formatWeight = (value?: number | string | null) => {
  if (value === undefined || value === null || value === '') return '-'
  const numeric = typeof value === 'number' ? value : Number(value)
  if (Number.isFinite(numeric)) return `${numeric}kg`
  return String(value)
}

const formatShortDate = (value?: string) => {
  if (!value) return '-'
  const parsed = parseISO(value)
  if (Number.isNaN(parsed.getTime())) return value
  return format(parsed, 'M/d')
}

type BabyDisplaySource = {
  baby_count?: number
  baby_names?: string[]
  baby_profiles?: Array<{
    name?: string | null
    gender?: string | null
    weight?: number | null
  }> | null
  gender?: string | null
  baby_weight?: number | null
}

const getDisplayBabies = (source: BabyDisplaySource) => {
  const nameFallbacks = (source.baby_names || [])
    .map((name) => name?.trim())
    .filter((name): name is string => Boolean(name))

  const splitGenders = (source.gender || '')
    .split('/')
    .map((gender) => gender.trim())
    .filter((gender) => gender.length > 0)

  const count = Math.max(1, source.baby_count || 1)

  return Array.from({ length: count }, (_, idx) => {
    const profile = source.baby_profiles?.[idx]
    const name = profile?.name?.trim() || nameFallbacks[idx] || null
    const gender = profile?.gender?.trim() || splitGenders[idx] || (idx === 0 ? source.gender || null : null)
    const weight = profile?.weight ?? (idx === 0 ? source.baby_weight ?? null : null)
    return { name, gender, weight }
  })
}

const getBabyNameSummary = (babies: Array<{ name?: string | null }>) => {
  return babies
    .map((baby) => baby.name?.trim())
    .filter((name): name is string => Boolean(name))
    .join(', ')
}

const getBabyGenderSummary = (babies: Array<{ gender?: string | null }>, fallback?: string | null) => {
  const fromBabies = babies
    .map((baby) => baby.gender?.trim())
    .filter((gender): gender is string => Boolean(gender))
    .join('/')

  if (fromBabies) return fromBabies
  return fallback || ''
}

const getBabyWeightSummary = (babies: Array<{ weight?: number | null }>) => {
  const values = babies
    .map((baby, idx) => {
      const formatted = formatWeight(baby.weight)
      if (formatted === '-') return ''
      return babies.length > 1 ? `아기${idx + 1} ${formatted}` : formatted
    })
    .filter((value) => value !== '')

  return values.join(', ')
}

type ChipTone = 'neutral' | 'boy' | 'girl' | 'mixed'

const getChipToneFromGender = (gender?: string | null): ChipTone => {
  const raw = (gender || '').trim()
  if (!raw) return 'neutral'

  const hasBoy = raw.includes('남아')
  const hasGirl = raw.includes('여아')

  if (hasBoy && hasGirl) return 'mixed'
  if (hasBoy) return 'boy'
  if (hasGirl) return 'girl'
  return 'neutral'
}

const getChipToneClass = (tone: ChipTone) => {
  if (tone === 'boy') return 'border-sky-100 bg-sky-50/45 text-sky-700'
  if (tone === 'girl') return 'border-pink-100 bg-pink-50/45 text-pink-700'
  if (tone === 'mixed') return 'border-violet-100 bg-violet-50/45 text-violet-700'
  return 'border-border/70 bg-muted/30 text-foreground'
}

const getDateStringInTimeZone = (timeZone: string, baseDate = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(baseDate)

  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value

  if (!year || !month || !day) return format(baseDate, 'yyyy-MM-dd')
  return `${year}-${month}-${day}`
}

export function RoomView() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'overview' | 'history'>('overview')
  const [filter, setFilter] = useState<'All' | 'Prestige' | 'VIP' | 'VVIP' | 'CheckOut'>('All')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedStat, setSelectedStat] = useState<StatCardType>('todayCheckIn')
  const [showTodayNotice, setShowTodayNotice] = useState(true)
  const [draggingRoomNumber, setDraggingRoomNumber] = useState<string | null>(null)
  const [dragOverRoomNumber, setDragOverRoomNumber] = useState<string | null>(null)
  const [syncFeedback, setSyncFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)
  const [syncResult, setSyncResult] = useState<SyncStatusResponse | null>(null)

  const { data: roomsFromAPI, isLoading } = useQuery<RoomFromAPI[]>({
    queryKey: ['rooms'],
    queryFn: async () => {
      const res = await authFetch('/api/rooms')
      if (!res.ok) throw new Error('Failed to fetch rooms')
      return res.json()
    }
  })

  const { data: dailyStats } = useQuery<{ total_newborns: number; total_mothers: number }>({
    queryKey: ['daily-stats'],
    queryFn: async () => {
      const res = await authFetch('/api/daily-stats')
      return res.json()
    }
  })

  const { data: dashboardStays } = useQuery<DashboardStaysResponse>({
    queryKey: ['dashboard-stays'],
    queryFn: async () => {
      const res = await authFetch('/api/dashboard-stays')
      if (!res.ok) throw new Error('Failed to fetch dashboard stays')
      return res.json()
    }
  })

  const selectedRoomData = roomsFromAPI?.find((room) => room.room_number === selectedRoom)

  const todayStr = useMemo(() => getDateStringInTimeZone('Asia/Seoul'), [])
  const tomorrowStr = useMemo(() => format(addDays(parseISO(todayStr), 1), 'yyyy-MM-dd'), [todayStr])
  const kstLabel = todayStr.replaceAll('-', '.')
  const todayBase = parseISO(todayStr)

  const rooms: Room[] = (roomsFromAPI || []).map((room) => {
    const stay = room.active_stay

    let status: Room['status'] = 'Empty'
    let checkOutDday: number | undefined

    if (stay && stay.status === 'active') {
      status = 'Occupied'
      const daysUntilCheckout = differenceInDays(parseISO(stay.check_out_date), todayBase)
      if (daysUntilCheckout >= 0 && daysUntilCheckout <= 2) {
        checkOutDday = daysUntilCheckout
      }
    }

    return {
      id: room.room_number,
      number: room.room_number,
      type: room.room_type,
      status,
      activeStayId: stay?.id,
      motherName: stay?.mother_name,
      babyCount: stay?.baby_count,
      babyNames: stay?.baby_names,
      babyProfiles: stay?.baby_profiles || null,
      gender: stay?.gender,
      babyWeight: stay?.baby_weight,
      birthHospital: stay?.birth_hospital,
      checkInDate: stay?.check_in_date,
      checkOutDate: stay?.check_out_date,
      eduDate: stay?.edu_date,
      checkOutDday,
      upcomingStays: room.upcoming_stays || []
    }
  })

  const filteredRooms = rooms.filter((room) => {
    if (filter === 'All') return true
    if (filter === 'CheckOut') return room.checkOutDday !== undefined
    return room.type === filter
  })

  const rooms5F = filteredRooms.filter((room) => room.number.startsWith('5'))
  const rooms6F = filteredRooms.filter((room) => room.number.startsWith('6'))

  const activeStays = (roomsFromAPI || [])
    .map((room) => room.active_stay)
    .filter((stay): stay is Stay => Boolean(stay))
  const upcomingStays = (roomsFromAPI || []).flatMap((room) => room.upcoming_stays || [])

  const checkInCandidates = dedupeByStayId([...activeStays, ...upcomingStays])
  const fallbackCensusStays = activeStays.filter(
    (stay) => stay.check_in_date <= todayStr && stay.check_out_date > todayStr
  )

  const fallbackTodayCheckInList = checkInCandidates.filter((stay) => stay.check_in_date === todayStr)
  const fallbackTodayCheckOutList = activeStays.filter((stay) => stay.check_out_date === todayStr)
  const fallbackTomorrowCheckInList = checkInCandidates.filter((stay) => stay.check_in_date === tomorrowStr)
  const fallbackTomorrowCheckOutList = activeStays.filter((stay) => stay.check_out_date === tomorrowStr)

  const censusStays = dashboardStays?.census ?? fallbackCensusStays
  const todayCheckInList = dashboardStays?.today_checkins ?? fallbackTodayCheckInList
  const todayCheckOutList = dashboardStays?.today_checkouts ?? fallbackTodayCheckOutList
  const tomorrowCheckInList = dashboardStays?.tomorrow_checkins ?? fallbackTomorrowCheckInList
  const tomorrowCheckOutList = dashboardStays?.tomorrow_checkouts ?? fallbackTomorrowCheckOutList

  const totalNewborns =
    dashboardStays?.totals?.newborns ??
    dailyStats?.total_newborns ??
    censusStays.reduce((acc, stay) => acc + (stay.baby_count || 0), 0)
  const totalMothers =
    dashboardStays?.totals?.mothers ??
    dailyStats?.total_mothers ??
    censusStays.length
  const todayCheckIn = todayCheckInList.length
  const todayCheckOut = todayCheckOutList.length
  const tomorrowCheckIn = tomorrowCheckInList.length
  const tomorrowCheckOut = tomorrowCheckOutList.length

  const handleRoomClick = (roomNumber: string) => {
    setSelectedRoom(roomNumber)
    setDrawerOpen(true)
  }

  const handleStatCardClick = (type: StatCardType) => {
    setSelectedStat(type)
    setDetailDialogOpen(true)
  }

  const syncStatusesMutation = useMutation({
    mutationFn: async () => {
      const res = await authFetch('/api/stays', { method: 'PATCH' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(body?.error || '데이터 업데이트에 실패했습니다.')
      }
      return body as SyncStatusResponse
    },
    onMutate: () => {
      setSyncFeedback(null)
      setSyncResult(null)
    },
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['rooms'] }),
        queryClient.invalidateQueries({ queryKey: ['stays'] }),
        queryClient.invalidateQueries({ queryKey: ['daily-stats'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-stays'] })
      ])
      setSyncResult(result)

      const promotedNames = result.promoted
        .map((stay) => stay.mother_name)
        .filter((name) => name && name.trim() !== '')
        .join(', ')

      const promotedMessage =
        result.promoted_count > 0
          ? `입실예정 ${result.promoted_count}건${promotedNames ? ` (${promotedNames})` : ''}을 입실중으로 반영했습니다.`
          : '입실중으로 전환할 입실예정 데이터가 없습니다.'

      const completedMessage =
        result.completed_count > 0
          ? `퇴실 대상 ${result.completed_count}건을 퇴실완료 처리했습니다.`
          : ''

      setSyncFeedback({
        type: 'success',
        message: [promotedMessage, completedMessage].filter(Boolean).join(' ')
      })
    },
    onError: (error) => {
      setSyncResult(null)
      setSyncFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : '데이터 업데이트 중 오류가 발생했습니다.'
      })
    }
  })

  const roomTransferMutation = useMutation({
    mutationFn: async ({ sourceRoomNumber, targetRoomNumber }: { sourceRoomNumber: string; targetRoomNumber: string }) => {
      if (sourceRoomNumber === targetRoomNumber) {
        return { isSwap: false, sourceRoomNumber, targetRoomNumber, sourceMotherName: '', targetMotherName: '' }
      }

      const sourceRoom = rooms.find((room) => room.number === sourceRoomNumber)
      const targetRoom = rooms.find((room) => room.number === targetRoomNumber)

      if (!sourceRoom?.activeStayId) {
        throw new Error('이동할 입실중 산모가 없습니다.')
      }

      const updateStayRoom = async (stayId: string, roomNumber: string) => {
        const res = await authFetch('/api/stays', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: stayId, room_number: roomNumber })
        })

        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.error || '객실 변경 저장에 실패했습니다.')
        }
      }

      await updateStayRoom(sourceRoom.activeStayId, targetRoomNumber)

      const isSwap = Boolean(targetRoom?.activeStayId)
      if (isSwap && targetRoom?.activeStayId) {
        try {
          await updateStayRoom(targetRoom.activeStayId, sourceRoomNumber)
        } catch (error) {
          await updateStayRoom(sourceRoom.activeStayId, sourceRoomNumber).catch(() => null)
          throw error
        }
      }

      return {
        isSwap,
        sourceRoomNumber,
        targetRoomNumber,
        sourceMotherName: sourceRoom.motherName || '산모',
        targetMotherName: targetRoom?.motherName || '산모'
      }
    },
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['rooms'] }),
        queryClient.invalidateQueries({ queryKey: ['stays'] }),
        queryClient.invalidateQueries({ queryKey: ['daily-stats'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-stays'] })
      ])

      const summary = result.isSwap
        ? `${result.sourceRoomNumber}호 ${result.sourceMotherName} ↔ ${result.targetRoomNumber}호 ${result.targetMotherName}`
        : `${result.sourceRoomNumber}호 ${result.sourceMotherName} → ${result.targetRoomNumber}호`
      alert(`객실 변경 완료\n${summary}`)
    },
    onError: (error) => {
      alert(error instanceof Error ? error.message : '객실 변경 중 오류가 발생했습니다.')
    },
    onSettled: () => {
      setDraggingRoomNumber(null)
      setDragOverRoomNumber(null)
    }
  })

  const handleRoomDragStart = (room: Room, event: DragEvent<HTMLDivElement>) => {
    if (roomTransferMutation.isPending || !room.activeStayId) {
      event.preventDefault()
      return
    }

    setDraggingRoomNumber(room.number)
    setDragOverRoomNumber(null)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', room.number)
  }

  const handleRoomDragOver = (targetRoomNumber: string, event: DragEvent<HTMLDivElement>) => {
    if (!draggingRoomNumber || draggingRoomNumber === targetRoomNumber) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDragOverRoomNumber(targetRoomNumber)
  }

  const handleRoomDrop = (targetRoomNumber: string, event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const sourceRoomNumber = draggingRoomNumber || event.dataTransfer.getData('text/plain')
    if (!sourceRoomNumber || sourceRoomNumber === targetRoomNumber) {
      setDragOverRoomNumber(null)
      return
    }

    roomTransferMutation.mutate({ sourceRoomNumber, targetRoomNumber })
  }

  const handleRoomDragEnd = () => {
    if (roomTransferMutation.isPending) return
    setDraggingRoomNumber(null)
    setDragOverRoomNumber(null)
  }

  const statDialogData = useMemo(() => {
    switch (selectedStat) {
      case 'todayCheckIn':
        return {
          title: '오늘 입실 내역',
          description: `${todayStr} 기준 입실 대상`,
          stays: todayCheckInList
        }
      case 'todayCheckOut':
        return {
          title: '오늘 퇴실 내역',
          description: `${todayStr} 기준 퇴실 대상`,
          stays: todayCheckOutList
        }
      case 'newborns':
        return {
          title: '신생아 현황',
          description: `${todayStr} 기준 재실 신생아 대상 객실`,
          stays: censusStays
        }
      case 'mothers':
        return {
          title: '산모 현황',
          description: `${todayStr} 기준 재실 산모 대상 객실`,
          stays: censusStays
        }
      case 'tomorrowCheckIn':
        return {
          title: '내일 입실 내역',
          description: `${tomorrowStr} 기준 입실 대상`,
          stays: tomorrowCheckInList
        }
      case 'tomorrowCheckOut':
        return {
          title: '내일 퇴실 내역',
          description: `${tomorrowStr} 기준 퇴실 대상`,
          stays: tomorrowCheckOutList
        }
      default:
        return {
          title: '상세 내역',
          description: '',
          stays: [] as Stay[]
        }
    }
  }, [
    selectedStat,
    todayStr,
    tomorrowStr,
    todayCheckInList,
    todayCheckOutList,
    tomorrowCheckInList,
    tomorrowCheckOutList,
    censusStays
  ])

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => setTab(value as 'overview' | 'history')}
      className={cn(
        'space-y-4',
        /* tab === 'overview' && showTodayNotice && 'pt-32 md:pt-36',
        tab === 'overview' && !showTodayNotice && 'pt-16' */
      )}
    >
      {tab === 'overview' && (
        <div className="fixed left-1/2 top-4 z-50 w-[min(94vw,540px)] -translate-x-1/2">
          {showTodayNotice ? (
            <Card className="border-primary/20 bg-background/95 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-background/80">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] md:text-xs text-muted-foreground">한국시간 {kstLabel} 기준</p>
                    <p className="text-sm md:text-base font-bold">오늘 입실/퇴실 안내</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 gap-1.5"
                      disabled={syncStatusesMutation.isPending}
                      onClick={() => syncStatusesMutation.mutate()}
                    >
                      <RefreshCw className={cn('h-3.5 w-3.5', syncStatusesMutation.isPending && 'animate-spin')} />
                      {syncStatusesMutation.isPending ? '업데이트 중' : '데이터 업데이트'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5"
                      onClick={() => setShowTodayNotice(false)}
                    >
                      <EyeOff className="h-3.5 w-3.5" />
                      숨기기
                    </Button>
                  </div>
                </div>

                {syncFeedback && (
                  <div
                    className={cn(
                      'mt-2 rounded-lg border px-3 py-2 text-xs',
                      syncFeedback.type === 'success'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        : 'border-red-200 bg-red-50 text-red-800'
                    )}
                  >
                    {syncFeedback.message}
                  </div>
                )}

                {syncResult && (
                  <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
                    <p className="text-xs font-semibold text-rose-900">퇴실 대상 업데이트 안내</p>
                    {syncResult.completed_count > 0 ? (
                      <>
                        <p className="mt-1 text-xs text-rose-800">
                          데이터 업데이트 시 아래 산모를 퇴실완료 처리했습니다.
                        </p>
                        <div className="mt-2 max-h-[116px] overflow-y-auto space-y-1 pr-1">
                          {syncResult.completed.map((stay) => (
                            <div
                              key={`completed-${stay.id}`}
                              className="rounded border border-rose-200 bg-white/70 px-2 py-1 text-xs text-rose-900"
                            >
                              {stay.room_number}호 {stay.mother_name} 산모 ({formatShortDate(stay.check_out_date)} 퇴실)
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="mt-1 text-xs text-rose-800">
                        이번 업데이트에서 퇴실완료 처리된 산모가 없습니다.
                      </p>
                    )}
                  </div>
                )}

                <div className="mt-3 max-h-[32vh] overflow-y-auto space-y-2 pr-1">
                  {todayCheckInList.length > 0 ? (
                    todayCheckInList.map((stay) => (
                      <div
                        key={`in-${stay.id}`}
                        className="rounded-lg border border-blue-200 bg-blue-50/70 px-3 py-2 text-sm text-blue-900"
                      >
                        <span className="inline-flex items-center gap-1.5 font-medium">
                          <LogIn className="h-4 w-4" />
                          오늘은 {stay.room_number}호 {stay.mother_name} 산모가 입실 예정입니다.
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
                      오늘은 입실 예정인 산모가 없습니다.
                    </div>
                  )}

                  {todayCheckOutList.length > 0 ? (
                    todayCheckOutList.map((stay) => (
                      <div
                        key={`out-${stay.id}`}
                        className="rounded-lg border border-rose-200 bg-rose-50/70 px-3 py-2 text-sm text-rose-900"
                      >
                        <span className="inline-flex items-center gap-1.5 font-medium">
                          <LogOut className="h-4 w-4" />
                          오늘은 {stay.room_number}호 {stay.mother_name} 산모가 퇴실 예정입니다.
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
                      오늘은 퇴실 예정인 산모가 없습니다.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex justify-center">
              <Button
                type="button"
                variant="secondary"
                className="h-9 gap-1.5 rounded-full border shadow-md"
                onClick={() => setShowTodayNotice(true)}
              >
                <Eye className="h-4 w-4" />
                오늘 입실/퇴실 보기
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <TabsList className="h-10 w-fit">
          <TabsTrigger value="overview" className="px-5">객실 현황</TabsTrigger>
          <TabsTrigger value="history" className="px-5">과거 데이터</TabsTrigger>
        </TabsList>

        {tab === 'overview' && (
          <div className="grid grid-cols-2 gap-2 w-full md:w-auto">
            {isLoading ? (
              <>
                <Skeleton className="h-14 rounded-xl md:min-w-[146px]" />
                <Skeleton className="h-14 rounded-xl md:min-w-[146px]" />
              </>
            ) : (
              <>
                <SecondaryStatCard
                  title="내일 입실"
                  value={tomorrowCheckIn}
                  onClick={() => handleStatCardClick('tomorrowCheckIn')}
                  className="md:min-w-[146px]"
                />
                <SecondaryStatCard
                  title="내일 퇴실"
                  value={tomorrowCheckOut}
                  onClick={() => handleStatCardClick('tomorrowCheckOut')}
                  className="md:min-w-[146px]"
                />
              </>
            )}
          </div>
        )}
      </div>

      <TabsContent value="overview" className="mt-0 space-y-6">
        {isLoading ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-52 rounded-2xl" />)}
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <PrimaryStatCard
                title="입실"
                subtitle="오늘"
                value={todayCheckIn}
                icon={<LogIn className="h-5 w-5" />}
                tone="blue"
                onClick={() => handleStatCardClick('todayCheckIn')}
              />
              <PrimaryStatCard
                title="퇴실"
                subtitle="오늘"
                value={todayCheckOut}
                icon={<LogOut className="h-5 w-5" />}
                tone="red"
                onClick={() => handleStatCardClick('todayCheckOut')}
              />
              <PrimaryStatCard
                title="신생아"
                value={totalNewborns}
                icon={<Baby className="h-5 w-5" />}
                tone="emerald"
                onClick={() => handleStatCardClick('newborns')}
              />
              <PrimaryStatCard
                title="산모"
                value={totalMothers}
                icon={<Users className="h-5 w-5" />}
                tone="amber"
                onClick={() => handleStatCardClick('mothers')}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {['All', 'Prestige', 'VIP', 'VVIP', 'CheckOut'].map((item) => (
                <Button
                  key={item}
                  variant={filter === item ? 'default' : 'outline'}
                  size="sm"
                  className="rounded-full px-4"
                  onClick={() => setFilter(item as 'All' | 'Prestige' | 'VIP' | 'VVIP' | 'CheckOut')}
                >
                  {item === 'All' ? '전체' : item === 'CheckOut' ? '퇴실임박' : item}
                </Button>
              ))}
            </div>

            {rooms5F.length > 0 && (
              <RoomFloorSection
                title="Prestige & VIP"
                floorLabel="5F"
                rooms={rooms5F}
                onRoomClick={handleRoomClick}
                draggingRoomNumber={draggingRoomNumber}
                dragOverRoomNumber={dragOverRoomNumber}
                isRoomMoving={roomTransferMutation.isPending}
                onRoomDragStart={handleRoomDragStart}
                onRoomDragOver={handleRoomDragOver}
                onRoomDrop={handleRoomDrop}
                onRoomDragEnd={handleRoomDragEnd}
              />
            )}

            {rooms6F.length > 0 && (
              <RoomFloorSection
                title="VIP & VVIP"
                floorLabel="6F"
                rooms={rooms6F}
                onRoomClick={handleRoomClick}
                draggingRoomNumber={draggingRoomNumber}
                dragOverRoomNumber={dragOverRoomNumber}
                isRoomMoving={roomTransferMutation.isPending}
                onRoomDragStart={handleRoomDragStart}
                onRoomDragOver={handleRoomDragOver}
                onRoomDrop={handleRoomDrop}
                onRoomDragEnd={handleRoomDragEnd}
              />
            )}
          </>
        )}

        {selectedRoom && (
          <StayFormDrawer
            open={drawerOpen}
            onOpenChange={setDrawerOpen}
            roomNumber={selectedRoom}
            activeStay={selectedRoomData?.active_stay}
            upcomingStays={selectedRoomData?.upcoming_stays || []}
          />
        )}

        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="sm:max-w-2xl p-0">
            <DialogHeader className="px-6 pt-6">
              <DialogTitle className="text-xl flex items-center gap-2">
                <CalendarRange className="h-5 w-5" />
                {statDialogData.title}
              </DialogTitle>
              <DialogDescription>{statDialogData.description}</DialogDescription>
            </DialogHeader>

            <div className="px-6 pb-6">
              {statDialogData.stays.length === 0 ? (
                <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
                  해당 내역이 없습니다.
                </div>
              ) : (
                <div className="max-h-[58vh] overflow-y-auto pr-1 space-y-2">
                  {statDialogData.stays.map((stay) => {
                    const displayBabies = getDisplayBabies(stay)
                    const nameSummary = getBabyNameSummary(displayBabies)
                    const weightSummary = getBabyWeightSummary(displayBabies)

                    return (
                      <div
                        key={stay.id}
                        className="rounded-xl border bg-muted/20 px-3 py-3 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{stay.room_number}호</Badge>
                            <span className="font-semibold truncate">{stay.mother_name}</span>
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span>태명: {nameSummary || '-'}</span>
                            <span>몸무게: {weightSummary || '-'}</span>
                            <span>입실: {formatShortDate(stay.check_in_date)}</span>
                            <span>퇴실: {formatShortDate(stay.check_out_date)}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] text-muted-foreground">신생아</p>
                          <p className="text-xl font-extrabold leading-none">{stay.baby_count}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </TabsContent>

      <TabsContent value="history" className="mt-0">
        <StayHistoryView />
      </TabsContent>
    </Tabs>
  )
}

function PrimaryStatCard({
  title,
  subtitle,
  value,
  icon,
  tone,
  onClick
}: {
  title: string
  subtitle?: string
  value: number
  icon: React.ReactNode
  tone: 'blue' | 'red' | 'emerald' | 'amber'
  onClick?: () => void
}) {
  const toneClass = {
    blue: 'from-sky-500/20 to-blue-500/5 text-sky-700 border-sky-200',
    red: 'from-rose-500/20 to-red-500/5 text-rose-700 border-rose-200',
    emerald: 'from-emerald-500/20 to-teal-500/5 text-emerald-700 border-emerald-200',
    amber: 'from-amber-500/20 to-yellow-500/5 text-amber-700 border-amber-200'
  }[tone]

  return (
    <Card
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (!onClick) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      className={cn(
        'border bg-gradient-to-br shadow-sm',
        toneClass,
        onClick && 'cursor-pointer transition-transform hover:-translate-y-0.5 hover:shadow-md'
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">{title}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="rounded-full bg-white/70 p-2">{icon}</div>
        </div>
        <p className="mt-5 text-4xl md:text-5xl font-black tracking-tight leading-none">{value}</p>
      </CardContent>
    </Card>
  )
}

function SecondaryStatCard({
  title,
  value,
  onClick,
  className
}: {
  title: string
  value: number
  onClick?: () => void
  className?: string
}) {
  return (
    <Card
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (!onClick) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      className={cn(
        'border-dashed bg-muted/20',
        className,
        onClick && 'cursor-pointer transition-transform hover:-translate-y-0.5 hover:shadow-sm'
      )}
    >
      <CardContent className="px-4 py-3 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{title}</span>
        <span className="text-2xl font-extrabold">{value}</span>
      </CardContent>
    </Card>
  )
}

function RoomFloorSection({
  title,
  floorLabel,
  rooms,
  onRoomClick,
  draggingRoomNumber,
  dragOverRoomNumber,
  isRoomMoving,
  onRoomDragStart,
  onRoomDragOver,
  onRoomDrop,
  onRoomDragEnd
}: {
  title: string
  floorLabel: string
  rooms: Room[]
  onRoomClick: (roomNumber: string) => void
  draggingRoomNumber: string | null
  dragOverRoomNumber: string | null
  isRoomMoving: boolean
  onRoomDragStart: (room: Room, event: DragEvent<HTMLDivElement>) => void
  onRoomDragOver: (targetRoomNumber: string, event: DragEvent<HTMLDivElement>) => void
  onRoomDrop: (targetRoomNumber: string, event: DragEvent<HTMLDivElement>) => void
  onRoomDragEnd: () => void
}) {
  return (
    <section className="space-y-4">
      <h3 className="text-xl font-bold flex items-center gap-2">
        <span className="rounded-full bg-primary/10 text-primary px-3 py-1 text-sm">{floorLabel}</span>
        <span>{title}</span>
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {rooms.map((room) => (
          <RoomCard
            key={room.id}
            room={room}
            onClick={() => onRoomClick(room.number)}
            canDrag={Boolean(room.activeStayId)}
            isDraggingAny={Boolean(draggingRoomNumber)}
            isDragSource={draggingRoomNumber === room.number}
            isDragOver={dragOverRoomNumber === room.number}
            isRoomMoving={isRoomMoving}
            onDragStart={(event) => onRoomDragStart(room, event)}
            onDragOver={(event) => onRoomDragOver(room.number, event)}
            onDrop={(event) => onRoomDrop(room.number, event)}
            onDragEnd={onRoomDragEnd}
          />
        ))}
      </div>
    </section>
  )
}

function DateTile({
  label,
  date,
  emphasis
}: {
  label: string
  date?: string
  emphasis?: 'red' | 'yellow'
}) {
  return (
    <div
      className={cn(
        'rounded-xl border p-2',
        emphasis === 'red' && 'border-red-300 bg-red-50/70',
        emphasis === 'yellow' && 'border-yellow-300 bg-yellow-50/70'
      )}
    >
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold">{formatShortDate(date)}</p>
    </div>
  )
}

function InfoChip({
  label,
  value,
  tone = 'neutral'
}: {
  label: string
  value?: string | null
  tone?: ChipTone
}) {
  return (
    <div className={cn(
      'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs',
      getChipToneClass(tone)
    )}>
      <span className="opacity-70">{label}</span>
      <span className="font-medium truncate max-w-[220px]">{value && value.trim() !== '' ? value : '-'}</span>
    </div>
  )
}

function RoomCard({
  room,
  onClick,
  canDrag = false,
  isDraggingAny = false,
  isDragSource = false,
  isDragOver = false,
  isRoomMoving = false,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd
}: {
  room: Room
  onClick?: () => void
  canDrag?: boolean
  isDraggingAny?: boolean
  isDragSource?: boolean
  isDragOver?: boolean
  isRoomMoving?: boolean
  onDragStart?: (event: DragEvent<HTMLDivElement>) => void
  onDragOver?: (event: DragEvent<HTMLDivElement>) => void
  onDrop?: (event: DragEvent<HTMLDivElement>) => void
  onDragEnd?: () => void
}) {
  const hasUpcoming = room.upcomingStays.length > 0
  const isEmpty = room.status === 'Empty'
  const nextUpcoming = room.upcomingStays[0]
  const displayBabies = getDisplayBabies({
    baby_count: room.babyCount,
    baby_names: room.babyNames,
    baby_profiles: room.babyProfiles,
    gender: room.gender,
    baby_weight: room.babyWeight
  })
  const babyNameValue = getBabyNameSummary(displayBabies)
  const babyGenderValue = getBabyGenderSummary(displayBabies, room.gender)
  const babyWeightValue = getBabyWeightSummary(displayBabies)
  const babyTone = getChipToneFromGender(babyGenderValue)

  const checkoutBadge =
    room.checkOutDday === 0 ? 'D-Day' :
    room.checkOutDday === 1 ? 'D-1' :
    room.checkOutDday === 2 ? 'D-2' :
    null

  return (
    <Card
      draggable={canDrag && !isRoomMoving}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onClick={() => {
        if (isDraggingAny || isRoomMoving) return
        onClick?.()
      }}
      className={cn(
        'group cursor-pointer border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
        canDrag && !isRoomMoving && 'cursor-grab active:cursor-grabbing',
        isDragSource && 'opacity-55 ring-2 ring-primary/30',
        isDragOver && 'ring-2 ring-blue-300 border-blue-300 bg-blue-50/40',
        checkoutBadge === 'D-Day' && 'border-red-300 bg-red-50/40',
        checkoutBadge === 'D-1' && 'border-red-200',
        checkoutBadge === 'D-2' && 'border-yellow-200',
        isEmpty && !hasUpcoming && 'border-dashed bg-muted/20'
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="text-2xl font-black tracking-tight leading-none">{room.number}</div>
            <Badge variant="secondary">{room.type}</Badge>
            {canDrag && (
              <Badge variant="outline" className="h-6 px-2 text-[10px] text-muted-foreground">
                <GripVertical className="mr-1 h-3 w-3" />
                드래그 이동
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Badge variant={isEmpty ? 'outline' : 'default'}>
              {isEmpty ? '비어있음' : '입실중'}
            </Badge>
            {checkoutBadge && (
              <Badge className={cn(
                checkoutBadge === 'D-Day' && 'bg-red-600 text-white',
                checkoutBadge === 'D-1' && 'bg-red-100 text-red-700 hover:bg-red-100',
                checkoutBadge === 'D-2' && 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100'
              )}>
                {checkoutBadge}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {isEmpty ? (
          <div className="min-h-[150px] flex flex-col items-center justify-center rounded-xl border border-dashed bg-background/60 px-3 text-center">
            <BedDouble className="h-5 w-5 text-muted-foreground mb-2" />
            {!hasUpcoming || !nextUpcoming ? (
              <p className="text-sm text-muted-foreground">현재 비어있는 객실</p>
            ) : (
              <div className="space-y-2 w-full">
                <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">다음 입실 예정</p>
                <p className="text-base font-semibold">{nextUpcoming.mother_name}</p>
                <div className="flex items-center justify-center gap-2 text-xs">
                  <Badge variant="outline">입실 {formatShortDate(nextUpcoming.check_in_date)}</Badge>
                  <Badge variant="outline">퇴실 {formatShortDate(nextUpcoming.check_out_date)}</Badge>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3 min-h-[150px]">
            <div>
              <p className="text-[11px] text-muted-foreground">산모명</p>
              <p className="text-lg font-bold leading-tight">{room.motherName}</p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <InfoChip label="태명" value={babyNameValue} tone={babyTone} />
              <InfoChip label="성별" value={babyGenderValue} tone={babyTone} />
              <InfoChip label="몸무게" value={babyWeightValue} tone={babyTone} />
              <InfoChip label="출산병원" value={room.birthHospital} tone="neutral" />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <DateTile label="입실일" date={room.checkInDate} />
              <DateTile
                label="퇴실일"
                date={room.checkOutDate}
                emphasis={
                  room.checkOutDday === 0 ? 'red'
                    : room.checkOutDday === 1 || room.checkOutDday === 2 ? 'yellow'
                    : undefined
                }
              />
              <DateTile label="교육일" date={room.eduDate} />
            </div>

            {hasUpcoming && nextUpcoming && (
              <div className="rounded-lg bg-blue-50 border border-blue-200 px-2.5 py-2 text-xs text-blue-700">
                다음 입실: {nextUpcoming.mother_name} ({formatShortDate(nextUpcoming.check_in_date)})
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
