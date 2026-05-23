> **SUPERSEDED** — This issue belongs to the original Access Control architecture. Per [ADR 0006](../../../docs/adr/0006-architecture-pivot-to-information-qr.md), the project has pivoted to a Birthday Information QR scope. Per-guest ticket generation is replaced by a single static QR code.

Status: superseded

## What to build

Add a bulk ticket export feature so the organizer can download all guest tickets at once as a JSON file for distribution via their own channels (WhatsApp, email, etc.).

## Acceptance criteria

- [ ] `GET /api/admin/tickets/export` returns a JSON array of all guests with `{ id, name, email, ticket_tier, signature, ticketUrl }` for each
- [ ] Endpoint is protected by admin auth middleware
- [ ] Admin dashboard shows a "Download All Tickets" button in the guest management section
- [ ] Clicking the button downloads a `.json` file named `{event-slug}-tickets.json`
- [ ] `verify.js` includes a test: export tickets → verify array length matches guest count → verify each entry has required fields

## Blocked by

None - can start immediately
