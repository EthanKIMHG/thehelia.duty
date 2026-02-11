'use client'

import { StayFormDrawer } from '@/components/stay-form-drawer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { authFetch } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { differenceInDays, parseISO, startOfDay } from 'date-fns'
import { AlertCircle } from 'lucide-react'
import { useState } from 'react'

interface Stay {
  id: string
  room_number: string
  mother_name: string
  baby_count: number
  baby_names?: string[]
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
  current_stay: Stay | null // backward compatibility
}

interface Room {
  id: string
  number: string
  type: 'Prestige' | 'VIP' | 'VVIP'
  status: 'Empty' | 'Occupied' | 'CheckOut' | 'Reserved'
  motherName?: string
  babyCount?: number
  babyNames?: string[]
  memo?: string
  checkOutDday?: number
  allergies?: string[]
  upcomingStays?: Stay[]
}

export function RoomView() {
  const [filter, setFilter] = useState<'All' | 'Prestige' | 'VIP' | 'VVIP' | 'CheckOut'>('All')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null)

  const { data: roomsFromAPI, isLoading } = useQuery<RoomFromAPI[]>({
    queryKey: ['rooms'],
    queryFn: async () => {
      const res = await authFetch('/api/rooms')
      if (!res.ok) throw new Error('Failed to fetch rooms')
      return res.json()
    }
  })

  // Fetch daily stats from Supabase view
  const { data: dailyStats } = useQuery<{ total_newborns: number; total_mothers: number }>({
    queryKey: ['daily-stats'],
    queryFn: async () => {
      const res = await authFetch('/api/daily-stats')
      return res.json()
    }
  })

  const handleRoomClick = (roomNumber: string) => {
    setSelectedRoom(roomNumber)
    setDrawerOpen(true)
  }

  // Get selected room data for drawer
  const selectedRoomData = roomsFromAPI?.find(r => r.room_number === selectedRoom)

  // Transform API data to Room interface
  const rooms: Room[] = (roomsFromAPI || []).map((room) => {
    const stay = room.active_stay
    const today = new Date()
    
    let status: Room['status'] = 'Empty'
    let checkOutDday: number | undefined

    if (stay) {
      if (stay.status === 'active') {
        status = 'Occupied'
        const checkOutDate = parseISO(stay.check_out_date)
        const checkOutStart = startOfDay(checkOutDate)
        const todayStart = startOfDay(today)
        const daysUntilCheckout = differenceInDays(checkOutStart, todayStart)
        
        if (daysUntilCheckout >= 0 && daysUntilCheckout <= 2) {
          checkOutDday = daysUntilCheckout
        }
      } else if (stay.status === 'upcoming') {
        status = 'Reserved'
      } else if (stay.status === 'completed') {
        status = 'CheckOut'
      }
    }

    return {
      id: room.room_number,
      number: room.room_number,
      type: room.room_type,
      status,
      motherName: stay?.mother_name,
      babyCount: stay?.baby_count,
      babyNames: stay?.baby_names,
      memo: stay?.notes,
      checkOutDday,
      upcomingStays: room.upcoming_stays || []
    }
  })

  const filteredRooms = rooms.filter(room => {
    if (filter === 'All') return true
    if (filter === 'CheckOut') return room.status === 'CheckOut' || room.checkOutDday !== undefined
    return room.type === filter
  })

  const rooms5F = filteredRooms.filter(r => r.number.startsWith('5'))
  const rooms6F = filteredRooms.filter(r => r.number.startsWith('6'))

  // Stats - use daily_stats view for newborns
  const totalNewborns = dailyStats?.total_newborns || 0
  const totalMothers = dailyStats?.total_mothers || rooms.filter(r => r.status === 'Occupied').length
  const todayCheckOut = rooms.filter(r => r.checkOutDday === 0).length
  const todayCheckIn = rooms.filter(r => r.status === 'Reserved').length

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="신생아" value={totalNewborns} />
        <StatCard title="산모" value={totalMothers} />
        <StatCard title="오늘 퇴실" value={todayCheckOut} highlight />
        <StatCard title="오늘 입실" value={todayCheckIn} highlight />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {['All', 'Prestige', 'VIP', 'VVIP', 'CheckOut'].map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f as any)}
          >
            {f === 'All' ? '전체' : f === 'CheckOut' ? '퇴실임박' : f}
          </Button>
        ))}
      </div>

      {/* 5F Section */}
      {rooms5F.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold flex items-center">
            <span className="bg-primary/10 text-primary px-2 py-1 rounded mr-2 text-base">5F</span>
            Prestige & VIP
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {rooms5F.map(room => (
              <RoomCard key={room.id} room={room} onClick={() => handleRoomClick(room.number)} />
            ))}
          </div>
        </div>
      )}

      {/* 6F Section */}
      {rooms6F.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold flex items-center">
            <span className="bg-primary/10 text-primary px-2 py-1 rounded mr-2 text-base">6F</span>
            VIP & VVIP
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {rooms6F.map(room => (
              <RoomCard key={room.id} room={room} onClick={() => handleRoomClick(room.number)} />
            ))}
          </div>
        </div>
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
    </div>
  )
}

