# Product Requirements Document (PRD)

## QR Code Event Access System (Single-Event Utility)

---

## 1. Problem Statement

Organizers of a one-time event (such as a specific party, wedding, private occasion, or local conference) need a lightweight, robust, and secure access control utility to manage guest entry at the door:

1. **Ticket Sharing & Duplication:** Without a real-time system, guests can duplicate static tickets, share QR codes, or present a printout multiple times, leading to unauthorized entry.
2. **Slow Manual Check-In:** Using printed paper guest lists or looking up names manually creates long queues and operational bottlenecks at the venue entrance.
3. **App Setup Overhead:** Most access control solutions require downloading native apps from stores, which introduces onboarding friction, compatibility issues, and permission prompts for temporary door staff.
4. **No Real-Time Occupancy Tracking:** Organizers struggle to monitor live check-in rates and peak arrival flows to prevent exceeding venue capacity.
5. **Impersonal Check-In Experience:** Standard QR scanners provide no context about the event's celebrants or program, making the arrival experience transactional rather than welcoming.

---

## 2. Solution

The **QR Code Event Access System** is a lightweight, responsive Progressive Web Application (PWA) designed as a single-event utility. It enables the organizer to set up event configurations, import a guest list, generate secure cryptographically signed QR codes, and instantly validate tickets in real-time via a simple web-browser camera.

### Core Value Proposition

- **Zero-Install Scanning:** Door staff access the scanner immediately via a secure shared URL. No app store downloads or logins are required.
- **Tamper-Proof Tickets:** Each guest receives a cryptographically signed QR code (HMAC-SHA256) containing their unique guest ID. It cannot be counterfeited or guessed.
- **Atomic Double-Entry Prevention:** Validation results are committed and synchronized instantly to a lightweight local database, ensuring a ticket can only be scanned and admitted exactly once.
- **High-Contrast Sensory Feedback:** The browser scanner displays full-screen visual cues (Emerald Green for ✅ valid, Crimson Red for ❌ invalid) along with distinct audio feedback for rapid, eyes-free queue processing in loud or dark venues.
- **Live Capacity Tracker:** A simple, real-time occupancy gauge prevents gate admissions once the event venue reaches its capacity limit.
- **Event Story Experience:** The organizer can configure celebrant photos, names, roles, and a full order-of-event schedule. Guests see these on their ticket page to build anticipation, and door staff see celebrant photos on successful scan for a warm, personalized greeting.

---

## 3. User Stories

### 3.1 Event Organizer

1. **As the organizer,** I want to configure my single event details (name, venue, start time, and maximum capacity) in a protected settings panel, so that the utility is tailored for my occasion.
2. **As the organizer,** I want to protect the admin panel with a simple, shared master password (set via server environment variables), so that guests cannot access the guest list or check themselves in.
3. **As the organizer,** I want to manually add individual guests (name, email, and ticket tier) or bulk-import them using a CSV file, so that I can quickly build my guest list.
4. **As the organizer,** I want to view a search-friendly table of all registered guests along with their arrival status (Checked In vs. Not Arrived), so that I can manage attendance.
5. **As the organizer,** I want to edit a guest's details or delete them, so that I can correct typos or handle cancellations.
6. **As the organizer,** I want to generate and download secure QR code tickets for all guests, so that I can distribute them via my own channels.
7. **As the organizer,** I want to see a live-updating counter of total registered guests, total checked-in guests, and current capacity utilization, so that I can monitor occupancy in real time.
8. **As the organizer,** I want to generate a secure scanner access link (containing a secret query parameter token), so that I can distribute it to my door staff without sharing the master admin password.
9. **As the organizer,** I want to upload celebrant photos with names and roles (e.g., "Sarah — Bride", "Michael — Groom") in the admin panel, so that guests and door staff can see who is being celebrated.
10. **As the organizer,** I want to configure the order-of-event schedule (time, title, optional description for each item) in the admin panel, so that guests know the program flow before they arrive.

### 3.2 Door Staff (Validators)

