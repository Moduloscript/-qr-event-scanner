Status: implemented (verified)

## What to build

Strip the access-control layers from the database schema and server API. Remove the `guests` and `scan_logs` tables, remove `max_capacity`/`enforce_capacity` from `event_config`, add `program_pdf` column, and remove all guest/scanner endpoints.

This is the **foundational** slice — everything else builds on this simplified schema. The app is for a single specific birthday event, so no multi-event or guest-list features are needed.

## Acceptance criteria

### Database Changes

- [ ] `guests` table is removed from `src/db.js` schema initialization
- [ ] `scan_logs` table is removed from `src/db.js` schema initialization
- [ ] `max_capacity` and `enforce_capacity` columns are removed from `event_config` table
- [ ] `program_pdf TEXT DEFAULT NULL` column is added to `event_config` table
- [ ] Default seed config no longer includes `max_capacity` or `enforce_capacity`
- [ ] Migration path: existing databases with old schema still work (use `PRAGMA table_info` to detect and skip old columns gracefully)

### Server Changes

- [ ] `src/crypto.js` module is removed entirely (no more HMAC-SHA256)
- [ ] `scannerAuth` middleware is removed from `src/server.js`
- [ ] All scanner endpoints are removed:
  - `POST /api/scanner/validate`
  - `POST /api/scanner/checkin`
  - `GET /api/scanner/guests`
- [ ] All guest CRUD endpoints are removed:
  - `GET /api/admin/guests`
  - `POST /api/admin/guests`
  - `POST /api/admin/guests/bulk`
  - `PUT /api/admin/guests/:id`
  - `DELETE /api/admin/guests/:id`
- [ ] `GET /api/admin/config` no longer returns `scanner_token`
- [ ] `POST /api/admin/config` no longer requires or validates `max_capacity` or `enforce_capacity`
- [ ] `POST /api/admin/config` accepts optional `program_pdf` field (base64 data URI string)
- [ ] `GET /api/event/info` returns `program_pdf` field (public, no auth)
- [ ] `GET /api/event/download` new endpoint — returns the birthday program PDF with correct `Content-Type: application/pdf` and `Content-Disposition: attachment` headers, decoded from base64

### Dependency Changes

- [ ] `uuid` dependency is removed from `package.json` (no longer generating guest IDs)
- [ ] `crypto` module is no longer imported in server (native Node `crypto` was only used via `src/crypto.js`)

### Test Changes

- [ ] `verify.js` is rewritten to test only the remaining endpoints:
  - `GET /api/event/info` — returns birthday event details + celebrants + schedule + program_pdf
  - `GET /api/event/download` — returns a PDF file with correct headers
  - `GET /api/admin/config` — returns config (authorized)
  - `GET /api/admin/config` — returns 401 (unauthorized)
  - `POST /api/admin/config` — updates config including program_pdf
- [ ] All old guest/scanner/scan tests are removed

## Files to modify

- `src/db.js` — schema, seed data
- `src/server.js` — remove endpoints, middleware, crypto import
- `src/crypto.js` — delete file
- `package.json` — remove `uuid` dependency
- `verify.js` — rewrite tests

## Blocked by

None — this is the foundational slice

## Notes

AFK because the changes are mechanical deletions with a clear pattern. The `PRAGMA table_info` migration pattern is already established in the codebase (see `src/db.js` lines 79-84 for the Event Story migration precedent).