function StatCard({ title, value, highlight }: { title: string, value: number, highlight?: boolean }) {
  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className={cn("text-2xl font-bold", highlight && "text-primary")}>{value}</div>
      </CardContent>
    </Card>
  )
}

function RoomCard({ room, onClick }: { room: Room; onClick?: () => void }) {
  const isDday0 = room.checkOutDday === 0
  const isDday1 = room.checkOutDday === 1
  const isDday2 = room.checkOutDday === 2
  const isCheckoutToday = room.status === 'CheckOut'
  const isEmpty = room.status === 'Empty'
  const hasUpcoming = room.upcomingStays && room.upcomingStays.length > 0

  // D-day badge
  const getDdayBadge = () => {
    if (isDday0) return <Badge className="bg-red-500 text-white hover:bg-red-500">D-Day</Badge>
    if (isDday1) return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">D-1</Badge>
    if (isDday2) return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">D-2</Badge>
    return null
  }

  return (
    <Card 
      onClick={onClick}
      className={cn(
        "relative overflow-hidden transition-all hover:shadow-md cursor-pointer",
        isDday0 && "border-red-200 border-2 bg-red-50/30",
        isDday1 && "border-red-200 border-2",
        isDday2 && "border-yellow-200 border-2",
        hasUpcoming && !room.motherName && "border-blue-200 border-2",
        isEmpty && !hasUpcoming && "bg-muted/30 border-dashed"
      )}>
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center space-x-2">
          <span className="font-bold text-lg">{room.number}</span>
          <Badge variant="secondary" className="text-xs font-normal">{room.type}</Badge>
        </div>
        {getDdayBadge()}
      </CardHeader>
      <CardContent className="p-4 pt-2 space-y-2">
        {isEmpty && !hasUpcoming ? (
          <div className="text-muted-foreground text-sm min-h-[60px] flex items-center justify-center">
            [ 비어있음 ]
          </div>
        ) : isEmpty && hasUpcoming ? (
          <div className="min-h-[60px] flex flex-col justify-center">
            <div className="text-muted-foreground text-sm text-center mb-2">[ 비어있음 ]</div>
            <div className="text-xs text-blue-600 font-medium">
              📅 입실예정: {room.upcomingStays![0].mother_name} ({room.upcomingStays![0].check_in_date})
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-start">
              <div className="font-medium text-lg">
                {isCheckoutToday ? '[ 퇴실 완료 ]' : `산모: ${room.motherName}`}
              </div>
            </div>
            
            {!isCheckoutToday && (
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                 아기: {room.babyCount}명
                 {room.babyNames && room.babyNames.some(n => n.trim() !== '') && (
                    <span className="ml-2">
                        태명: {room.babyNames.filter(n => n).join(', ')}
                    </span>
                 )}
              </div>
            )}

            {room.memo && (
              <div className="text-xs text-muted-foreground bg-muted p-1 rounded mt-1">
                메모: {room.memo}
              </div>
            )}

            {room.allergies && room.allergies.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-red-600 font-medium mt-1">
                <AlertCircle className="w-3 h-3" />
                알러지 ({room.allergies.join(', ')})
              </div>
            )}

            {/* Show upcoming stays in blue */}
            {hasUpcoming && (
              <div className="text-xs text-blue-600 font-medium mt-2 pt-2 border-t border-dashed">
                📅 다음 입실: {room.upcomingStays![0].mother_name} ({room.upcomingStays![0].check_in_date})
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
