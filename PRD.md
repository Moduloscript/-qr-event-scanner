# Product Requirements Document (PRD)

## QR Code Birthday Information System (Single-Event Utility)

---

## 1. Problem Statement

The organizer of a birthday celebration wants to share event program details and celebrant information with their guests in a simple, modern way:

1. **Paper Programs Are Inconvenient:** Printing physical event programs is costly, wasteful, and guests often lose or discard them before the event.
2. **No Central Information Source:** Guests receive event details across multiple channels (WhatsApp texts, email threads, verbal instructions) — there's no single source of truth for the program flow or who is being celebrated.
3. **App Overhead Is Unnecessary:** Building a full mobile app or website for a single birthday event is disproportionate effort. Guests don't want to install anything.
4. **Sharing Is Ad-Hoc:** Celebrant photos of the birthday person are shared separately from the event program, creating a fragmented experience.

---

## 2. Solution

The **QR Code Birthday Information System** is a lightweight, single-page web utility that lets the organizer publish the birthday event program PDF and celebrant information behind a single QR code. Any guest can scan the QR code with their phone camera to instantly download the program PDF and view celebrant details.

### Core Value Proposition

- **Zero Installation:** Guests scan the QR code with their native phone camera — no app store, no login, no registration.
- **Single Source of Truth:** One QR code links to everything — program PDF, celebrant photos, event schedule, venue details.
- **Fully Portable:** The entire event configuration (including the PDF and photos) lives in a single SQLite database file. Back up one file, move one file.
- **Organizer-Controlled:** The organizer configures everything through a password-protected admin panel — event details, PDF upload, celebrant photos, schedule.
- **Static QR Code:** One QR code serves all guests. Print it on invitations, share it on WhatsApp, embed it in digital invites.

---

## 3. User Stories

### 3.1 Birthday Organizer

1. **As the organizer,** I want to configure the birthday event details (name, venue, start time) in a protected settings panel, so that guests see accurate information when they scan the QR code.
2. **As the organizer,** I want to protect the admin panel with a simple master password (set via server environment variables), so that only I can modify event details.
3. **As the organizer,** I want to upload a program PDF file, so that guests can download the full birthday event program.
4. **As the organizer,** I want to upload celebrant photos with names and roles (e.g., "Sarah — Birthday Girl"), so that guests know who is being celebrated.
5. **As the organizer,** I want to configure the order-of-event schedule (time, title, optional description), so that guests know the program flow.
6. **As the organizer,** I want to generate a QR code image for the download page URL, so that I can print it on invitations or share it digitally.

### 3.2 Guests

7. **As a guest,** I want to scan a QR code with my phone camera and immediately see the birthday event details, so that I have the correct venue and time.
8. **As a guest,** I want to download the birthday event program PDF with one tap, so that I can read it offline or save it.
9. **As a guest,** I want to see celebrant photos with names and roles, so that I feel connected to the birthday person being celebrated.
10. **As a guest,** I want to see the order-of-event schedule, so that I know the program flow and can plan my arrival.

---

## 4. Implementation Decisions

### 4.1 Simplified System Architecture

- **Single-Event Instance:** One deployment equals one birthday event. No multi-tenancy, no event catalogs.
- **Admin Access:** Secured by matching a header containing the master `ADMIN_PASSWORD` (stored in `.env`).
- **Public Access:** The download page requires no authentication — any guest with the QR code URL can access it.
- **No Guest List:** There is no guest registry. The QR code is a public information source, not an access token.

### 4.2 Database Schema (SQLite)

The database is a single table:

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

**Celebrants JSON format:**

```json
[
  {
    "name": "Sarah",
    "role": "Birthday Girl",
    "photo": "data:image/jpeg;base64,/9j/4AAQ..."
  },
  {
    "name": "Michael",
    "role": "Friend of the Family",
    "photo": "data:image/jpeg;base64,/9j/4AAQ..."
  }
]
```

**Event Schedule JSON format:**

```json
[
  {
    "time": "16:00",
    "title": "Cocktail Hour",
    "description": "Welcome drinks"
  },
  { "time": "17:00", "title": "Birthday Person's Entrance", "description": "" },
  {
    "time": "17:30",
    "title": "Dinner Service",
    "description": "Three-course plated dinner"
  },
  {
    "time": "20:00",
    "title": "Dance Floor Opens",
    "description": "Live band performance"
  }
]
```