11. **As door staff,** I want to open the scanner page on my smartphone using the shared secure link, so that I can start scanning immediately without registering an account.
12. **As door staff,** I want the web scanner to ask for camera permissions and open the rear camera immediately, so that I can scan tickets with zero delay.
13. **As door staff,** I want to scan a QR ticket and receive instant, full-screen visual indicators (Green for Valid, Red for Invalid) and distinct audio alert tones, so that I can process guests at a glance.
14. **As door staff,** I want to see the guest's name and ticket tier (e.g., VIP, General) upon successful check-in, so that I can welcome them appropriately.
15. **As door staff,** I want to see a clear explanation for failed scans (e.g., "Duplicate Ticket - Scanned at 8:14 PM", "Invalid Security Signature", "Event at Capacity"), so that I can resolve ticket issues professionally.
16. **As door staff,** I want a simple guest lookup tab on the scanner screen to search by name/email and check in guests manually, so that I can admit legitimate guests whose phone batteries died or whose screens are badly cracked.
17. **As door staff,** I want to see celebrant photos and names briefly displayed on the VALID scan overlay, so that I can greet guests personally ("Welcome to Sarah and Michael's wedding!").

### 3.3 Guests

18. **As a guest,** I want to show my QR code ticket on my mobile phone screen or a printed page, so that I can be checked in instantly at the door.
19. **As a guest,** I want the ticket view to be responsive and show the event details clearly alongside the QR code, so that I have the correct address and start time.
20. **As a guest,** I want to see celebrant photos with names and roles on my ticket page, so that I feel connected to the people being celebrated.
21. **As a guest,** I want to see the order-of-event schedule on my ticket page, so that I know the program flow and can plan my arrival accordingly.

---

## 4. Implementation Decisions

To deliver the application safely, simply, and with maximum performance for a single event, the following architectural choices have been made:

### 4.1 Simplified System Architecture

- **No Multi-Tenancy:** The application represents a single deployed instance for one specific event. There are no databases or controllers for managing multiple organizers, event catalogs, or payment processing.
- **Basic Access Control:**
  - **Admin Panel:** Secured by matching a simple cookie or header containing the master `ADMIN_PASSWORD` (stored in `.env`).
  - **Scanner Interface:** Accessed via `/scanner?token=SCANNER_SECRET_TOKEN`. The server checks the token via middleware to grant access to the scanning engine and camera page.

### 4.2 Database Schema (SQLite)

The database schema is streamlined down to three essential tables, with the `event_config` table extended to support the Event Story feature:

