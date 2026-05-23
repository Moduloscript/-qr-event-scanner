# Project Context: Single-Birthday QR Information System

This project is a lightweight, responsive utility designed for a single specific birthday event — a QR code that guests scan to download the birthday program PDF and view celebrant information. No multi-tenant overhead, no complex app installations.

## Domain Glossary

### Access & Configuration

- **Admin Password**: A master secret (`ADMIN_PASSWORD`) used to lock the admin settings panel so only the organizer can modify event details.
- **Event Config**: Single-row configuration containing the birthday event name, venue, start time, **celebrants JSON** (photos, names, roles), **event schedule JSON** (program timeline), and **program PDF** (base64-encoded file).

### Birthday Event Story

- **Celebrants**: Photos, names, and roles (e.g., "Sarah — Birthday Girl") of the person being celebrated and any co-celebrants. Stored as base64 data URIs in `event_config.celebrants_json`.
- **Order of Event**: A timeline/schedule of program items (time, title, optional description) displayed on the download page. Stored as JSON in `event_config.event_schedule_json`.
- **Two-Touchpoint Display**: Celebrant photos and schedule appear in two places — admin configuration panel (setup) and download page (guest viewing).

### User Experience

- **Download Page**: The public page served at the QR code URL. Guests see event details, a "Download Birthday Program PDF" button, celebrant gallery, and schedule timeline.
- **Static QR Code**: A single QR code pointing to the download page URL. Printed on invitations or shared digitally — all guests scan the same code.
- **Acoustic Synthesizer**: Web Audio API oscillator beeps (success/error sounds) used in the admin panel for feedback cues.

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

## Deployment

The app is designed for deployment on **Render** (free tier) as a Node.js web service. Key deployment details:

| Aspect         | Detail                                                   |
| -------------- | -------------------------------------------------------- |
| **Platform**   | Render (render.com) — Free tier                          |
| **Runtime**    | Node.js v20 LTS (pinned via `.node-version`)             |
| **Database**   | SQLite (ephemeral on free tier, persistent disk on paid) |
| **Port**       | `process.env.PORT` (Render default: 10000)               |
| **Host**       | `0.0.0.0` binding required                               |
| **Public URL** | Set via `HOST` env var for QR code generation            |
| **HTTPS**      | Automatic (Render-managed TLS)                           |
| **PWA**        | Manifest + Service Worker for installable guest page     |

### Required Environment Variables (Render Dashboard)

- `ADMIN_PASSWORD` — Master password for admin panel
- `HOST` — Public URL (e.g., `https://birthday-program.onrender.com`)

### Deployment Files

| File                             | Purpose                                   |
| -------------------------------- | ----------------------------------------- |
| [`render.yaml`](render.yaml)     | Render Blueprint (Infrastructure as Code) |
| [`.node-version`](.node-version) | Pin Node.js to v20 LTS                    |
| [`.nvmrc`](.nvmrc)               | Alternative Node.js version pin           |
| [`.env.example`](.env.example)   | Environment variable template             |

### Full Deployment Guide

See [`.scratch/qr-event-scanner/deployment/render-deployment-guide.md`](.scratch/qr-event-scanner/deployment/render-deployment-guide.md) for the complete step-by-step guide.

## Architectural Decisions

Past and future architectural decisions are recorded as ADRs (Architectural Decision Records) in `docs/adr/`.
