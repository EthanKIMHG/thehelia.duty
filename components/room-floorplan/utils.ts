import { format, parseISO } from 'date-fns'

export function formatShortDate(value?: string) {
  if (!value) return '-'

  const parsed = parseISO(value)
  if (Number.isNaN(parsed.getTime())) return value

  return format(parsed, 'M/d')
}

export function getCheckoutBadge(checkOutDday?: number) {
  if (checkOutDday === 0) return 'D-Day'
  if (checkOutDday === 1) return 'D-1'
  if (checkOutDday === 2) return 'D-2'
  return null
}

export function getRoomTypeBadgeClass(type: 'Prestige' | 'VIP' | 'VVIP') {
  if (type === 'Prestige') return 'border-amber-200 bg-amber-50 text-amber-700'
  if (type === 'VVIP') return 'border-cyan-200 bg-cyan-50 text-cyan-700'
  return 'border-slate-200 bg-slate-100 text-slate-700'
}

export function getRoomStatusSurfaceClass(args: {
  occupied: boolean
  checkoutBadge: 'D-Day' | 'D-1' | 'D-2' | null
}) {
  const { occupied, checkoutBadge } = args

  if (checkoutBadge === 'D-Day' || checkoutBadge === 'D-1') {
    return 'border-[hsl(var(--room-checkout-red-border))] bg-[hsl(var(--room-checkout-red-bg))]'
  }

  if (checkoutBadge === 'D-2') {
    return 'border-[hsl(var(--room-checkout-yellow-border))] bg-[hsl(var(--room-checkout-yellow-bg))]'
  }

  if (occupied) {
    return 'border-[hsl(var(--room-occupied-border))] bg-[hsl(var(--room-occupied-bg))]'
  }

  return 'border-[hsl(var(--room-empty-border))] bg-[hsl(var(--room-empty-bg))] border-dashed'
}
