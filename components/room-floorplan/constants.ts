import type { FloorKey, RoomFilter, RoomType } from '@/components/room-floorplan/types'

export const EXCLUDED_ROOM_NUMBERS = new Set(['504', '604'])

export const FLOORPLAN_LAYOUT: Record<FloorKey, { topLine: string[]; bottomLine: string[] }> = {
  '5F': {
    topLine: ['501', '502'],
    bottomLine: ['503', '505', '506', '507', '508'],
  },
  '6F': {
    topLine: ['607', '608', '609', '610', '611'],
    bottomLine: ['601', '602', '603', '605', '606'],
  },
}

export const ROOM_FILTER_OPTIONS: Array<{ key: RoomFilter; label: string }> = [
  { key: 'All', label: '전체' },
  { key: 'Prestige', label: 'Prestige' },
  { key: 'VIP', label: 'VIP' },
  { key: 'VVIP', label: 'VVIP' },
  { key: 'CheckOut', label: '퇴실임박' },
]

export function getRoomTypeByNumber(roomNumber: string): RoomType {
  if (roomNumber === '501' || roomNumber === '502') return 'Prestige'

  const parsed = Number(roomNumber)
  if (Number.isFinite(parsed) && parsed >= 607 && parsed <= 611) return 'VVIP'

  return 'VIP'
}

export function getFloorFromRoomNumber(roomNumber: string): FloorKey | null {
  if (roomNumber.startsWith('5')) return '5F'
  if (roomNumber.startsWith('6')) return '6F'
  return null
}
