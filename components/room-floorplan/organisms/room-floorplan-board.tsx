import { Baby, Building2, Sparkles, Waves } from 'lucide-react'
import type { DragEvent } from 'react'

import { FLOORPLAN_LAYOUT, OFFICE_SLOT } from '@/components/room-floorplan/constants'
import { RoomNode } from '@/components/room-floorplan/molecules/room-node'
import { SharedSpaceNode } from '@/components/room-floorplan/molecules/shared-space-node'
import type { FloorKey, FloorplanRoom } from '@/components/room-floorplan/types'

interface RoomFloorplanBoardProps {
  floor: FloorKey
  rooms: FloorplanRoom[]
  allowDrag: boolean
  onRoomClick: (roomNumber: string) => void
  draggingRoomNumber: string | null
  dragOverRoomNumber: string | null
  isRoomMoving: boolean
  onRoomDragStart: (room: FloorplanRoom, event: DragEvent<HTMLDivElement>) => void
  onRoomDragOver: (targetRoomNumber: string, event: DragEvent<HTMLDivElement>) => void
  onRoomDrop: (targetRoomNumber: string, event: DragEvent<HTMLDivElement>) => void
  onRoomDragEnd: () => void
}

export function RoomFloorplanBoard({
  floor,
  rooms,
  allowDrag,
  onRoomClick,
  draggingRoomNumber,
  dragOverRoomNumber,
  isRoomMoving,
  onRoomDragStart,
  onRoomDragOver,
  onRoomDrop,
  onRoomDragEnd,
}: RoomFloorplanBoardProps) {
  const layout = FLOORPLAN_LAYOUT[floor]
  const roomLookup = new Map(rooms.map((room) => [room.number, room]))
  const roomSlotClass = 'w-[260px] min-w-[260px] md:w-[300px] md:min-w-[300px] aspect-square min-h-[260px] md:min-h-[300px]'
  const bentoTileClass =
    'rounded-2xl bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,255,255,0.5))] p-2 md:p-3'

  if (rooms.length === 0) {
    return (
      <section className="rounded-2xl border border-[hsl(var(--fp-border))] bg-[radial-gradient(circle_at_top,_hsl(var(--fp-surface))_0%,_hsl(var(--fp-bg))_62%)] p-4 md:p-6">
        <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          선택한 조건에 해당하는 객실이 없습니다.
        </div>
      </section>
    )
  }

  const renderRoomSlot = (roomNumber: string, key: string) => {
    const room = roomLookup.get(roomNumber)
    if (!room) {
      return (
        <div
          key={key}
          aria-hidden="true"
          className={`${roomSlotClass} rounded-2xl border border-transparent`}
        />
      )
    }

    return (
      <RoomNode
        key={room.id}
        room={room}
        onClick={() => onRoomClick(room.number)}
        canDrag={allowDrag && Boolean(room.activeStayId)}
        isDraggingAny={Boolean(draggingRoomNumber)}
        isDragSource={draggingRoomNumber === room.number}
        isDragOver={dragOverRoomNumber === room.number}
        isRoomMoving={isRoomMoving}
        className={roomSlotClass}
        onDragStart={(event) => onRoomDragStart(room, event)}
        onDragOver={(event) => onRoomDragOver(room.number, event)}
        onDrop={(event) => onRoomDrop(room.number, event)}
        onDragEnd={onRoomDragEnd}
      />
    )
  }

  const renderSlot = (slot: string, key: string) => {
    if (slot === OFFICE_SLOT) {
      return (
        <SharedSpaceNode
          key={key}
          icon={<Building2 className="h-4 w-4" />}
          title="사무실"
          description="5층 운영/관리 동선을 위한 공용 공간입니다."
          className={roomSlotClass}
        />
      )
    }

    return renderRoomSlot(slot, key)
  }

  return (
    <section className="rounded-2xl border border-[hsl(var(--fp-border))] bg-[radial-gradient(circle_at_top,_hsl(var(--fp-surface))_0%,_hsl(var(--fp-bg))_62%)] p-4 md:p-6">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-bold text-foreground">{floor} 평면도</h3>
          <span className="text-xs text-muted-foreground">객실 카드를 눌러 상세를 확인하세요.</span>
          <span className="text-[11px] text-muted-foreground xl:hidden">
            좌우로 스와이프하여 전체 평면도를 확인하세요.
          </span>
        </div>

        <div className="-mx-4 overflow-x-auto px-4 pb-2 xl:mx-0 xl:overflow-visible xl:px-0 xl:pb-0">
          <div className="grid min-w-[860px] grid-cols-[auto_minmax(320px,_1fr)_auto] gap-4 md:min-w-[980px] xl:min-w-0 xl:grid-cols-[auto_minmax(0,_1fr)_auto] xl:items-start">
            <div className="flex flex-col items-center gap-4 xl:self-start">
              {layout.leftLine.map((slot, index) => renderSlot(slot, `${floor}-left-${index}`))}
            </div>

            <div className="flex w-full self-stretch items-center rounded-2xl border border-[hsl(var(--fp-border))] bg-[hsl(var(--fp-surface))] p-4 md:p-6 xl:min-h-[860px]">
              {floor === '5F' ? (
                <div className="grid w-full grid-cols-1 gap-4">
                  <div className={bentoTileClass}>
                    <SharedSpaceNode
                      icon={<Baby className="h-4 w-4" />}
                      title="신생아실 1"
                      description="5층 중심 공용공간입니다. 객실 편집 기능은 제공하지 않습니다."
                      className="aspect-auto h-full min-h-[340px] md:min-h-[400px]"
                    />
                  </div>
                  <div className={bentoTileClass}>
                    <SharedSpaceNode
                      icon={<Baby className="h-4 w-4" />}
                      title="신생아실 2"
                      description="신생아 관리 동선을 고려한 정보성 노드입니다."
                      className="aspect-auto h-full min-h-[340px] md:min-h-[400px]"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid w-full grid-cols-1 gap-4">
                  <div className={bentoTileClass}>
                    <SharedSpaceNode
                      icon={<Building2 className="h-4 w-4" />}
                      title="다용도실"
                      description="6층 공용 서비스 공간입니다."
                      className="aspect-auto h-full min-h-[260px] md:min-h-[300px]"
                    />
                  </div>
                  <div className={bentoTileClass}>
                    <SharedSpaceNode
                      icon={<Sparkles className="h-4 w-4" />}
                      title="에스테틱"
                      description="산후 관리 서비스 공간입니다."
                      className="aspect-auto h-full min-h-[260px] md:min-h-[300px]"
                    />
                  </div>
                  <div className={bentoTileClass}>
                    <SharedSpaceNode
                      icon={<Waves className="h-4 w-4" />}
                      title="스파"
                      description="힐링 프로그램 공간입니다."
                      className="aspect-auto h-full min-h-[260px] md:min-h-[300px]"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col items-center gap-4 xl:self-start">
              {layout.rightLine.map((slot, index) => renderSlot(slot, `${floor}-right-${index}`))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
