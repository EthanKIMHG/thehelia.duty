'use client'

import { AppConfirmDialog } from '@/components/app-confirm-dialog'
import {
  EXCLUDED_ROOM_NUMBERS,
  getFloorFromRoomNumber,
  getRoomTypeByNumber,
  RoomFloorplanBoard,
  RoomFloorplanSkeleton,
  RoomStatusLegend,
  ROOM_FILTER_OPTIONS,
  type FloorplanRoom,
  type RoomFilter,
} from '@/components/room-floorplan'
import { StayFormDrawer } from '@/components/stay-form-drawer'
import { StayHistoryView } from '@/components/stay-history-view'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { authFetch } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addDays, differenceInDays, format, parseISO } from 'date-fns'
import { Baby, CalendarRange, Eye, EyeOff, LogIn, LogOut, RefreshCw, Users } from 'lucide-react'
import { useEffect, useMemo, useState, type DragEvent } from 'react'

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

type Room = FloorplanRoom

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

interface PendingRoomTransfer {
  sourceRoomNumber: string
  targetRoomNumber: string
  sourceMotherName: string
  targetMotherName: string
  isSwap: boolean
}

type StatCardType =
  | 'todayCheckIn'
  | 'todayCheckOut'
  | 'newborns'
  | 'mothers'
  | 'tomorrowCheckIn'
  | 'tomorrowCheckOut'

const FINE_POINTER_MEDIA_QUERY = '(any-pointer: fine) and (any-hover: hover)'

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

