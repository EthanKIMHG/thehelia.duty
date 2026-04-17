# The Helia Architecture Overview

## 1. Scope

`The Helia` is an internal operations tool for a postpartum care center.
It supports these workflows:

- Staff registration and ordering
- Monthly schedule editing, CSV import/export, auto assignment
- Monthly check-in / check-out calendar
- Room status, room moves, stay editing
- Shared weekly schedule view

The default entry point `/` redirects to `/excel`.
The app currently has three main screens:

- Spreadsheet view
- Calendar view
- Room view

## 2. Screen Structure

### 2.1 Main App

- `app/page.tsx`
  - Redirects the default entry to `/excel`
- `app/(dashboard)/layout.tsx`
  - Shared authenticated shell for dashboard routes
- `components/dashboard-shell.tsx`
  - Shared header, date banner, desktop nav, mobile nav, and logout action
- `app/(dashboard)/excel/page.tsx`
  - Spreadsheet route entry
- `app/(dashboard)/calendar/page.tsx`
  - Calendar route entry
- `app/(dashboard)/room-floor/page.tsx`
  - Room dashboard route entry
- `components/view-switcher.tsx`
  - Desktop route switcher
- `components/mobile-nav.tsx`
  - Mobile bottom route navigation

### 2.2 Spreadsheet View

- `components/excel-view.tsx`
  - Top-level monthly schedule container
  - Handles CSV import/export, auto assignment, and staff registration entry
- `components/excel-view/schedule-grid.tsx`
  - Desktop-first monthly schedule grid
- `components/excel-view/mobile/*`
  - Mobile summary UX
  - Provides `week summary -> day detail -> staff detail`

### 2.3 Calendar View

- `components/calendar-view.tsx`
  - Monthly check-in / check-out calendar
- `components/calendar-view/day-details-sheet.tsx`
  - Per-day stay detail sheet

### 2.4 Room View

- `components/room-view.tsx`
  - Entry point for the room dashboard
  - Includes filters, stats, floorplan/list modes, stay drawer, and move confirmation
- `components/room-floorplan/*`
  - UI system for the room floorplan
- `components/stay-form-drawer.tsx`
  - Stay detail/edit drawer opened from a room card

## 3. Tech Stack

- Framework: Next.js 15 App Router
- Language: TypeScript
- UI: Tailwind CSS + shadcn/ui + Radix primitives
- State/Data Fetching: TanStack Query
- Backend/Data: Supabase
- Date Handling: `date-fns`

## 4. Data Model

Core entities in the current codebase:

### 4.1 `staff`

- `id`
- `name`
- `job_title`: `nurse | assistant`
- `employment_type`: `full-time | part-time`
- `display_order`
- `max_capacity`

### 4.2 `schedules`

- `staff_id`
- `work_date`
- `duty_type`
- `is_ot`
- `ot_hours`

Monthly schedules are stored by the `staff_id + work_date` pair.

### 4.3 `stays`

- `room_number`
- `mother_name`
- `baby_count`
- `baby_names`
- `baby_profiles`
- `check_in_date`
- `check_out_date`
- `edu_date`
- `notes`
- `status`: `upcoming | active | completed`

### 4.4 `wanted_offs`

- `staff_id`
- `wanted_date`

Wanted-off requests are managed per staff member with a monthly limit of two.

### 4.5 Read-Only Views

- `v_room_snapshot`
  - Snapshot view for the room board
- `v_stay_history`
  - History view for completed stays

## 5. API Structure

Main APIs live under `app/api/*`.

- `/api/staff`
  - Staff read/create/update/delete/reorder
- `/api/schedules`
  - Monthly schedule read and upsert
- `/api/stays`
  - Stay read/create/update/delete
- `/api/rooms`
  - Room snapshot read
- `/api/wanted-offs`
  - Wanted-off read/create/delete
- `/api/dashboard-stays`
  - Check-in / check-out / census stats for the room dashboard
- `/api/daily-stats`
  - Supporting stats for schedule screens
- `/api/share/schedule/*`
  - Shared weekly schedule pages

## 6. Runtime Notes

- `middleware.ts`
  - Requires `x-auth-session` for APIs except `/login`, `/api/auth/login`, and `/api/share/*`
- `components/providers.tsx`
  - Mounts the React Query provider and the global `Toaster`
- `lib/auto-scheduler.ts`
  - Implements auto assignment with part-time first, then full-time fill

## 7. Design Doc Split

Design docs are split by feature area:

- [design/frontend-guidelines.md](design/frontend-guidelines.md)
  - Shared frontend rules
- [design/mobile-excel.md](design/mobile-excel.md)
  - Mobile spreadsheet UX
- [design/room-floorplan.md](design/room-floorplan.md)
  - Single source of truth for the room floorplan UI

Keep product scope and API structure here.
Keep screen-level interaction details in the design docs.