```sql
-- Single-Event Database Schema

-- Event Configuration (Single Row)
CREATE TABLE event_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_name VARCHAR(255) NOT NULL,
    venue VARCHAR(255) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    max_capacity INTEGER NOT NULL,
    enforce_capacity BOOLEAN DEFAULT TRUE,
    celebrants_json TEXT DEFAULT '[]',       -- JSON array: [{name, role, photo_base64}]
    event_schedule_json TEXT DEFAULT '[]',   -- JSON array: [{time, title, description}]
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Guest List
CREATE TABLE guests (
    id UUID PRIMARY KEY,                   -- Unique Guest ID (UUID v4)
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    ticket_tier VARCHAR(50) DEFAULT 'general', -- e.g., 'VIP', 'General'
    signature VARCHAR(255) NOT NULL,       -- Cryptographic HMAC-SHA256 signature
    is_scanned BOOLEAN DEFAULT FALSE,
    scanned_at TIMESTAMP DEFAULT NULL,
    scanner_id VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit/Scan Trail
CREATE TABLE scan_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
    scanner_id VARCHAR(255) NOT NULL,
    result_status VARCHAR(50) NOT NULL,    -- 'VALID', 'DUPLICATE', 'INVALID_SIGNATURE', 'CAPACITY_EXCEEDED'
    scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Event Story Data Format:**

Celebrants JSON stored in `celebrants_json`:

```json
[
  {
    "name": "Sarah",
    "role": "Bride",
    "photo": "data:image/jpeg;base64,/9j/4AAQ..."
  },
  {
    "name": "Michael",
    "role": "Groom",
    "photo": "data:image/jpeg;base64,/9j/4AAQ..."
  }
]
```

Event Schedule JSON stored in `event_schedule_json`:

```json
[
  {
    "time": "16:00",
    "title": "Cocktail Hour",
    "description": "Welcome drinks and canapés"
  },
  {
    "time": "17:00",
    "title": "Grand Entrance",
    "description": "Sarah & Michael's first dance"
  },
  {
    "time": "17:30",
    "title": "Dinner Service",
    "description": "Three-course plated dinner"
  },
  { "time": "19:00", "title": "Cutting of Cake", "description": "" },
  {
    "time": "20:00",
    "title": "Dance Floor Opens",
    "description": "Live band performance"
  }
]
```

### 4.3 Cryptographic Security Protocol

- **HMAC-SHA256 Integrity:** To prevent counterfeit QR code tickets, the server signs each ticket payload.
- **Payload Format:** The QR code encodes a secure string or serialized JSON containing:
  ```json
  {
    "ticketId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "guestName": "John Doe",
    "signature": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  }
  ```
- **Verification Check:** The endpoint `/api/scanner/validate` receives the scan payload, re-generates the HMAC signature using the guest details and the server's private `SIGNING_KEY` (stored in `.env`), and compares it with the submitted signature. Any mismatch results in an immediate counterfeit block.

### 4.4 API Contracts

#### Admin Configuration

- `GET /api/admin/config` -> Get single event configurations [Admin Password Required]
- `POST /api/admin/config` (event_name, venue, start_time, max_capacity, celebrants, schedule) -> Update configurations [Admin Password Required]
  - `celebrants`: JSON array of `{name, role, photo}` where `photo` is a base64 data URI string
  - `schedule`: JSON array of `{time, title, description}`

#### Guest Management

- `GET /api/admin/guests` -> Get guest list table [Admin Password Required]
- `POST /api/admin/guests` (name, email, ticket_tier) -> Create guest, sign ticket, returns ticket payload [Admin Password Required]
- `POST /api/admin/guests/bulk` (CSV file upload) -> Bulk-import guests and generate all signed payloads [Admin Password Required]
- `PUT /api/admin/guests/:id` (name, email, ticket_tier) -> Edit guest details, re-signs ticket if name changed [Admin Password Required]
- `DELETE /api/admin/guests/:id` -> Delete a guest [Admin Password Required]

#### Public Event Information

- `GET /api/event/info` -> Get public event details including celebrants and schedule [No auth required]
  ```json
  {
    "event_name": "Sarah & Michael's Wedding",
    "venue": "Skyline Terrace Lounge",
    "start_time": "2026-05-23T18:00",
    "celebrants": [
      {
        "name": "Sarah",
        "role": "Bride",
        "photo": "data:image/jpeg;base64,..."
      }
    ],
    "schedule": [
      { "time": "16:00", "title": "Cocktail Hour", "description": "" }
    ]
  }
  ```

#### Check-In Scanner API

- `POST /api/scanner/validate` (ticketId, guestName, signature, scannerId) -> Validate scan [Scanner Token Required]
  - **Success (200 OK):**
    ```json
    {
      "status": "VALID",
      "guest": { "name": "John Doe", "ticketTier": "VIP" },
      "celebrants": [
        {
          "name": "Sarah",
          "role": "Bride",
          "photo": "data:image/jpeg;base64,..."
        }
      ]
    }
    ```
  - **Duplicate (200 OK):**
    ```json
    {
      "status": "DUPLICATE",
      "error": "This ticket has already been used.",
      "guest": { "name": "John Doe" },
      "firstScannedAt": "2026-05-21T21:30:15Z"
    }
    ```
  - **Invalid Signature (400 Bad Request):**
    ```json
    {
      "status": "INVALID_SIGNATURE",
      "error": "Counterfeit ticket verification failed."
    }
    ```

---

## 5. Testing Decisions

- **Unit Testing:** Write isolated tests to verify the cryptographic HMAC signature module (valid signature checks, tamper detection on modified names or guest IDs).
- **Integration Testing:** Target the `/api/scanner/validate` endpoint to verify state transitions in isolation:
  - First scan returns `VALID` and changes `is_scanned` status in database.
  - Second scan of same payload returns `DUPLICATE`.
  - Counterfeit signature returns `INVALID_SIGNATURE`.
  - Exceeding capacity limit results in `CAPACITY_EXCEEDED` block.
  - `GET /api/event/info` returns `celebrants` and `schedule` fields when configured.
  - `POST /api/admin/config` with `celebrants` and `schedule` fields persists and retrieves correctly.
  - `POST /api/scanner/validate` returns `celebrants` array in VALID response.

---

## 6. Out of Scope

1. **Ticket Sales/Payment Gateway:** No Stripe, PayPal, or Lemonsqueezy integrations. Tickets are free/invite-only and managed solely via the guest list.
2. **Multi-Event Accounts:** Organizers cannot create multiple events. One deployment equals one event instance.
3. **Offline Check-in:** A network connection is mandatory on the scanner's device to query the database and prevent real-time duplicate check-ins across multiple doors.
4. **Email Delivery Integrations:** Automated email sending is out of scope. Organizers export tickets as images or PDFs and distribute them manually (via WhatsApp, personal email, or messages).
5. **Video/Animation in Celebrant Photos:** Only static images are supported. No video clips, animated GIFs, or slideshow transitions.

---

_PRD Version: 2.0 (Redacted/Single-Event)_
_Last Updated: May 2026_