const formatDetailDate = (value?: string) => {
  if (!value) return '-'
  const parsed = parseISO(value)
  if (Number.isNaN(parsed.getTime())) return value
  return format(parsed, 'yyyy.MM.dd')
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

const getBabyGenderSummary = (babies: Array<{ gender?: string | null }>) => {
  const values = babies
    .map((baby, idx) => {
      const value = baby.gender?.trim()
      if (!value) return ''
      return babies.length > 1 ? `아기${idx + 1} ${value}` : value
    })
    .filter((value) => value !== '')

  return values.join(', ')
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
  const { toast } = useToast()
  const [tab, setTab] = useState<'overview' | 'history'>('overview')
  const [filter, setFilter] = useState<RoomFilter>('All')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedStat, setSelectedStat] = useState<StatCardType>('todayCheckIn')
  const [showTodayNotice, setShowTodayNotice] = useState(true)
  const [draggingRoomNumber, setDraggingRoomNumber] = useState<string | null>(null)
  const [dragOverRoomNumber, setDragOverRoomNumber] = useState<string | null>(null)
  const [isFinePointerDevice, setIsFinePointerDevice] = useState<boolean | null>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null
    return window.matchMedia(FINE_POINTER_MEDIA_QUERY).matches
  })
  const [pendingRoomTransfer, setPendingRoomTransfer] = useState<PendingRoomTransfer | null>(null)
  const [isTransferConfirmOpen, setIsTransferConfirmOpen] = useState(false)
  const [syncFeedback, setSyncFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)
  const [syncResult, setSyncResult] = useState<SyncStatusResponse | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return

    const mediaQuery = window.matchMedia(FINE_POINTER_MEDIA_QUERY)
    const update = () => setIsFinePointerDevice(mediaQuery.matches)
    update()

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', update)
      return () => mediaQuery.removeEventListener('change', update)
    }

    mediaQuery.addListener(update)
    return () => mediaQuery.removeListener(update)
  }, [])

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
  const kstLabel = todayStr.replace(/-/g, '.')
  const todayBase = parseISO(todayStr)

  const rooms: Room[] = (roomsFromAPI || [])
    .filter((room) => !EXCLUDED_ROOM_NUMBERS.has(room.room_number))
    .map((room) => {
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
        type: getRoomTypeByNumber(room.room_number),
        status,
        activeStayId: stay?.id,
        motherName: stay?.mother_name,
        babyCount: stay?.baby_count,
        babyNames: stay?.baby_names || [],
        babyProfiles: stay?.baby_profiles || null,
        gender: stay?.gender || null,
        babyWeight: stay?.baby_weight ?? null,
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

  const rooms5F = filteredRooms.filter((room) => getFloorFromRoomNumber(room.number) === '5F')
  const rooms6F = filteredRooms.filter((room) => getFloorFromRoomNumber(room.number) === '6F')

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
      toast({
        title: '객실 변경 완료',
        description: summary,
        duration: 3000,
      })
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: '객실 변경 실패',
        description: error instanceof Error ? error.message : '객실 변경 중 오류가 발생했습니다.',
        duration: 5000,
      })
    },
    onSettled: () => {
      setDraggingRoomNumber(null)
      setDragOverRoomNumber(null)
      setPendingRoomTransfer(null)
    }
  })

  const handleRoomDragStart = (room: Room, event: DragEvent<HTMLDivElement>) => {
    if (isFinePointerDevice !== true || roomTransferMutation.isPending || !room.activeStayId) {
      event.preventDefault()
      return
    }

    setDraggingRoomNumber(room.number)
    setDragOverRoomNumber(null)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', room.number)
  }

  const handleRoomDragOver = (targetRoomNumber: string, event: DragEvent<HTMLDivElement>) => {
    if (isFinePointerDevice !== true || !draggingRoomNumber || draggingRoomNumber === targetRoomNumber) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDragOverRoomNumber(targetRoomNumber)
  }

  const handleRoomDrop = (targetRoomNumber: string, event: DragEvent<HTMLDivElement>) => {
    if (isFinePointerDevice !== true) return
    event.preventDefault()
    const sourceRoomNumber = draggingRoomNumber || event.dataTransfer.getData('text/plain')
    if (!sourceRoomNumber || sourceRoomNumber === targetRoomNumber) {
      setDragOverRoomNumber(null)
      return
    }
    const sourceRoom = rooms.find((room) => room.number === sourceRoomNumber)
    const targetRoom = rooms.find((room) => room.number === targetRoomNumber)
    if (!sourceRoom?.activeStayId) {
      setDragOverRoomNumber(null)
      return
    }

    setPendingRoomTransfer({
      sourceRoomNumber,
      targetRoomNumber,
      sourceMotherName: sourceRoom.motherName || '산모',
      targetMotherName: targetRoom?.motherName || '산모',
      isSwap: Boolean(targetRoom?.activeStayId),
    })
    setIsTransferConfirmOpen(true)
    setDraggingRoomNumber(null)
    setDragOverRoomNumber(null)
  }

  const handleRoomDragEnd = () => {
    if (roomTransferMutation.isPending) return
    setDraggingRoomNumber(null)
    setDragOverRoomNumber(null)
  }

  const handleConfirmRoomTransfer = () => {
    if (!pendingRoomTransfer) return
    setIsTransferConfirmOpen(false)
    roomTransferMutation.mutate({
      sourceRoomNumber: pendingRoomTransfer.sourceRoomNumber,
      targetRoomNumber: pendingRoomTransfer.targetRoomNumber,
    })
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
            <div className="flex flex-col gap-3 rounded-2xl border border-[hsl(var(--fp-border))] bg-[hsl(var(--fp-surface))] p-4">
              <div className="flex flex-wrap items-center gap-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-8 w-20 rounded-full" />
                ))}
              </div>
              <Skeleton className="h-5 w-72 rounded-full" />
            </div>
            <div className="space-y-3">
              <RoomFloorplanSkeleton mode="board" />
              <RoomFloorplanSkeleton mode="board" />
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

            <div className="flex flex-col gap-3 rounded-2xl border border-[hsl(var(--fp-border))] bg-[hsl(var(--fp-surface))] p-4">
              <div className="flex flex-wrap gap-2">
                {ROOM_FILTER_OPTIONS.map((item) => (
                  <Button
                    key={item.key}
                    variant={filter === item.key ? 'default' : 'outline'}
                    size="sm"
                    className="rounded-full px-4"
                    onClick={() => setFilter(item.key)}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {isFinePointerDevice === true
                  ? '한 화면에서 5F/6F를 모두 확인하며 객실 카드를 드래그해 층간 이동/스왑할 수 있습니다.'
                  : '모바일에서는 드래그 이동이 비활성화되며, 객실 카드를 탭해 상세를 편집합니다.'}
              </p>
            </div>

            <div className="space-y-4">
              <RoomFloorplanBoard
                floor="5F"
                rooms={rooms5F}
                allowDrag={isFinePointerDevice === true}
                onRoomClick={handleRoomClick}
                draggingRoomNumber={draggingRoomNumber}
                dragOverRoomNumber={dragOverRoomNumber}
                isRoomMoving={roomTransferMutation.isPending}
                onRoomDragStart={handleRoomDragStart}
                onRoomDragOver={handleRoomDragOver}
                onRoomDrop={handleRoomDrop}
                onRoomDragEnd={handleRoomDragEnd}
              />

              <RoomFloorplanBoard
                floor="6F"
                rooms={rooms6F}
                allowDrag={isFinePointerDevice === true}
                onRoomClick={handleRoomClick}
                draggingRoomNumber={draggingRoomNumber}
                dragOverRoomNumber={dragOverRoomNumber}
                isRoomMoving={roomTransferMutation.isPending}
                onRoomDragStart={handleRoomDragStart}
                onRoomDragOver={handleRoomDragOver}
                onRoomDrop={handleRoomDrop}
                onRoomDragEnd={handleRoomDragEnd}
              />
            </div>

            <div className="grid gap-3 lg:grid-cols-[1fr_1.1fr]">
              <RoomStatusLegend />
              <section className="rounded-2xl border border-[hsl(var(--fp-border))] bg-[hsl(var(--fp-surface))] p-4">
                <h4 className="text-sm font-semibold">빠른 안내</h4>
                <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                  <li>객실 카드 클릭 시 기존 상세 편집 시트가 열립니다.</li>
                  <li>결번 객실(504, 604)은 레이아웃에서 제외되었습니다.</li>
                  <li>5F와 6F가 한 페이지에 동시에 노출되어 층간 드래그 이동/스왑이 가능합니다.</li>
                </ul>
              </section>
            </div>
          </>
        )}

        <AppConfirmDialog
          open={isTransferConfirmOpen && Boolean(pendingRoomTransfer)}
          title={pendingRoomTransfer?.isSwap ? '객실 스왑을 실행하시겠습니까?' : '객실 이동을 실행하시겠습니까?'}
          description={
            pendingRoomTransfer
              ? pendingRoomTransfer.isSwap
                ? `${pendingRoomTransfer.sourceRoomNumber}호(${pendingRoomTransfer.sourceMotherName})와 ${pendingRoomTransfer.targetRoomNumber}호(${pendingRoomTransfer.targetMotherName})의 입실 정보를 맞교환합니다.`
                : `${pendingRoomTransfer.sourceRoomNumber}호(${pendingRoomTransfer.sourceMotherName})를 ${pendingRoomTransfer.targetRoomNumber}호로 이동합니다.`
              : '선택한 객실 변경 작업을 적용합니다.'
          }
          confirmLabel={pendingRoomTransfer?.isSwap ? '스왑 실행' : '이동 실행'}
          confirmDisabled={roomTransferMutation.isPending}
          onOpenChange={(open) => {
            setIsTransferConfirmOpen(open)
            if (!open) setPendingRoomTransfer(null)
          }}
          onCancel={() => {
            setPendingRoomTransfer(null)
            setDragOverRoomNumber(null)
          }}
          onConfirm={handleConfirmRoomTransfer}
        />

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
                    const genderSummary = getBabyGenderSummary(displayBabies)
                    const weightSummary = getBabyWeightSummary(displayBabies)

                    return (
                      <div
                        key={stay.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <Badge variant="secondary">{stay.room_number}호</Badge>
                            <span className="truncate text-base font-bold text-slate-900">{stay.mother_name}</span>
                          </div>
                          <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                            신생아 {stay.baby_count}명
                          </Badge>
                        </div>

                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <section className="rounded-xl border border-slate-200 bg-white p-3">
                            <p className="text-xs font-semibold text-slate-500">산모 정보</p>
                            <dl className="mt-2 grid grid-cols-[52px_1fr] gap-x-2 gap-y-1.5 text-sm">
                              <dt className="text-slate-500">성함</dt>
                              <dd className="font-semibold text-slate-900">{stay.mother_name || '-'}</dd>
                              <dt className="text-slate-500">입실일</dt>
                              <dd className="font-medium text-slate-800">{formatDetailDate(stay.check_in_date)}</dd>
                              <dt className="text-slate-500">퇴실일</dt>
                              <dd className="font-medium text-slate-800">{formatDetailDate(stay.check_out_date)}</dd>
                              <dt className="text-slate-500">교육일</dt>
                              <dd className="font-medium text-slate-800">{formatDetailDate(stay.edu_date)}</dd>
                            </dl>
                          </section>

                          <section className="rounded-xl border border-slate-200 bg-white p-3">
                            <p className="text-xs font-semibold text-slate-500">신생아 정보</p>
                            <dl className="mt-2 grid grid-cols-[52px_1fr] gap-x-2 gap-y-1.5 text-sm">
                              <dt className="text-slate-500">이름</dt>
                              <dd className="font-medium text-slate-800">{nameSummary || '-'}</dd>
                              <dt className="text-slate-500">성별</dt>
                              <dd className="font-medium text-slate-800">{genderSummary || '-'}</dd>
                              <dt className="text-slate-500">몸무게</dt>
                              <dd className="font-medium text-slate-800">{weightSummary || '-'}</dd>
                            </dl>
                          </section>
                        </div>

                        <div className="mt-3 space-y-2">
                          {displayBabies.map((baby, index) => (
                            <div
                              key={`${stay.id}-baby-${index}`}
                              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                            >
                              <div className="grid grid-cols-[64px_1fr] items-center gap-x-2 gap-y-1.5 sm:grid-cols-[56px_1fr_72px_78px] sm:gap-y-0">
                                <span className="font-semibold text-slate-500">아기 {index + 1}</span>
                                <span className="truncate font-semibold text-slate-900">{baby.name?.trim() || '-'}</span>
                                <span className="text-slate-700 sm:text-right">{baby.gender?.trim() || '-'}</span>
                                <span className="font-medium text-slate-700 sm:text-right">{formatWeight(baby.weight)}</span>
                              </div>
                            </div>
                          ))}
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
