import { Baby, Building2, Sparkles, Waves } from 'lucide-react'
import type { DragEvent } from 'react'

import { FLOORPLAN_LAYOUT } from '@/components/room-floorplan/constants'
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

  const lineClass = 'grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5'
  const topLineClass =
    floor === '5F'
      ? 'ml-auto grid w-full max-w-[540px] grid-cols-2 gap-4'
      : lineClass

  if (rooms.length === 0) {
    return (
      <section className="rounded-2xl border border-[hsl(var(--fp-border))] bg-[radial-gradient(circle_at_top,_hsl(var(--fp-surface))_0%,_hsl(var(--fp-bg))_62%)] p-4 md:p-6">
        <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          선택한 조건에 해당하는 객실이 없습니다.
        </div>
      </section>
    )
  }

  const renderRoomSlot = (roomNumber: string) => {
    const room = roomLookup.get(roomNumber)
    if (!room) {
      return (
        <div
          key={roomNumber}
          aria-hidden="true"
          className="aspect-square min-h-[196px] rounded-2xl border border-transparent md:min-h-[224px]"
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
        onDragStart={(event) => onRoomDragStart(room, event)}
        onDragOver={(event) => onRoomDragOver(room.number, event)}
        onDrop={(event) => onRoomDrop(room.number, event)}
        onDragEnd={onRoomDragEnd}
      />
    )
  }

  return (
    <section className="rounded-2xl border border-[hsl(var(--fp-border))] bg-[radial-gradient(circle_at_top,_hsl(var(--fp-surface))_0%,_hsl(var(--fp-bg))_62%)] p-4 md:p-6">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">{floor} 평면도</h3>
          <span className="text-xs text-muted-foreground">객실 카드를 눌러 상세를 확인하세요.</span>
        </div>

        <div className={topLineClass}>{layout.topLine.map(renderRoomSlot)}</div>

        <div className="rounded-2xl border border-[hsl(var(--fp-border))] bg-[hsl(var(--fp-surface))] p-4 md:p-5">
          {floor === '5F' ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SharedSpaceNode
                icon={<Baby className="h-4 w-4" />}
                title="신생아실 1"
                description="5층 중심 공용공간입니다. 객실 편집 기능은 제공하지 않습니다."
                className="aspect-auto min-h-[214px] md:min-h-[238px] md:p-5"
              />
              <SharedSpaceNode
                icon={<Baby className="h-4 w-4" />}
                title="신생아실 2"
                description="신생아 관리 동선을 고려한 정보성 노드입니다."
                className="aspect-auto min-h-[214px] md:min-h-[238px] md:p-5"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <SharedSpaceNode
                icon={<Building2 className="h-4 w-4" />}
                title="다용도실"
                description="6층 공용 서비스 공간입니다."
                className="aspect-auto min-h-[132px] md:min-h-[148px]"
              />
              <SharedSpaceNode
                icon={<Sparkles className="h-4 w-4" />}
                title="에스테틱"
                description="산후 관리 서비스 공간입니다."
                className="aspect-auto min-h-[132px] md:min-h-[148px]"
              />
              <SharedSpaceNode
                icon={<Waves className="h-4 w-4" />}
                title="스파"
                description="힐링 프로그램 공간입니다."
                className="aspect-auto min-h-[132px] md:min-h-[148px]"
              />
            </div>
          )}
        </div>

        <div className={lineClass}>{layout.bottomLine.map(renderRoomSlot)}</div>
      </div>
    </section>
  )
}
