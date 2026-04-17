# Mobile Excel UX

## 1. Purpose

This file defines the current mobile spreadsheet UX.
Source files live under `components/excel-view/mobile/*`.

## 2. Current Structure

The mobile spreadsheet view is not a compressed desktop grid.
It is split into three steps:

1. `Week Overview`
2. `Day Detail Sheet`
3. `Staff Detail Sheet`

The goal is a short mobile flow:
`week overview -> day detail -> staff detail`.

## 3. Information Architecture

### 3.1 Week Overview

Files:

- `mobile-excel-view.tsx`
- `mobile-week-navigator.tsx`
- `week-day-summary-list.tsx`

Responsibilities:

- Show a 7-day summary for the selected week
- Allow previous / current / next week navigation
- Surface day-level risk and key metrics

Minimum card data:

- Date
- Status badge: `safe | caution | danger`
- Check-ins / check-outs
- Newborn count
- Required staff count
- Lowest assigned shift count

### 3.2 Day Detail Sheet

Files:

- `day-detail-sheet.tsx`

Responsibilities:

- Expand the selected date into `D / E / N / M` shift groups
- Let the user drill into a staff detail sheet from a staff row

Shown data:

- Date and status badge
- Newborns, check-ins, check-outs, required staff
- Assigned count per shift
- Staff name, role, duty code

### 3.3 Staff Detail Sheet

Files:

- `staff-detail-sheet.tsx`

Responsibilities:

- Show schedule and off-day context for one staff member on mobile

Tabs:

- `Weekly schedule`
- `Off / wanted off`
- `Monthly schedule`

Top summary:

- Role
- Employment type
- Work days
- Off days
- Total OT

## 4. Data Handling

### 4.1 Week State

- `selectedWeekStart` is the main state anchor
- Week navigation uses `addWeeks` and `subWeeks`
- Closing sheets should not reset the selected week or day

### 4.2 Cross-Month Weeks

The current implementation does not use a `from/to` API.
Instead, it computes all months touched by the selected week, fetches them separately, and merges on the client.

Merged datasets:

- `schedules`
- `stays`
- `wanted_offs`

## 5. Interaction Rules

1. The default screen should show summary only.
2. Staff lists open only after a day is selected.
3. Staff detail stays in a separate sheet to preserve context.
4. Do not expose a horizontally scrolling table on mobile.

## 6. Status Rules

Day status is based on required vs assigned coverage for `D / E / N`.

- `safe`: every shift is above required coverage
- `caution`: the weakest shift is exactly at required coverage
- `danger`: at least one shift is below required coverage

## 7. Accessibility and Usability

1. Summary cards and staff rows should behave like buttons.
2. Keep a minimum touch target of `44px`.
3. Status must use text badges, not color alone.
4. Reopening sheets must keep the current week context.

## 8. Maintenance Note

This is not a shrunken desktop grid.
When changing the mobile spreadsheet UX, preserve the mobile-first summary and drill-down structure instead of copying desktop grid rules.
