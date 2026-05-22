Status: implemented

## What was built

Guest editing feature — API endpoint and admin UI — allowing the organizer to correct typos or update guest details (name, email, ticket tier) without deleting and re-adding the guest.

When the guest's name changes, the HMAC-SHA256 signature is re-generated since the name is part of the signed payload. Email changes enforce uniqueness constraints.

## Acceptance criteria (verified)

- [x] `PUT /api/admin/guests/:id` accepts `{ name, email, ticket_tier }` and updates the guest record
- [x] If `name` changes, a new HMAC-SHA256 signature is computed and stored; the response includes the new signature
- [x] If `email` changes, duplicate email check is enforced (400 on conflict)
- [x] Admin guest table shows an "Edit" button per row that opens an inline modal/form
- [x] The edit form is pre-populated with current guest data
- [x] On successful edit, the guest table refreshes and the new signature is reflected in the ticket link
- [x] `verify.js` includes tests 10-13: edit guest name → verify new signature → scan with new sig succeeds → scan with old sig fails → duplicate email blocked

## Files changed

- [`src/server.js`](../../src/server.js:246-297) — Added `PUT /api/admin/guests/:id` endpoint
- [`public/js/admin.js`](../../public/js/admin.js:314-361) — Added `openEditModal()`, `closeEditModal()`, edit form submit handler, "Edit" button in `renderGuestTable()`
- [`public/index.html`](../../public/index.html:102-129) — Added edit modal overlay with form fields
- [`verify.js`](../../verify.js:240-333) — Added tests 10-13 for edit → re-sign → scan verification

## Verification

All 13 integration tests pass: `node verify.js` ✅
