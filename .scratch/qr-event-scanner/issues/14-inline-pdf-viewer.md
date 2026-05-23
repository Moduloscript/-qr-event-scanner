# Issue 14: Inline PDF Viewer — Read PDF Inside the Download Page

**Status:** ✅ `completed`

**Labels:** `enhancement`, `frontend`, `api`

**Dependencies:** Issue 12 (Download Page + PDF Upload) — ✅ Complete

---

## Problem

Currently, when a guest taps "Download Birthday Program PDF" on the download page, the PDF is served with `Content-Disposition: attachment`, which forces the browser to **download** the file to the device. On mobile phones (the primary use case — guests scan a QR code), this creates friction:

1. The guest must locate the downloaded file in their file manager
2. The guest needs a PDF reader app installed
3. The guest leaves the browser context

The user wants the PDF to be **readable inline** — displayed directly within the download page so the guest can scroll through it immediately, without leaving the browser or managing files.

---

## Acceptance Criteria

### 1. New API Endpoint: `GET /api/event/pdf-view`

**Purpose:** Serve the PDF with `Content-Disposition: inline` instead of `attachment`, so browsers render it in-page or in a new tab viewer.

**Specification:**

| Field               | Value                                                   |
| ------------------- | ------------------------------------------------------- |
| Method              | `GET`                                                   |
| Path                | `/api/event/pdf-view`                                   |
| Auth                | None (public)                                           |
| Content-Type        | `application/pdf`                                       |
| Content-Disposition | `inline; filename="birthday-program.pdf"`               |
| Error (no PDF)      | `404 { error: "No program PDF has been uploaded yet" }` |

**Implementation notes:**

- Reuse the same base64-to-buffer logic from [`GET /api/event/download`](src/server.js:80)
- Only difference is `Content-Disposition: inline` vs `attachment`
- Consider extracting the PDF-serving logic into a shared helper function to avoid duplication

### 2. Update Download Page UI

**File:** [`public/download.html`](public/download.html)

Replace the current download button with an **embedded PDF viewer**:

```
┌─────────────────────────────────┐
│  Hero Section (event info)      │
├─────────────────────────────────┤
│  ┌───────────────────────────┐  │
│  │                           │  │
│  │   Embedded PDF Viewer     │  │
│  │   (iframe or <embed>)     │  │
│  │                           │  │
│  │   Scrolling, zoomable     │  │
│  │                           │  │
│  └───────────────────────────┘  │
│                                 │
│  [Download PDF] (secondary)     │
│                                 │
│  Celebrant Gallery              │
│  Schedule Timeline              │
└─────────────────────────────────┘
```

**States:**

| State             | UI                                                                         |
| ----------------- | -------------------------------------------------------------------------- |
| **Loading**       | Skeleton placeholder or spinner inside the viewer area                     |
| **PDF available** | Embedded `<iframe>` or `<embed>` element pointing to `/api/event/pdf-view` |
| **No PDF**        | Message: "Program PDF coming soon" (current behavior)                      |
| **Error**         | Error message with retry option                                            |

**Implementation options (choose one):**

| Option                | Pros                                                      | Cons                                |
| --------------------- | --------------------------------------------------------- | ----------------------------------- |
| **A. `<embed>` tag**  | Simple, native browser PDF renderer                       | Inconsistent across mobile browsers |
| **B. `<iframe>`**     | Works on most browsers, scrollable                        | Some browsers still download        |
| **C. PDF.js library** | Consistent rendering across all browsers, custom controls | Adds ~200KB dependency              |
| **D. `<object>` tag** | Fallback behavior, native renderer                        | Less common, inconsistent           |

**Recommendation:** Start with **Option B (`<iframe>`)** for simplicity, then optionally upgrade to **Option C (PDF.js)** if cross-browser issues arise.

### 3. Keep Download Button as Secondary Option

The existing "Download PDF" button should remain but be demoted to a secondary action below the viewer — some guests may still want to save the file for offline access.

