import type { MobileDayStatus } from './types'

export const getStatusLabel = (status: MobileDayStatus) => {
  if (status === 'danger') return '부족'
  if (status === 'caution') return '주의'
  return '적정'
}

export const getStatusBadgeClass = (status: MobileDayStatus) => {
  if (status === 'danger') return 'bg-red-100 text-red-700 border-red-200'
  if (status === 'caution') return 'bg-amber-100 text-amber-700 border-amber-200'
  return 'bg-emerald-100 text-emerald-700 border-emerald-200'
}

export const getStatusSurfaceClass = (status: MobileDayStatus) => {
  if (status === 'danger') return 'border-red-200 bg-red-50/40'
  if (status === 'caution') return 'border-amber-200 bg-amber-50/40'
  return 'border-emerald-200 bg-emerald-50/40'
}
