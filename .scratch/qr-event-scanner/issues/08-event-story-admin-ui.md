> **SUPERSEDED** — This issue belongs to the original Access Control architecture. Per [ADR 0006](../../../docs/adr/0006-architecture-pivot-to-information-qr.md), the project has pivoted to a Birthday Information QR scope. The Event Story admin UI is retained in the new architecture (celebrant upload and schedule editing remain in the admin panel).

Status: superseded

## What to build

Add the Event Story admin configuration UI — celebrant photo uploader and order-of-event schedule editor in the admin panel — so the organizer can configure celebrant photos (with names/roles) and the event program timeline.

This is the **admin frontend** slice. It builds on the API from issue 07.

## Acceptance criteria

### Celebrant Upload Section

- [x] Admin panel shows a new "Event Story" section below existing config fields
- [x] "Celebrants" subsection has an "Add Celebrant" button
- [x] Each celebrant entry has: Name (text input), Role (text input, e.g., "Bride", "Groom"), Photo (file input → preview)
- [x] Photo file input accepts `image/jpeg`, `image/png`, `image/webp`
- [x] Selected photo shows a preview thumbnail (80x80px circle) before upload
- [x] On form submit, photos are converted to base64 data URIs client-side and sent as JSON
- [x] Maximum 10 celebrants (UI enforces this limit, hides Add button, shows limit message)
- [x] Each celebrant entry has a "Remove" button
- [x] Existing celebrants are pre-populated when editing config

### Schedule Editor Section

- [x] "Order of Event" subsection has an "Add Item" button
- [x] Each schedule item has: Time (text input, e.g., "16:00"), Title (text input), Description (textarea, optional)
- [x] Items are displayed in order with up/down arrow buttons for reordering
- [x] Each item has a "Remove" button
- [x] Existing schedule items are pre-populated when editing config

### Save Behavior

- [x] "Save Configuration" button submits all fields (event config + celebrants + schedule) in one request
- [x] On success, celebrant gallery and schedule preview update in the UI
- [x] On error, error message is displayed via alert

### Visual Design

- [x] Celebrant photos display as circular thumbnails with name/role label below
- [x] Schedule displays with time on the left, title/description on the right
- [x] Matches existing glass-panel aesthetic

## Blocked by

Issue 07 (Event Story DB Schema + API)

## What was built

### Files changed

| File                                           | Change                                                                                                                                                                                                                                                                                                                                |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`public/index.html`](public/index.html:372)   | Added Event Story HTML card with Celebrants + Schedule subsections, CSS styles for `.celebrant-entry`, `.celebrant-photo-preview`, `.celebrant-photo-placeholder`, `.celebrant-fields`, `.celebrant-remove`, `.schedule-entry`, `.schedule-time-input`, `.schedule-fields`, `.schedule-remove`, `.schedule-move`, `.photo-file-input` |
| [`public/js/admin.js`](public/js/admin.js:106) | Added `loadEventStoryFields()`, `addCelebrantEntry()`, `handleCelebrantPhoto()`, `removeCelebrantEntry()`, `addScheduleEntry()`, `removeScheduleEntry()`, `moveScheduleItem()`, `collectCelebrantsData()`, `collectScheduleData()`; updated `loadConfigFields()` and `handleConfigUpdate()`                                           |

### Bug fixes applied (post-implementation)

After physical testing revealed photo upload was not working, three fixes were applied to [`public/js/admin.js`](public/js/admin.js):

1. **Inline event handlers → `addEventListener`** (lines 154-178): Replaced `onchange="handleCelebrantPhoto(this.files[0], ${idx})"` set via `innerHTML` with proper `addEventListener()` calls for reliable event binding across browsers.

2. **`outerHTML` → `replaceChild()` DOM API** (lines 199-213): Replaced `placeholder.outerHTML = '<img src="..." />'` with `document.createElement('img')` + `parentNode.replaceChild()` to avoid HTML-parsing corruption of long base64 data URIs.

3. **Index-based lookups → DOM traversal** (lines 262-320): Changed `collectCelebrantsData()` and `collectScheduleData()` from `document.getElementById('celebrant-name-' + idx)` to `entry.querySelector('input[id^="celebrant-name-"]')` to prevent breakage when entries are removed/re-added with non-sequential indices.

### Verification

All 18 integration tests pass: `node verify.js` ✅
