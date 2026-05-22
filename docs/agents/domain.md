# Domain Docs

This project uses a single-context layout for domain documentation.

## Before exploring, read these

1. **[CONTEXT.md](../../CONTEXT.md)** — Domain glossary and project context. Read this first to understand the vocabulary used throughout the codebase.
2. **[AGENTS.md](../../AGENTS.md)** — Agent instructions, development workflow, and conventions.
3. **[PRD.md](../../PRD.md)** — Product requirements document with full schema, API contracts, and user stories.
4. **[.roomodes](../../.roomodes)** — Project-specific Zoo Code mode definitions with custom instructions for each mode.

## File structure

```
CONTEXT.md          — Domain glossary
docs/adr/           — Architectural Decision Records (one file per decision)
docs/agents/        — Agent-specific documentation
  domain.md         — This file
  issue-tracker.md  — Issue tracker conventions
  triage-labels.md  — Triage label vocabulary
.scratch/           — Issue tracker (local markdown)
  <feature>/        — One directory per feature
    issues/         — Vertical-slice issues
      <NN>-<slug>.md
```

## Development workflow

```
PRD.md ──> .scratch/<feature>/issues/<NN>-<slug>.md ──> implementation ──> verify.js
```

The PRD is the single source of truth. Gaps between current implementation and PRD requirements are captured as vertical-slice issues in `.scratch/<feature>/issues/`. Each issue cuts through all layers (schema → API → UI → tests). Implementation follows TDD (RED → GREEN → REFACTOR) and must pass `node verify.js` before committing.

## Use the glossary's vocabulary

When describing the system, always use the terms defined in `CONTEXT.md`:

- "HMAC Ticket Signature" not "hash" or "token"
- "Scanner Access Token" not "API key"
- "Guest Registry" not "user table"
- "Scan Audit Logs" not "history"
- "Acoustic Synthesizer" not "sound player"

## Flag ADR conflicts

If you encounter an ADR in `docs/adr/` that contradicts a statement in `CONTEXT.md` or `PRD.md`, flag it as a conflict rather than silently choosing one. The team needs to resolve the inconsistency.
