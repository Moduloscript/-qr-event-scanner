> **SUPERSEDED** — This issue belongs to the original Access Control architecture. Per [ADR 0006](../../../docs/adr/0006-architecture-pivot-to-information-qr.md), the project has pivoted to a Birthday Information QR scope. The ticket page is replaced by `download.html`. The celebrant gallery and schedule display logic will be ported to the new download page.

Status: superseded

## What to build

Add the Event Story display to the guest ticket page — celebrant photo gallery and order-of-event schedule rendered below the QR code — so guests can see who is being celebrated and the event program when they view their ticket.

This is the **guest-facing frontend** slice. It builds on the API from issue 07.

## Acceptance criteria

### Celebrant Gallery on Ticket

- [x] `public/ticket.html` shows a "Celebrants" section below the ticket info rows
- [x] Celebrant photos render as circular thumbnails (80x80px) in a horizontal scrollable row
- [x] Below each photo: celebrant name and role (e.g., "Sarah" / "Bride")
- [x] Section is hidden when no celebrants are configured (empty array)
- [x] Photos are loaded from the base64 data URIs returned by `GET /api/event/info`

### Schedule Timeline on Ticket

- [x] `public/ticket.html` shows an "Order of Event" section below the celebrant gallery
- [x] Schedule renders as a vertical timeline with:
  - Time on the left (bold, purple, e.g., "16:00")
  - Vertical connecting line with dot markers
  - Title and optional description on the right
- [x] Section is hidden when no schedule is configured (empty array)

### Data Flow

- [x] `public/js/ticket.js` fetches `GET /api/event/info` (already does this) and extracts `celebrants` and `schedule` from the response
- [x] No additional API calls needed — the existing `/api/event/info` call is extended

### Visual Design

- [x] Timeline uses the existing CSS color scheme (dark theme, glass-morphism)
- [x] Celebrant gallery scrolls horizontally on mobile (touch swipe with `-webkit-overflow-scrolling: touch`)
- [x] Responsive: stacks vertically on narrow screens
- [x] Matches ticket card aesthetic (clean, minimal, elegant)

## What was built

### Files changed

| File                                         | Change                                                                                                                                                                                                                                                                                                                                                                   |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`public/ticket.html`](public/ticket.html)   | Added CSS for celebrant gallery (`.celebrant-gallery`, `.celebrant-card`, `.celebrant-photo`, `.celebrant-name`, `.celebrant-role`) and schedule timeline (`.schedule-timeline`, `.schedule-item`, `.schedule-time`, `.schedule-title`, `.schedule-desc`, `.ticket-section-hidden`). Added celebrant gallery and schedule timeline HTML sections inside the ticket card. |
| [`public/js/ticket.js`](public/js/ticket.js) | Added rendering logic for celebrant gallery (circular 80x80px thumbnails, horizontal scroll, name/role below each photo) and schedule timeline (vertical timeline with time/title/description, purple dot markers, connecting line). Added `escapeHTML()` helper for XSS-safe rendering. Sections hidden when data arrays are empty.                                     |

### Verification

All 18 endpoint integration tests pass (`node verify.js`). No new API endpoints were needed — the existing `GET /api/event/info` response already includes `celebrants` and `schedule` arrays from Issue 07.

## Blocked by

Issue 07 (Event Story DB Schema + API) — ✅ resolved
Issue 08 (Event Story Admin UI) — ✅ resolved

## Notes

AFK because the data flow is a simple extension of the existing `GET /api/event/info` fetch in ticket.js. No new endpoints needed.