### 4. Update Tests

**File:** [`verify.js`](verify.js)

Add test(s):

| #   | Test                                              | Assertion                                                                |
| --- | ------------------------------------------------- | ------------------------------------------------------------------------ |
| 14a | `GET /api/event/pdf-view` returns PDF             | Status 200, Content-Type `application/pdf`, Content-Disposition `inline` |
| 14b | `GET /api/event/pdf-view` returns 404 when no PDF | Status 404, error message                                                |
| 14c | Download button still works                       | `GET /api/event/download` still returns `attachment` disposition         |

### 5. Update PRD

**File:** [`PRD.md`](PRD.md)

- Add `GET /api/event/pdf-view` to the API Contracts section (4.3 Public Endpoints)
- Update User Story 8 (guest): "As a guest, I want to **view** the birthday event program PDF inline on the page, so that I can read it immediately without downloading"

---

## Technical Design

### Shared PDF Helper

Extract the PDF-serving logic from [`GET /api/event/download`](src/server.js:80) into a helper function:

```js
// src/server.js
function servePdf(res, config, disposition) {
  const matches = config.program_pdf.match(
    /^data:application\/pdf;base64,(.+)$/,
  );
  if (!matches) {
    return res.status(500).json({ error: "Invalid program PDF data format" });
  }
  const pdfBuffer = Buffer.from(matches[1], "base64");
  const safeName = (config.event_name || "birthday-program")
    .replace(/[^a-zA-Z0-9-_\s]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `${disposition}; filename="${safeName}.pdf"`,
  );
  res.setHeader("Content-Length", pdfBuffer.length);
  res.send(pdfBuffer);
}
```

Then both endpoints become thin wrappers:

```js
app.get("/api/event/download", async (req, res) => {
  /* ... */ servePdf(res, config, "attachment");
});
app.get("/api/event/pdf-view", async (req, res) => {
  /* ... */ servePdf(res, config, "inline");
});
```

### Frontend Integration

In [`public/js/download.js`](public/js/download.js), after loading event info:

```js
// Inside the DOMContentLoaded handler
const pdfViewer = document.getElementById("pdf-viewer");
const pdfPlaceholder = document.getElementById("pdf-placeholder");

if (data.has_program_pdf) {
  pdfPlaceholder.style.display = "none";
  pdfViewer.style.display = "block";
  pdfViewer.src = "/api/event/pdf-view";
} else {
  pdfPlaceholder.style.display = "block";
  pdfViewer.style.display = "none";
}
```

### Mobile Considerations

- On **iOS Safari**, `<iframe>` with a PDF URL opens the PDF in the native viewer — good UX.
- On **Android Chrome**, `<iframe>` with a PDF URL shows the PDF inline with a built-in PDF viewer — good UX.
- On **older Android browsers**, the PDF may download instead of rendering inline. The secondary download button serves as fallback.

---

## Files to Modify

| File                                             | Change                                                                     |
| ------------------------------------------------ | -------------------------------------------------------------------------- |
| [`src/server.js`](src/server.js)                 | Add `GET /api/event/pdf-view` endpoint, extract shared `servePdf()` helper |
| [`public/download.html`](public/download.html)   | Add `<iframe>` or `<embed>` element for PDF viewer, update layout          |
| [`public/js/download.js`](public/js/download.js) | Wire up PDF viewer visibility based on `has_program_pdf` flag              |
| [`public/css/styles.css`](public/css/styles.css) | Add styles for embedded PDF viewer container                               |
| [`verify.js`](verify.js)                         | Add tests 14a, 14b, 14c                                                    |
| [`PRD.md`](PRD.md)                               | Update API contracts and user story 8                                      |

---

## Out of Scope

- PDF.js integration (can be a follow-up if cross-browser issues arise)
- Page-by-page navigation controls (browser native controls are sufficient)
- Text search within PDF (browser native find-in-page works)
- Annotations or highlighting
