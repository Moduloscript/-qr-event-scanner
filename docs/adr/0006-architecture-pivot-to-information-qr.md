# ADR 0006: Architecture Pivot — From Access Control to Birthday Information QR

**Status:** Accepted

**Date:** 2026-05-22

## Context

The original PRD specified a **QR Code Event Access System** — a real-time door scanner with cryptographic ticket signing, duplicate detection, capacity enforcement, and manual check-in. This was designed for a birthday event with door staff validating guests at entry.

The client has now clarified the actual need:

> _"A QR code that any intending guest can scan to get a downloadable PDF of the event programs and pictures of the celebrant."_

This is fundamentally different. The QR code is not an **access token** — it is an **information source**. The guest scans it to receive event materials (program PDF, celebrant photos), not to gain entry.

### Key Differences

| Dimension      | Original (Access Control)                   | New (Birthday Information QR)          |
| -------------- | ------------------------------------------- | -------------------------------------- |
| **QR purpose** | Cryptographic ticket, scanned by door staff | Public URL, scanned by any guest       |
| **Auth model** | Admin password + scanner token              | None (fully public)                    |
| **Guest list** | Required (who is invited)                   | Not needed (anyone can scan)           |
| **Check-in**   | Real-time validation, duplicate detection   | Not applicable                         |
| **Capacity**   | Enforced at door                            | Not applicable                         |
| **Scanner UI** | Camera-based, staff-operated                | Not needed                             |
| **Output**     | Green/red overlay on scanner                | PDF download in browser                |
| **Data**       | Guest names, emails, tiers, scan logs       | Birthday program PDF, celebrant photos |

### What Stays the Same

- **Single-event deployment** — one instance, one birthday event
- **SQLite database** — portable, zero-config
- **Admin panel** — organizer configures birthday event details, uploads program PDF and celebrant photos
- **Celebrant photos** — base64 storage in `event_config` (portable)
- **Event schedule** — still relevant as part of the birthday program
- **No multi-tenancy, no payments, no email delivery**

## Decision

We will pivot the architecture from **Access Control** to **Birthday Information QR** by stripping the access-control layers and adding a PDF-generation layer.

### 1. Remove Access Control Layers

The following components are no longer needed and will be removed:

| Component                                 | Reason                                 |
| ----------------------------------------- | -------------------------------------- |
| `guests` table                            | No guest list — anyone can scan the QR |
| `scan_logs` table                         | No check-in events to log              |
| HMAC-SHA256 crypto module                 | No tickets to sign                     |
| Scanner UI (`scanner.html`, `scanner.js`) | No door staff scanning                 |
| Scanner auth middleware (`scannerAuth`)   | No scanner token needed                |
| Guest CRUD endpoints                      | No guest management                    |
| Scan validation endpoint                  | No check-in validation                 |
| Manual check-in endpoint                  | No manual lookup                       |
| Bulk CSV import                           | No guest list to import                |
| Ticket page (`ticket.html`, `ticket.js`)  | Replaced by download page              |
| QR code generation per guest              | Replaced by single static QR           |

### 2. Simplify Database Schema

From 3 tables to 1 table:

```sql
-- Single-Event Configuration (Single Row)
CREATE TABLE event_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_name VARCHAR(255) NOT NULL,
    venue VARCHAR(255) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    celebrants_json TEXT DEFAULT '[]',       -- JSON array: [{name, role, photo_base64}]
    event_schedule_json TEXT DEFAULT '[]',   -- JSON array: [{time, title, description}]
    program_pdf TEXT DEFAULT NULL,           -- Base64-encoded PDF data URI
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Key changes:

- `guests` and `scan_logs` tables removed
- `max_capacity` and `enforce_capacity` removed from `event_config`
- `program_pdf` column added — stores the birthday program as a base64 data URI

### 3. Simplify API Contracts

From 10+ endpoints to 3:

| Endpoint                  | Auth           | Purpose                                       |
| ------------------------- | -------------- | --------------------------------------------- |
| `GET /api/event/info`     | None           | Public birthday info + celebrants + schedule  |
| `GET /api/event/download` | None           | Download the birthday program PDF             |
| `POST /api/admin/config`  | Admin password | Update event config + upload PDF + celebrants |
| `GET /api/admin/config`   | Admin password | Retrieve current config                       |

### 4. New Frontend: Download Page

Replace `ticket.html` with `download.html` — a single public page served at the QR code URL:

```
QR Code ──> https://example.com/download.html
            ┌──────────────────────────────┐
            │   Sarah's 30th Birthday      │
            │   Skyline Terrace Lounge     │
            │   Sat, May 23 · 6:00 PM     │
            │                              │
            │   [Download Program PDF]     │
            │                              │
            │   ── Celebrants ──           │
            │   (photo strip)              │
            │                              │
            │   ── Order of Event ──       │
            │   (timeline)                 │
            └──────────────────────────────┘
```

- No authentication required
- One-click PDF download
- Celebrant gallery + schedule displayed inline
- Responsive, mobile-first design

### 5. PDF Upload in Admin Panel

The admin config panel gains a **Program PDF** upload field:

- File input accepting `.pdf` files
- Client-side conversion to base64 data URI via `FileReader`
- Stored in `event_config.program_pdf`
- Max file size: 10MB (matching existing `bodyParser` limit)

### 6. Static QR Code

Instead of generating per-guest QR codes, the organizer generates a **single static QR code** pointing to the download page URL. This can be:

- Printed on physical invitations
- Shared as an image on WhatsApp
- Embedded in a digital invite

The admin panel includes a "Generate QR Code" button that creates a QR code image for the download page URL using the existing `qrcode.min.js` library.

## Consequences

### Positive

- **Massive simplification** — removes ~60% of the codebase (guest management, crypto, scanner, tickets)
- **Zero operational burden** — no door staff training, no scanner setup, no token distribution
- **Fully public** — any guest with the QR link gets the information, no registration needed
- **Portable** — single SQLite file contains everything including the PDF
- **Faster to build** — remaining scope is ~3 vertical slices instead of 10

### Negative

- **No access control** — cannot prevent unauthorized entry (but this was never the client's need)
- **No check-in tracking** — cannot know who attended (but client didn't ask for this)
- **PDF size limits** — large program PDFs (~5MB+) will increase database size. Mitigation: document recommended max size (2MB) and enforce 10MB server limit
- **No analytics** — cannot track how many people viewed/downloaded. Mitigation: could add optional page-view logging later if needed

### Migration Path

The existing codebase has `guests`, `scan_logs`, crypto, scanner, and ticket features already built. The migration is:

1. Remove `guests` and `scan_logs` tables from schema
2. Remove `max_capacity`/`enforce_capacity` from `event_config`
3. Add `program_pdf` column to `event_config`
4. Remove crypto module (`src/crypto.js`)
5. Remove scanner middleware and all scanner endpoints
6. Remove guest CRUD endpoints
7. Remove `ticket.html`, `ticket.js`, `scanner.html`, `scanner.js`
8. Create `download.html` with PDF download + celebrant/schedule display
9. Update admin panel: remove guest management, add PDF upload
10. Update `verify.js` tests to match new API surface
