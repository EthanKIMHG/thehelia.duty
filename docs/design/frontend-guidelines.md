# The Helia Frontend Guidelines

## 1. Purpose

This file defines shared frontend rules for the whole app.
It is not a screen-specific spec.

- Shared layout rules
- Feedback patterns
- Responsive interaction rules
- Accessibility rules

For screen-specific behavior, use:

- [mobile-excel.md](mobile-excel.md)
- [room-floorplan.md](room-floorplan.md)

## 2. Shared Product Rules

1. Design mobile-first, then expand for desktop.
2. Data-changing actions must show immediate feedback.
3. The same action type should use the same component and wording pattern across screens.
4. Do not use browser-native `alert/confirm` for product UI.

## 3. Layout and Responsive Rules

### 3.1 Breakpoints

- Mobile: `< 768px`
- Desktop: `>= 768px`

### 3.2 Common Rules

1. On mobile, toolbars and CTA groups should stack vertically by default.
2. Mobile buttons should default to `w-full` with a minimum height of `44px`.
3. Add `min-w-0` where needed in `flex` and `grid` containers to prevent width blowouts.
4. Horizontal scroll is allowed only in dense data areas.
5. Toolbars, filters, and action rows should not create horizontal scroll.
6. Dense spreadsheet screens can use a near full-bleed layout with minimal page padding, and embedded webviews should default to that tighter layout.

## 4. Feedback System

### 4.1 Confirmation Dialogs

Use `components/app-confirm-dialog.tsx` for shared confirmation UI.

Typical cases:

- CSV import/export
- Auto assignment
- Delete actions
- Room move and swap
- Any bulk or hard-to-reverse change

Rules:

1. The title should state the action directly.
2. The body should briefly explain impact or scope.
3. Default focus should be on the cancel button.

### 4.2 Toast

Mount the global `Toaster` once in `components/providers.tsx`.
Screens should use `useToast` only.

Suggested types:

- `success`: save or apply completed
- `error`: failure, network issue, validation error
- `info`: start or condition notice

## 5. Data Change Flow

Use this order by default:

1. User input or click
2. Show a confirmation dialog if needed
3. Run the API call or mutation
4. Show success or error toast
5. Sync UI with React Query invalidate or refetch

## 6. Screen Transitions and Detail UI

1. Prefer `Sheet` over `Dialog` for mobile detail views.
2. For drill-down flows, split UI into `list -> detail -> subdetail`.
3. Enable desktop-only drag interactions only on `fine pointer` devices.
4. On mobile, prefer tap-based interaction over drag.

## 7. Accessibility

1. Any tappable button, row, or card must keep at least a `44x44px` target.
2. Keep visible focus states with `focus-visible`.
3. `Sheet` and `Dialog` should move focus on open.
4. Status should not rely on color alone; include text or icons.

## 8. QA Checklist

1. Mobile toolbars must not break the layout width.
2. New code must not use `alert()` or `confirm()`.
3. Success and failure states must always be visible in the UI.
4. The same action must not mean different things on mobile and desktop.
