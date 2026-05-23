# ADR 0007: Inline PDF Viewer — Read PDF Inside the Download Page

**Status:** Proposed

**Date:** 2026-05-22

## Context

The download page ([`public/download.html`](public/download.html)) currently serves the birthday program PDF via [`GET /api/event/download`](src/server.js:80) with `Content-Disposition: attachment`. This forces the browser to **download** the file to the device rather than display it inline.

For the primary use case — a guest scanning a QR code on their phone — this creates friction:

1. The guest must locate the downloaded file in their phone's file manager
2. The guest needs a PDF reader app installed
3. The guest leaves the browser context entirely

The organizer has requested that the PDF be **readable directly within the app** — the guest should see the program content immediately without downloading or leaving the page.

This is consistent with the Information QR philosophy established in [ADR 0006](docs/adr/0006-architecture-pivot-to-information-qr.md): the QR code is an **information source**, and the information should be instantly accessible.

## Decision

We will add a new endpoint `GET /api/event/pdf-view` that serves the PDF with `Content-Disposition: inline`, and embed it in the download page using an `<iframe>` element.

### Why `<iframe>` over alternatives

| Option         | Decision               | Rationale                                                                                                               |
| -------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **`<iframe>`** | ✅ **Chosen**          | Works on iOS Safari (opens native PDF viewer) and Android Chrome (built-in PDF viewer). Simple, zero dependencies.      |
| **`<embed>`**  | ❌ Rejected            | Inconsistent behavior across mobile browsers — some ignore `Content-Disposition: inline` and download anyway.           |
| **PDF.js**     | ❌ Rejected (deferred) | Adds ~200KB dependency. Can be adopted as a follow-up if cross-browser issues arise. Overkill for a single-PDF display. |
| **`<object>`** | ❌ Rejected            | Less common, inconsistent fallback behavior on mobile.                                                                  |

### Why a new endpoint instead of modifying the existing one

The existing [`GET /api/event/download`](src/server.js:80) endpoint serves the PDF as an **attachment** (triggers browser download). We considered three approaches:

| Approach                                                        | Pros                                                                            | Cons                                                                            |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **A. New `/api/event/pdf-view` endpoint**                       | ✅ Clean separation of concerns. Both behaviors available. No breaking changes. | Slight code duplication (mitigated by shared helper).                           |
| **B. Query param on existing endpoint** (`?disposition=inline`) | Single endpoint.                                                                | More complex routing. Harder to test. Breaks existing download links.           |
| **C. Change existing endpoint to `inline`**                     | Simplest.                                                                       | Breaks the download button. Guests who want to save the file lose that ability. |

**Decision: Approach A** — a new endpoint with a shared `servePdf()` helper to avoid duplication.

### Shared helper pattern

Extract the PDF-serving logic into a `servePdf(res, config, disposition)` function. Both endpoints become thin wrappers:

```js
app.get("/api/event/download", /* ... */ servePdf(res, config, "attachment"));
app.get("/api/event/pdf-view", /* ... */ servePdf(res, config, "inline"));
```

This keeps the code DRY and makes future changes (e.g., adding caching headers) trivial.

## Consequences

### Positive

- **Guests read the PDF immediately** — no download step, no file manager, no app switching
- **Both behaviors available** — inline viewing is primary, download remains as secondary option
- **No external dependencies** — uses native browser PDF rendering
- **Backward compatible** — existing download endpoint and tests unchanged
- **Mobile-friendly** — iOS and Android handle PDF-in-iframe well

### Negative

- **Slight code duplication** mitigated by shared helper
- **Some older Android browsers** may still download the PDF instead of rendering inline (mitigated by secondary download button)
- **No custom controls** — relies on browser-native PDF toolbar (zoom, scroll, search)

### Neutral

- The `has_program_pdf` flag already exists in [`GET /api/event/info`](src/server.js:53) response — frontend can use it to toggle viewer visibility
- PDF is still stored as base64 in the database — no change to storage model

## Related

- [ADR 0006](docs/adr/0006-architecture-pivot-to-information-qr.md) — Architecture pivot that established the Information QR paradigm
- [Issue 14](.scratch/qr-event-scanner/issues/14-inline-pdf-viewer.md) — Implementation issue
- [Issue 12](.scratch/qr-event-scanner/issues/12-download-page-and-pdf-upload.md) — Original download page implementation
