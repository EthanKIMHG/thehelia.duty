import type { FloorKey, RoomFilter, RoomType } from '@/components/room-floorplan/types'

export const EXCLUDED_ROOM_NUMBERS = new Set(['504', '604'])

export const OFFICE_SLOT = '__OFFICE__'

export const FLOORPLAN_LAYOUT: Record<FloorKey, { leftLine: string[]; rightLine: string[] }> = {
  '5F': {
    leftLine: ['502', '501', OFFICE_SLOT],
    rightLine: ['508', '507', '506', '505', '503'],
  },
  '6F': {
    leftLine: ['606', '605', '603', '602', '601'],
    rightLine: ['611', '610', '609', '608', '607'],
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
