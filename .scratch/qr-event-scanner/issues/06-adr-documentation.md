Status: ready-for-human

## What to build

Create Architectural Decision Records (ADRs) documenting the key architectural choices already made in the project. These serve as reference for future agents and contributors.

## Acceptance criteria

- [ ] `docs/adr/` directory exists
- [ ] `docs/adr/0001-use-hmac-sha256-for-ticket-signing.md` — why HMAC-SHA256 was chosen over JWT or plain UUIDs, timing-safe comparison
- [ ] `docs/adr/0002-use-sqlite-for-single-event-storage.md` — why SQLite over PostgreSQL, no multi-tenancy, single-file deployment
- [ ] `docs/adr/0003-use-web-audio-api-for-scan-feedback.md` — why synthesized audio over downloaded files, zero external assets
- [ ] `docs/adr/0004-single-event-no-multi-tenancy.md` — scope boundary, one deployment = one event
- [ ] `docs/adr/0005-event-story-celebrants-and-schedule.md` — why base64 photos in JSON columns, three-touchpoint display, no new endpoints
- [ ] Each ADR follows the standard format: Title, Status, Context, Decision, Consequences

## Blocked by

None - can start immediately

## Notes

HITL because ADRs encode human architectural judgment. The decisions themselves are already made in the codebase — this slice documents them retroactively. ADR 0005 has been drafted alongside the Event Story feature issues (07-10).