### 4.3 API Contracts

#### Admin Configuration

- `GET /api/admin/config` — Get event configuration [Admin Password Required]
- `POST /api/admin/config` (`event_name`, `venue`, `start_time`, `celebrants`, `schedule`, `program_pdf`) — Update configuration [Admin Password Required]
  - `celebrants`: JSON array of `{name, role, photo}` where `photo` is a base64 data URI
  - `schedule`: JSON array of `{time, title, description}`
  - `program_pdf`: Base64 data URI string of the PDF file (`data:application/pdf;base64,...`)

#### Public Endpoints

- `GET /api/event/info` — Get public event details including celebrants, schedule, and program_pdf indicator [No auth required]
  ```json
  {
    "event_name": "Sarah's 30th Birthday",
    "venue": "Skyline Terrace Lounge",
    "start_time": "2026-05-23T18:00",
    "celebrants": [
      { "name": "Sarah", "role": "Birthday Girl", "photo": "data:..." }
    ],
    "schedule": [
      { "time": "16:00", "title": "Cocktail Hour", "description": "" }
    ],
    "has_program_pdf": true
  }
  ```
- `GET /api/event/download` — Download the program PDF file [No auth required]
  - Returns `Content-Type: application/pdf`
  - Returns `Content-Disposition: attachment; filename="birthday-program.pdf"`
  - Returns 404 if no PDF is configured

---

## 5. Testing Decisions

- **Integration Testing:** Verify the following endpoints:
  - `GET /api/event/info` returns event details with celebrants, schedule, and `has_program_pdf` flag
  - `GET /api/event/download` returns a PDF with correct content-type and disposition headers
  - `GET /api/event/download` returns 404 when no PDF is configured
  - `GET /api/admin/config` returns config when authorized
  - `GET /api/admin/config` returns 401 when unauthorized
  - `POST /api/admin/config` updates config including program_pdf

---

## 6. Deployment Considerations

### 6.1 Recommended Platform: Render (Free Tier)

The app is designed as a long-running Express server with SQLite. **Render** provides the simplest deployment path:

| Factor            | Detail                                          |
| ----------------- | ----------------------------------------------- |
| **Cost**          | Free tier (750 instance hours/month)            |
| **Setup**         | Connect GitHub repo → set env vars → deploy     |
| **Node.js**       | Native support, pin version via `.node-version` |
| **SQLite**        | Supported (ephemeral on free tier)              |
| **HTTPS**         | Automatic (free TLS certificates)               |
| **Custom Domain** | Supported (add CNAME record)                    |

### 6.2 SQLite Persistence

On Render's **free tier**, the filesystem is ephemeral — data is lost on restart/redeploy. For a single-event system, this is acceptable:

1. Deploy the app fresh
2. Configure event via admin panel
3. Keep service warm with a cron job during event hours
4. Data loss after the event is irrelevant

For **persistent storage**, upgrade to a paid instance ($7/month) and attach a persistent disk.

### 6.3 PWA Support

The download page includes:

- **Web App Manifest** (`/site.webmanifest`) — enables "Add to Home Screen"
- **Service Worker** (`/sw.js`) — caches shell and API responses for offline access
- **Apple touch icons** — iOS home screen support

### 6.4 Environment Variables

| Variable         | Required | Purpose                             |
| ---------------- | -------- | ----------------------------------- |
| `ADMIN_PASSWORD` | Yes      | Master password for admin panel     |
| `HOST`           | Yes      | Public URL for QR code generation   |
| `PORT`           | No       | Server port (Render default: 10000) |

### 6.5 Full Deployment Guide

See [`.scratch/qr-event-scanner/deployment/render-deployment-guide.md`](.scratch/qr-event-scanner/deployment/render-deployment-guide.md) for the complete step-by-step deployment instructions.

---

## 7. Out of Scope

1. **Guest List / Access Control:** No guest registry, no check-in, no ticket validation, no capacity enforcement.
2. **Multi-Event Accounts:** One deployment equals one birthday event instance.
3. **Analytics / Page Views:** No tracking of how many guests viewed or downloaded the program.
4. **Email Delivery:** No automated email sending. The organizer shares the QR code manually.
5. **Video/Animation:** Only static images and PDFs are supported.

---

_PRD Version: 3.0 (Information QR Pivot — Single Birthday Focus)_
_Last Updated: May 2026_
