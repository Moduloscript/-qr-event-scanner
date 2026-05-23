> **SUPERSEDED** — This issue belongs to the original Access Control architecture. Per [ADR 0006](../../../docs/adr/0006-architecture-pivot-to-information-qr.md), the project has pivoted to a Birthday Information QR scope. Live check-in stats are no longer relevant.

Status: superseded

## What to build

Add a lightweight stats endpoint and client-side polling so the admin dashboard's stats cards (total registered, checked-in, capacity utilization) update in real-time without reloading the full guest list.

## Acceptance criteria

- [ ] `GET /api/admin/stats` returns `{ total, scanned, capacity, percent }` (percent = Math.min(100, Math.round(scanned / capacity \* 100)))
- [ ] Endpoint is protected by admin auth middleware
- [ ] Admin dashboard polls this endpoint every 5 seconds via `setInterval`
- [ ] Stats cards and capacity bar update smoothly without page flicker
- [ ] Polling stops when the admin logs out
- [ ] `verify.js` includes a test: register guest → check stats reflect count → check-in guest → verify scanned count increments

## Blocked by

None - can start immediately
