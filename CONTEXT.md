# Project Context: Single-Event QR Code Access System

This project is a lightweight, responsive utility designed as a single-event door scanner system, avoiding multi-tenant overhead or complex app installations.

## Domain Glossary

### Access & Verification

- **HMAC Ticket Signature**: A cryptographically signed hash (`HMAC-SHA256`) created on the server using `SIGNING_KEY` and the guest's ID and name. Renders tickets tamper-proof.
- **Scanner Access Token**: A secret key parameter (`?token=SCANNER_TOKEN`) used to grant instant camera access to door staff without requiring login accounts.
- **Admin Password**: A master secret (`ADMIN_PASSWORD`) used to lock settings, guest registration, and bulk uploads.

### Database Entities

- **Event Config**: Single-row configuration containing the event name, venue, start time, max capacity limit, gate enforcement rules, **celebrants JSON** (photos, names, roles), and **event schedule JSON** (program timeline).
- **Guest Registry**: A list of attendees including their unique ID, name, email, ticket tier (VIP, General, Staff), is_scanned flag, and scan time.
- **Scan Audit Logs**: A trail of check-in attempts recording the timestamp, scanner ID, guest, and resulting status (`VALID`, `DUPLICATE`, `INVALID_SIGNATURE`, `CAPACITY_EXCEEDED`).

### Event Story

- **Celebrants**: Photos, names, and roles (e.g., "Sarah — Bride", "Michael — Groom") of the people being celebrated. Stored as base64 data URIs in `event_config.celebrants_json`.
- **Order of Event**: A timeline/schedule of program items (time, title, optional description) displayed on the guest ticket page. Stored as JSON in `event_config.event_schedule_json`.
- **Three-Touchpoint Display**: Celebrant photos and schedule appear in three places — admin configuration panel, guest ticket page (for anticipation), and scanner VALID overlay (for warm greeting by door staff).

### User Experience

- **Browser-based Scanner**: Responsive camera interface using `html5-qrcode` to decode tickets.
- **Visual Feedback**: Screen-filling green and red indicator overlays showing ticket validity.
- **Acoustic Synthesizer**: Web Audio API oscillator beeps giving validators eyes-free verification cues.
- **Celebrant Gallery on Ticket**: Horizontal photo strip with names/roles displayed below the QR code on the guest's ticket page.
- **Schedule Timeline on Ticket**: Styled vertical timeline of event program items displayed below the celebrant gallery.
- **Celebrant Greeting on Scan**: Brief celebrant photo display on the scanner's VALID overlay so door staff can offer a personalized welcome.

## Guiding Documentation

- **[PRD.md](PRD.md)**: Product requirements and specifications — the source of truth for all features.
- **[AGENTS.md](AGENTS.md)**: Coding rules for AI agents, test requirements, and development workflow.
- **[verify.js](verify.js)**: Automated API integration tests — must pass before any commit.
- **[.scratch/qr-event-scanner/](.scratch/qr-event-scanner/)**: Issue tracker with vertical-slice issues derived from PRD gaps.
- **[.roomodes](.roomodes)**: Project-specific Zoo Code mode configurations.

## Development Workflow

```
PRD.md ──> .scratch/<feature>/issues/<NN>-<slug>.md ──> implementation ──> verify.js
```

The PRD is the single source of truth. Gaps between current implementation and PRD requirements are captured as vertical-slice issues in `.scratch/<feature>/issues/`. Each issue cuts through all layers (schema → API → UI → tests). Implementation follows TDD (RED → GREEN → REFACTOR) and must pass `node verify.js` before committing.

## Architectural Decisions

Past and future architectural decisions are recorded as ADRs (Architectural Decision Records) in `docs/adr/`.
