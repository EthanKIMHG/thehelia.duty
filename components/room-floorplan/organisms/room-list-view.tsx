import type { DragEvent } from 'react'

import { RoomNode } from '@/components/room-floorplan/molecules/room-node'
import type { FloorplanRoom } from '@/components/room-floorplan/types'

interface RoomListViewProps {
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

export function RoomListView({
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
}: RoomListViewProps) {
  if (rooms.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        선택한 조건에 해당하는 객실이 없습니다.
      </div>
    )
  }

  const orderedRooms = [...rooms].sort((a, b) => Number(a.number) - Number(b.number))

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {orderedRooms.map((room) => (
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
      ))}
    </div>
  )
}
