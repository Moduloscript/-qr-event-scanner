Status: implemented (verified)

## What to build

Create the public download page (`download.html`) that guests see when they scan the QR code, and add PDF upload capability to the admin panel. The app serves a single specific birthday event.

This is the **frontend** slice — the public-facing page and the admin upload UI.

## Acceptance criteria

### Public Download Page (`download.html`)

- [x] Page loads birthday event info from `GET /api/event/info` (no auth required)
- [x] Displays birthday event name, venue, date/time prominently at the top
- [x] Shows a prominent **"Download Birthday Program PDF"** button
- [x] Clicking the button triggers `GET /api/event/download` which downloads the PDF file
- [x] If no PDF is configured, the download button is hidden and a message "Program PDF coming soon" is shown instead
- [x] Shows celebrant gallery (horizontal photo strip with names/roles) when celebrants are configured
- [x] Shows order-of-event schedule timeline when schedule items are configured
- [x] Sections that have no data are hidden (graceful empty state)
- [x] Responsive, mobile-first design (most guests will scan on phones)
- [x] Entry animation (card fade-in with staggered section reveals)

### Admin Panel — PDF Upload

- [x] Admin config panel (`public/index.html`) gains a **"Birthday Program PDF"** file upload field
- [x] File input accepts only `.pdf` files (`accept=".pdf"`)
- [x] On file selection, the PDF is converted to a base64 data URI client-side using `FileReader`
- [x] The base64 data URI is included in the `POST /api/admin/config` body as `program_pdf`
- [x] When a PDF is already configured, the admin panel shows "PDF uploaded (X KB)" with a "Replace" button
- [x] Admin panel shows a "Generate QR Code" button that generates a QR code image pointing to the download page URL using `qrcode.min.js`
- [x] The generated QR code is displayed below the button and can be right-click saved or screenshot

### Admin Panel — Guest Management Removal

- [x] Guest table, add-guest form, CSV upload, and edit/delete buttons are removed from the admin dashboard
- [x] Stats cards (total guests, checked-in, capacity) are removed
- [x] The admin dashboard shows only: event config form, Event Story form, PDF upload, QR generator

### Files to create/modify

- `public/download.html` — new file, public download page
- `public/js/download.js` — new file, download page logic
- `public/index.html` — remove guest management, add PDF upload + QR generator
- `public/js/admin.js` — remove guest CRUD functions, add PDF upload + QR generation logic
- `public/css/styles.css` — may need minor additions for download page styles

## Blocked by

Issue 11 (Simplify DB Schema + API) — the `program_pdf` column and `GET /api/event/download` endpoint must exist first

## Notes

AFK because the patterns are well-established: `fetch` → render pattern from `ticket.js`, base64 upload pattern from celebrant photo upload in `admin.js`, QR generation from `ticket.js`.
