Status: implemented (verified)

## What to build

Clean up the codebase after the architecture pivot — remove orphaned files, update documentation, and ensure the project reflects the new Birthday Information QR scope. The app is for a single specific birthday event.

This is the **polish** slice — no new features, just cleanup and documentation alignment.

## Acceptance criteria

### File Cleanup

- [x] `public/ticket.html` is deleted (replaced by `download.html`)
- [x] `public/js/ticket.js` is deleted (replaced by `download.js`)
- [x] `public/scanner.html` is deleted (no longer needed)
- [x] `public/js/scanner.js` is deleted (no longer needed)
- [x] `src/crypto.js` is confirmed deleted (should have been removed in Issue 11)
- [x] `public/js/qrcode.min.js` is kept (still used by admin panel QR generator)

### Documentation Updates

- [x] `PRD.md` is rewritten to reflect the Birthday Information QR scope (see companion PRD update)
- [x] `CONTEXT.md` is updated:
  - Remove access control glossary terms (HMAC, scanner token, admin password as auth concept)
  - Add new terms: birthday program PDF, download page, static QR code
  - Update "Three-Touchpoint Display" to reflect new touchpoints
- [x] `AGENTS.md` is updated:
  - Remove references to scanner, crypto, guest management
  - Update development workflow to reflect simplified scope
  - Update important conventions section
- [x] `docs/adr/0005-event-story-celebrants-and-schedule.md` status changed to `Superseded by ADR 0006`
- [x] `docs/adr/0006-architecture-pivot-to-information-qr.md` status changed to `Accepted`

### Issue Tracker Cleanup

- [x] Old issues (01-10) are marked as `superseded` with a note linking to ADR 0006
- [x] New issues (11-13) are the active issue set

### Verify

- [x] `node verify.js` passes with the rewritten tests from Issue 11
- [x] Server starts without errors
- [x] Admin panel loads without console errors
- [x] Download page loads without console errors
- [x] No dead code references remain (e.g., no imports of deleted modules)

## Blocked by

Issue 11 (Simplify DB Schema + API) — ✅ must be implemented first
Issue 12 (Download Page + PDF Upload) — ✅ must be implemented first

## Notes

HITL because file deletion and documentation rewrites should be reviewed by a human before committing. The PRD rewrite in particular needs client sign-off.
