export type FloorKey = '5F' | '6F'

export type RoomType = 'Prestige' | 'VIP' | 'VVIP'

export type RoomStatus = 'Empty' | 'Occupied'

export interface FloorplanUpcomingStay {
  id: string
  room_number: string
  mother_name: string
  check_in_date: string
  check_out_date: string
  status: 'upcoming' | 'active' | 'completed'
}

export interface FloorplanRoom {
  id: string
  number: string
  type: RoomType
  status: RoomStatus
  activeStayId?: string
  motherName?: string
  babyCount?: number
  checkInDate?: string
  checkOutDate?: string
  eduDate?: string
  checkOutDday?: number
  upcomingStays: FloorplanUpcomingStay[]
}

export type RoomFilter = 'All' | 'Prestige' | 'VIP' | 'VVIP' | 'CheckOut'
