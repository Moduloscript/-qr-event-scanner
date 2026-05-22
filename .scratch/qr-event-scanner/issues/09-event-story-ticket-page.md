Status: ready-for-agent

## What to build

Add the Event Story display to the guest ticket page — celebrant photo gallery and order-of-event schedule rendered below the QR code — so guests can see who is being celebrated and the event program when they view their ticket.

This is the **guest-facing frontend** slice. It builds on the API from issue 07.

## Acceptance criteria

### Celebrant Gallery on Ticket

- [ ] `public/ticket.html` shows a "Celebrants" section below the ticket info rows
- [ ] Celebrant photos render as circular thumbnails (80x80px) in a horizontal scrollable row
- [ ] Below each photo: celebrant name and role (e.g., "Sarah" / "Bride")
- [ ] Section is hidden when no celebrants are configured (empty array)
- [ ] Photos are loaded from the base64 data URIs returned by `GET /api/event/info`

### Schedule Timeline on Ticket

- [ ] `public/ticket.html` shows an "Order of Event" section below the celebrant gallery
- [ ] Schedule renders as a vertical timeline with:
  - Time on the left (bold, e.g., "16:00")
  - Vertical line connecting items
  - Title and optional description on the right
- [ ] Section is hidden when no schedule is configured (empty array)

### Data Flow

- [ ] `public/js/ticket.js` fetches `GET /api/event/info` (already does this) and extracts `celebrants` and `schedule` from the response
- [ ] No additional API calls needed — the existing `/api/event/info` call is extended

### Visual Design

- [ ] Timeline uses the existing CSS color scheme (dark theme, glass-morphism)
- [ ] Celebrant gallery scrolls horizontally on mobile (touch swipe)
- [ ] Responsive: stacks vertically on narrow screens
- [ ] Matches ticket card aesthetic (clean, minimal, elegant)

## Blocked by

Issue 07 (Event Story DB Schema + API)

## Notes

AFK because the data flow is a simple extension of the existing `GET /api/event/info` fetch in ticket.js. No new endpoints needed.
