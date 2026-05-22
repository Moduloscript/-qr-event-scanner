Status: ready-for-agent

## What to build

Add the Event Story feature — database schema migration, server API changes, and integration tests — so the system can store and serve celebrant photos and order-of-event schedule data.

This is the **backend foundation** slice. It adds two JSON columns to `event_config`, updates the config endpoint to accept/return celebrant and schedule data, updates the public event info endpoint, and includes celebrant data in the scanner VALID response.

## Acceptance criteria

### Database

- [ ] Migration adds `celebrants_json TEXT DEFAULT '[]'` column to `event_config` table
- [ ] Migration adds `event_schedule_json TEXT DEFAULT '[]'` column to `event_config` table
- [ ] Existing rows get default empty arrays (no data loss)
- [ ] `src/db.js` `initDb()` includes the migration (ALTER TABLE or CREATE TABLE with new columns)

### API — Admin Config

- [ ] `POST /api/admin/config` accepts optional `celebrants` (array of `{name, role, photo}`) and `schedule` (array of `{time, title, description}`) fields
- [ ] `GET /api/admin/config` returns `celebrants` and `schedule` arrays parsed from JSON columns
- [ ] Server validates `celebrants` array max length (10 items)
- [ ] Server validates `photo` field is a valid base64 data URI string (starts with `data:image/`)

### API — Public Event Info

- [ ] `GET /api/event/info` returns `celebrants` and `schedule` arrays alongside existing fields
- [ ] When no celebrants/schedule configured, returns empty arrays `[]`

### API — Scanner Validate

- [ ] `POST /api/scanner/validate` VALID response includes `celebrants` array from event config
- [ ] DUPLICATE, INVALID_SIGNATURE, CAPACITY_EXCEEDED responses do NOT include celebrants (only VALID)

### Tests

- [ ] `verify.js` test: configure event with celebrants + schedule → verify `GET /api/event/info` returns them
- [ ] `verify.js` test: scan a valid ticket → verify VALID response includes `celebrants` array
- [ ] `verify.js` test: verify empty arrays returned when no Event Story configured
- [ ] All existing tests still pass

## Blocked by

None — can start immediately

## Notes

AFK because the schema change is additive (ALTER TABLE ADD COLUMN), the API changes are backward-compatible, and the test patterns are well-established in verify.js.
