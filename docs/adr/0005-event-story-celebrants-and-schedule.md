# ADR 0005: Event Story — Celebrant Photos and Order-of-Event Schedule

**Status:** Accepted

**Date:** 2026-05-22

## Context

The QR Code Event Access System handles guest check-in but provides no context about the event's celebrants or program. When a guest arrives or views their ticket, they see only event name, venue, and time. The check-in experience is purely transactional — scan, beep, admit — with no personal touch.

The organizer needs to:

1. Show celebrant photos (e.g., bride/groom, birthday person) with names and roles so guests feel connected to the people being celebrated.
2. Display the order-of-event schedule so guests know the program flow.
3. Present this information in three touchpoints: admin configuration, guest ticket page, and scanner success overlay.

## Decision

We will implement an **Event Story** feature with the following architectural choices:

### 1. Schema Extension (No New Table)

Two JSON columns are added to the existing `event_config` table:

- `celebrants_json TEXT DEFAULT '[]'` — JSON array of `{name, role, photo}`
- `event_schedule_json TEXT DEFAULT '[]'` — JSON array of `{time, title, description}`

**Rationale:** The `event_config` table is already a single-row configuration store. Adding JSON columns avoids creating a new table, new migrations, or new query patterns. JSON is the natural format for variable-length arrays of structured data. SQLite supports JSON functions natively if querying is needed later.

### 2. Base64 Photo Storage

Celebrant photos are stored as base64 data URIs (`data:image/jpeg;base64,...`) directly in the `celebrants_json` column.

**Rationale:**

- **Portability:** The entire event configuration (including photos) lives in a single `database.sqlite` file. Backing up or moving the event requires copying one file.
- **Simplicity:** No file system management, no `multer` middleware, no static file serving configuration for uploads.
- **Consistency:** The existing codebase has no file upload infrastructure. Introducing one for 2-5 small celebrant headshots is disproportionate complexity.
- **Trade-off acknowledged:** Base64 encoding adds ~33% overhead. For 5 photos at ~100KB each, this is ~165KB extra — negligible for a single-event SQLite database.

### 3. Three-Touchpoint Display

The Event Story data is rendered in three distinct locations:

| Touchpoint    | Location                                                | Purpose                                             |
| ------------- | ------------------------------------------------------- | --------------------------------------------------- |
| Admin Config  | `POST /api/admin/config` form                           | Organizer uploads photos and writes schedule        |
| Guest Ticket  | `GET /api/event/info` → `ticket.html`                   | Guest sees celebrants + schedule below QR code      |
| Scanner VALID | `POST /api/scanner/validate` response → scanner overlay | Door staff sees celebrant photos on successful scan |

**Rationale:** Each touchpoint serves a different emotional need — setup (organizer control), anticipation (guest excitement), and welcome (door staff greeting). Reusing the same data source (`event_config` columns) ensures consistency across all three.

### 4. API Contract Changes

- `GET /api/event/info` (public) — now returns `celebrants` and `schedule` arrays alongside existing fields.
- `POST /api/admin/config` — accepts optional `celebrants` and `schedule` fields in the request body.
- `POST /api/scanner/validate` VALID response — includes a `celebrants` array so the scanner UI can display photos.

**Rationale:** No new endpoints are needed. The existing public event info endpoint is the natural home for this data. The scanner validate endpoint already returns guest context — adding celebrant data enriches the response without breaking existing clients.

## Consequences

### Positive

- **Fully portable database** — celebrant photos travel with the database file.
- **No new infrastructure** — no file upload middleware, no storage buckets, no CDN.
- **Consistent data source** — one config update propagates to all three touchpoints automatically.
- **Backward compatible** — existing API consumers ignore the new fields. Old configs without `celebrants_json`/`event_schedule_json` render empty arrays.

### Negative

- **Base64 overhead** — ~33% larger than binary for photo storage. Acceptable for small headshot counts.
- **Admin panel payload size** — uploading 5 photos via base64 in a single POST body increases request size. The server already uses `bodyParser.json({ limit: '10mb' })` which accommodates this.
- **No image resizing** — organizers must upload appropriately sized photos. Very large images (e.g., 10MB DSLR photos) would bloat the database. This is documented as a usage guideline.

### Risks

- **Large photo uploads** could cause slow form submission. Mitigation: document recommended max image dimensions (e.g., 400x400px, <200KB each) in the admin UI.
- **Base64 in JSON** may cause rendering delays if many large photos are included. Mitigation: limit to 10 celebrants maximum (enforced in UI and server validation).
