# AGENTS.md — QR Code Event Access System

## Project Context

This repository contains the codebase and requirements for a lightweight, secure **Single-Event QR Code Access System** that allows organizers to manage guest check-ins.

## Key Documents

| File                                                       | Purpose                                                                    |
| ---------------------------------------------------------- | -------------------------------------------------------------------------- |
| [`PRD.md`](PRD.md)                                         | Core product requirements, database schema design, cryptographic protocols |
| [`verify.js`](verify.js)                                   | Automated endpoint integration verification tests                          |
| [`.scratch/qr-event-scanner/`](.scratch/qr-event-scanner/) | Issue tracker — PRD-derived vertical-slice issues                          |
| [`.roomodes`](.roomodes)                                   | Project-specific Zoo Code mode definitions                                 |
| [`CONTEXT.md`](CONTEXT.md)                                 | Domain glossary and project context                                        |

## Development Workflow

```
PRD.md ──> .scratch/<feature>/issues/<NN>-<slug>.md ──> implementation ──> verify.js
```

1. **PRD** ([`PRD.md`](PRD.md)) defines all requirements, schema, and API contracts.
2. **Issues** (`.scratch/<feature>/issues/`) are vertical-slice breakdowns of PRD gaps, each cutting through schema → API → UI → tests.
3. **Implementation** follows the issue's acceptance criteria, always respecting TDD (RED → GREEN → REFACTOR).
4. **Verification** runs [`node verify.js`](verify.js) before committing.

### Issue triage labels

- `ready-for-agent` — AFK (autonomous) slice, agent can implement independently
- `ready-for-human` — HITL (human-in-the-loop) slice, requires human review/decision

See [`docs/agents/triage-labels.md`](docs/agents/triage-labels.md) for the full label vocabulary.

## Important Conventions

- **Cryptographic Security First**: Always verify HMAC-SHA256 signatures of QR codes offline _before_ performing database updates to prevent overhead and denial-of-service from tampered payloads.
- **Master Authentication**: Use simple environment secrets (`ADMIN_PASSWORD`, `SCANNER_TOKEN`, `SIGNING_KEY`) rather than multi-user table schemes.
- **Sensory Feedback**: Scanner pages must play success (high-pitched beep) and error (double-buzz) sounds via the browser Web Audio API to facilitate rapid check-ins in loud environments.
- **Zero External Assets**: Maintain the self-contained Web Audio API synthesizer instead of downloading audio files.
- **Event Story (Celebrants + Schedule)**: Celebrant photos are stored as base64 data URIs in `event_config.celebrants_json` to keep the database fully portable. The order-of-event schedule is stored as JSON in `event_config.event_schedule_json`. Both are served via `GET /api/event/info` (public) and included in the `POST /api/scanner/validate` VALID response.
- **Three-Touchpoint Display**: The Event Story feature renders celebrant photos and schedule in three places — admin config panel (setup), guest ticket page (anticipation), and scanner VALID overlay (warm greeting).

## TDD (Test-Driven Development) - MANDATORY

**Every feature follows RED → GREEN → REFACTOR:**

1. **RED**: Write failing tests/assertions _before_ modifying or introducing server APIs.
2. **GREEN**: Write the minimal code changes necessary to pass the tests.
3. **REFACTOR**: Clean up and optimize the implementation while keeping all tests green.

Before committing, run the automated integration tests:

```bash
node verify.js
```

## Agent skills

### Issue tracker

Local markdown in `.scratch/`. See [`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md).

### Triage labels

Canonical roles mapped to matching labels. See [`docs/agents/triage-labels.md`](docs/agents/triage-labels.md).

### Domain docs

Single-context layout (`CONTEXT.md` + `docs/adr/`). See [`docs/agents/domain.md`](docs/agents/domain.md).

### Project modes

Project-specific Zoo Code modes defined in [`.roomodes`](.roomodes). These extend the built-in modes with QR-scanner-specific instructions and file access patterns.
