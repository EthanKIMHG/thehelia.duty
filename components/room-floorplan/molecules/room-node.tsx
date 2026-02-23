import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { BedDouble, CalendarClock, GripVertical, LogIn, UserRound, Users } from 'lucide-react'
import type { DragEvent } from 'react'

import type { FloorplanRoom } from '@/components/room-floorplan/types'
import {
  formatShortDate,
  getCheckoutBadge,
  getRoomStatusSurfaceClass,
  getRoomTypeBadgeClass,
} from '@/components/room-floorplan/utils'

interface RoomNodeProps {
  room: FloorplanRoom
  onClick?: () => void
  canDrag?: boolean
  isDraggingAny?: boolean
  isDragSource?: boolean
  isDragOver?: boolean
  isRoomMoving?: boolean
  className?: string
  onDragStart?: (event: DragEvent<HTMLDivElement>) => void
  onDragOver?: (event: DragEvent<HTMLDivElement>) => void
  onDrop?: (event: DragEvent<HTMLDivElement>) => void
  onDragEnd?: () => void
}

export function RoomNode({
  room,
  onClick,
  canDrag = false,
  isDraggingAny = false,
  isDragSource = false,
  isDragOver = false,
  isRoomMoving = false,
  className,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: RoomNodeProps) {
  const isOccupied = room.status === 'Occupied'
  const nextUpcoming = room.upcomingStays[0]
  const checkoutBadge = getCheckoutBadge(room.checkOutDday)
  const normalizedCount = Math.max(1, room.babyCount || 1)
  const profileNameFallbacks = (room.babyNames || [])
    .map((name) => name?.trim())
    .filter((name): name is string => Boolean(name))
  const splitGenders = (room.gender || '')
    .split('/')
    .map((gender) => gender.trim())
    .filter((gender) => gender.length > 0)
  const newbornProfiles = Array.from({ length: normalizedCount }, (_, idx) => {
    const profile = room.babyProfiles?.[idx]
    const name = profile?.name?.trim() || profileNameFallbacks[idx] || null
    const gender = profile?.gender?.trim() || splitGenders[idx] || (idx === 0 ? room.gender || null : null)
    const weight = profile?.weight ?? (idx === 0 ? room.babyWeight ?? null : null)
    return { name, gender, weight }
  })
  const newbornNameSummary = newbornProfiles
    .map((baby) => baby.name?.trim())
    .filter((value): value is string => Boolean(value))
    .join(', ')
  const newbornGenderSummary = newbornProfiles
    .map((baby) => baby.gender?.trim())
    .filter((value): value is string => Boolean(value))
    .join(', ')
  const newbornWeightSummary = newbornProfiles
    .map((baby, idx) => {
      const value = baby.weight
      if (value === undefined || value === null || value === '') return ''
      const numeric = typeof value === 'number' ? value : Number(value)
      if (!Number.isFinite(numeric)) return ''
      return newbornProfiles.length > 1 ? `아기${idx + 1} ${numeric}kg` : `${numeric}kg`
    })
    .filter((value) => value !== '')
    .join(', ')

  const statusSurfaceClass = getRoomStatusSurfaceClass({
    occupied: isOccupied,
    checkoutBadge,
  })

  const statusLabel = checkoutBadge
    ? `퇴실임박 ${checkoutBadge}`
    : isOccupied
      ? '입실중'
      : '비어있음'

  const srLabel = `${room.number}호 객실, ${statusLabel}${room.motherName ? `, 산모 ${room.motherName}` : ''}`
  const descId = `room-node-assist-${room.number}`
  const assistiveDescription = `입실 ${formatShortDate(room.checkInDate)} · 퇴실 ${formatShortDate(room.checkOutDate)} · 교육 ${formatShortDate(room.eduDate)}`

  return (
    <div
      draggable={canDrag && !isRoomMoving}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      role="button"
      tabIndex={0}
      aria-label={srLabel}
      aria-describedby={descId}
      className={cn(
        'group relative flex aspect-square min-h-[196px] flex-col overflow-hidden rounded-2xl border p-3 shadow-sm transition-all duration-200 md:min-h-[224px] md:p-4',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'hover:saturate-75',
        statusSurfaceClass,
        canDrag && !isRoomMoving && 'cursor-grab active:cursor-grabbing',
        isDragSource && 'opacity-60 ring-2 ring-primary/40',
        isDragOver && 'ring-2 ring-sky-300',
        isRoomMoving && 'pointer-events-none opacity-70',
        className,
      )}
      onClick={() => {
        if (isDraggingAny || isRoomMoving) return
        onClick?.()
      }}
      onKeyDown={(event) => {
        if (isDraggingAny || isRoomMoving) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick?.()
        }
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black leading-none tracking-tight">{room.number}</span>
          <span
            className={cn(
              'inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold',
              getRoomTypeBadgeClass(room.type),
            )}
          >
            {room.type}
          </span>
        </div>

        {canDrag && (
          <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-white/80 px-2 py-0.5 text-[10px] text-muted-foreground">
            <GripVertical className="h-3 w-3" />
            이동
          </span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Badge
          variant="outline"
          className={cn(
            'h-6 rounded-full px-2.5 text-[11px] font-medium',
            isOccupied ? 'border-sky-200 bg-sky-100 text-sky-700' : 'border-slate-200 bg-slate-100 text-slate-600',
          )}
        >
          {isOccupied ? (
            <>
              <UserRound className="mr-1 h-3.5 w-3.5" />
              입실중
            </>
          ) : (
            <>
              <BedDouble className="mr-1 h-3.5 w-3.5" />
              비어있음
            </>
          )}
        </Badge>

        {checkoutBadge && (
          <Badge
            variant="outline"
            className={cn(
              'h-6 rounded-full px-2.5 text-[11px] font-semibold',
              checkoutBadge === 'D-2' && 'border-amber-200 bg-amber-100 text-amber-700',
              (checkoutBadge === 'D-Day' || checkoutBadge === 'D-1') &&
                'border-rose-200 bg-rose-100 text-rose-700',
            )}
          >
            <CalendarClock className="mr-1 h-3.5 w-3.5" />
            {checkoutBadge}
          </Badge>
        )}
      </div>

      {isOccupied ? (
        <div className="mt-3 flex-1 space-y-2">
          <div className="space-y-1">
            <p className="text-[11px] text-muted-foreground">산모</p>
            <p className="whitespace-normal break-keep text-base font-bold leading-tight text-foreground">
              {room.motherName || '이름 미등록'}
            </p>
          </div>

          <div className="rounded-lg border border-border/70 bg-white/70 p-2">
            <p className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              신생아 {room.babyCount || 0}명
            </p>
            <p className="mt-1 whitespace-normal break-keep text-[11px] font-semibold leading-tight text-foreground">
              이름: {newbornNameSummary || '-'}
            </p>
            <p className="mt-0.5 whitespace-normal break-keep text-[11px] leading-tight text-muted-foreground">
              성별: {newbornGenderSummary || '-'}
            </p>
            <p className="mt-0.5 whitespace-normal break-keep text-[11px] leading-tight text-muted-foreground">
              몸무게: {newbornWeightSummary || '-'}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-1 text-[10px]">
            <span className="rounded border border-border/70 bg-white/70 px-1.5 py-1 text-center text-muted-foreground">
              입실 {formatShortDate(room.checkInDate)}
            </span>
            <span className="rounded border border-border/70 bg-white/70 px-1.5 py-1 text-center text-muted-foreground">
              퇴실 {formatShortDate(room.checkOutDate)}
            </span>
            <span className="rounded border border-border/70 bg-white/70 px-1.5 py-1 text-center text-muted-foreground">
              교육 {formatShortDate(room.eduDate)}
            </span>
          </div>

          {nextUpcoming && (
            <p className="inline-flex max-w-full items-center gap-1 truncate rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] text-sky-700">
              <LogIn className="h-3.5 w-3.5" />
              다음 입실 {nextUpcoming.mother_name} ({formatShortDate(nextUpcoming.check_in_date)})
            </p>
          )}
        </div>
      ) : (
        <div className="mt-3 flex flex-1 flex-col justify-between rounded-xl border border-dashed border-slate-300 bg-white/55 p-3">
          <div className="flex flex-col items-center justify-center gap-2 py-1">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500">
              <BedDouble className="h-5 w-5" />
            </span>
            <p className="text-center text-sm font-semibold text-slate-700">현재 공실입니다</p>
            <p className="text-center text-[11px] text-muted-foreground">카드를 눌러 입실 정보를 등록하세요</p>
          </div>

          {nextUpcoming ? (
            <p className="inline-flex max-w-full items-center gap-1 truncate rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] text-sky-700">
              <LogIn className="h-3.5 w-3.5" />
              다음 입실 {nextUpcoming.mother_name} ({formatShortDate(nextUpcoming.check_in_date)})
            </p>
          ) : (
            <p className="text-center text-[11px] text-muted-foreground">입실 예정이 없습니다</p>
          )}
        </div>
      )}

      <span id={descId} className="sr-only">
        {assistiveDescription}
      </span>
    </div>
  )
}
