> **SUPERSEDED** — This issue belongs to the original Access Control architecture. Per [ADR 0006](../../../docs/adr/0006-architecture-pivot-to-information-qr.md), the project has pivoted to a Birthday Information QR scope. The scanner overlay is no longer needed — the scanner feature is entirely removed.

Status: superseded

## What to build

Add the Event Story display to the scanner VALID overlay — celebrant photos shown briefly on successful check-in — so door staff can greet guests personally with knowledge of who is being celebrated.

This is the **scanner frontend** slice. It builds on the API from issue 07.

## Acceptance criteria

### Celebrant Display on VALID Scan

- [ ] When a scan returns `VALID` status with a `celebrants` array, the overlay shows celebrant photos
- [ ] Celebrant photos display as circular thumbnails (60x60px) in a horizontal row
- [ ] Below each photo: celebrant name (small text)
- [ ] The celebrant section appears below the guest name/tier but above the auto-dismiss timer
- [ ] Section is hidden when no celebrants are configured (empty array or missing field)

### Behavior

- [ ] Celebrant display does NOT delay the auto-dismiss (still dismisses after configured delay)
- [ ] Celebrant display does NOT appear on DUPLICATE, INVALID_SIGNATURE, or CAPACITY_EXCEEDED overlays
- [ ] Works with both camera scan and manual check-in flows

### Data Flow

- [ ] `public/js/scanner.js` extracts `celebrants` from the validate response and passes it to `showFeedbackOverlay()`
- [ ] `showFeedbackOverlay()` renders celebrant photos when status is `VALID` and `celebrants` array is non-empty

### Visual Design

- [ ] Celebrant photos use the existing circular thumbnail style
- [ ] Text is white on the green overlay background
- [ ] Does not clutter the overlay — compact, elegant presentation

## Blocked by

Issue 07 (Event Story DB Schema + API) — ✅ resolved
Issue 08 (Event Story Admin UI) — ✅ resolved

## Notes

AFK because the scanner overlay rendering pattern is well-established in scanner.js. The celebrant section is a simple conditional render within the existing `showFeedbackOverlay()` function.
