> **SUPERSEDED** — This issue belongs to the original Access Control architecture. Per [ADR 0006](../../../docs/adr/0006-architecture-pivot-to-information-qr.md), the project has pivoted to a Birthday Information QR scope. The Event Story schema and API are retained in the new architecture (celebrants_json and event_schedule_json columns remain), but the scanner-related API changes are removed.

Status: superseded

## What to build

Add the Event Story feature — database schema migration, server API changes, and integration tests — so the system can store and serve celebrant photos and order-of-event schedule data.

This is the **backend foundation** slice. It adds two JSON columns to `event_config`, updates the config endpoint to accept/return celebrant and schedule data, updates the public event info endpoint, and includes celebrant data in the scanner VALID response.

## Acceptance criteria

### Database

- [x] Migration adds `celebrants_json TEXT DEFAULT '[]'` column to `event_config` table
- [x] Migration adds `event_schedule_json TEXT DEFAULT '[]'` column to `event_config` table
- [x] Existing rows get default empty arrays (no data loss)
- [x] `src/db.js` `initDb()` includes the migration (ALTER TABLE ADD COLUMN via PRAGMA table_info check)

### API — Admin Config

- [x] `POST /api/admin/config` accepts optional `celebrants` (array of `{name, role, photo}`) and `schedule` (array of `{time, title, description}`) fields
- [x] `GET /api/admin/config` returns `celebrants` and `schedule` arrays parsed from JSON columns
- [x] Server validates `celebrants` array max length (10 items)
- [x] Server validates `photo` field is a valid base64 data URI string (starts with `data:image/`)

### API — Public Event Info

- [x] `GET /api/event/info` returns `celebrants` and `schedule` arrays alongside existing fields
- [x] When no celebrants/schedule configured, returns empty arrays `[]`

### API — Scanner Validate

- [x] `POST /api/scanner/validate` VALID response includes `celebrants` array from event config
- [x] DUPLICATE, INVALID_SIGNATURE, CAPACITY_EXCEEDED responses do NOT include celebrants (only VALID)

### Tests

- [x] `verify.js` test: configure event with celebrants + schedule → verify `GET /api/event/info` returns them
- [x] `verify.js` test: scan a valid ticket → verify VALID response includes `celebrants` array
- [x] `verify.js` test: verify empty arrays returned when no Event Story configured
- [x] All existing tests still pass

## Blocked by

None — can start immediately

## Notes

AFK because the schema change is additive (ALTER TABLE ADD COLUMN), the API changes are backward-compatible, and the test patterns are well-established in verify.js.
