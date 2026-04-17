# Room Floorplan UX

## 1. Purpose

This file is the single source of truth for the room floorplan UI.
Older `spec / design-system / handoff` docs were merged into this one.

Source files:

- `components/room-view.tsx`
- `components/room-floorplan/constants.ts`
- `components/room-floorplan/organisms/room-floorplan-board.tsx`
- `components/room-floorplan/organisms/room-list-view.tsx`
- `components/room-floorplan/molecules/room-node.tsx`
- `components/room-floorplan/molecules/shared-space-node.tsx`

## 2. Screen Role

The room screen provides:

- Today-level check-in / check-out / census stats
- Room type and urgent checkout filters
- Click room card -> open stay drawer
- Desktop room move / swap flow
- Mobile list-first browsing
- Optional floorplan expansion

## 3. Layout Rules

### 3.1 Desktop Floorplan

The desktop floorplan uses a 3-column structure:
`left room line / central shared area / right room line`.

Core rules:

1. Prioritize spatial recognition over pure room-number order.
2. Do not shrink room cards.
3. Keep the central shared area visually separate as a `bento` block.
4. Do not reintroduce skipped room numbers.

### 3.2 Mobile

Mobile is list-first.

- Default view is `RoomListView`
- Use `FloorSwitch` for `5F / 6F`
- Use expandable floorplan as a secondary view
- Do not use drag for touch devices

## 4. Fixed Layout Rules

### 4.1 5F

- Left line: `502 -> 501 -> office`
- Center: `Nursery 1`, `Nursery 2`
- Right line: `508 -> 507 -> 506 -> 505 -> 503`
- Skip `504`

### 4.2 6F

- Left line: `606 -> 605 -> 603 -> 602 -> 601`
- Center: `Multi-purpose`, `Esthetic`, `Spa`
- Right line: `611 -> 610 -> 609 -> 608 -> 607`
- Skip `604`

## 5. Fixed Rules

### 5.1 Room Type Mapping

- `501`, `502`: `Prestige`
- `607` ~ `611`: `VVIP`
- All others: `VIP`

### 5.2 Room Card Size

Fixed size in `room-floorplan-board.tsx`:

- `w-[260px] min-w-[260px]`
- `md:w-[300px] md:min-w-[300px]`
- `aspect-square min-h-[260px] md:min-h-[300px]`

Use the same size for room cards, empty slots, and the office slot.

### 5.3 Central Shared Area

- Keep the full center container at `xl:min-h-[860px]`
- Render shared-space cards inside the `bento` wrapper
- Do not add double borders
- Do not truncate description text

## 6. Interaction Rules

### 6.1 RoomNode

Core card data:

- Room number
- Type badge
- Status badge
- Mother name
- Newborn summary
- Check-in / check-out / education date
- Next scheduled check-in

Behavior:

- Click: open `StayFormDrawer`
- Keyboard: open on `Enter` or `Space`
- Drag: only when an active stay exists and the device has a `fine pointer`

### 6.2 Move / Swap

- Highlight the source card on drag start
- Highlight the drop target with a ring
- Require confirmation before applying the move
- Use toast feedback for success or failure

## 7. Status Representation

Do not rely on color alone for status.

- Occupied
- Empty
- Checkout soon `D-2`
- Checkout urgent `D-1 / D-Day`
- Upcoming check-in

Use:

- Badge text
- Icons
- Background and border tone

## 8. Do Not Change

1. Do not shrink room cards.
2. Do not change the fixed 5F/6F ordering.
3. Do not bring back `504` or `604`.
4. Do not reintroduce double borders on shared-space cards.
5. Do not make the mobile default floorplan-first.

## 9. Extension Note

If you expand shared-space content later, keep these rules:

- Keep room card size unchanged
- Expand only the content inside the central shared area
- On mobile, reduce density and move detail into Sheet or Tooltip when needed
