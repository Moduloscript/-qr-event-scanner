Status: ready-for-agent

## What to build

Add the Event Story admin configuration UI — celebrant photo uploader and order-of-event schedule editor in the admin panel — so the organizer can configure celebrant photos (with names/roles) and the event program timeline.

This is the **admin frontend** slice. It builds on the API from issue 07.

## Acceptance criteria

### Celebrant Upload Section

- [ ] Admin panel shows a new "Event Story" section below existing config fields
- [ ] "Celebrants" subsection has an "Add Celebrant" button
- [ ] Each celebrant entry has: Name (text input), Role (text input, e.g., "Bride", "Groom"), Photo (file input → preview)
- [ ] Photo file input accepts `image/jpeg`, `image/png`, `image/webp`
- [ ] Selected photo shows a preview thumbnail (max 150x150px) before upload
- [ ] On form submit, photos are converted to base64 data URIs client-side and sent as JSON
- [ ] Maximum 10 celebrants (UI enforces this limit)
- [ ] Each celebrant entry has a "Remove" button
- [ ] Existing celebrants are pre-populated when editing config

### Schedule Editor Section

- [ ] "Order of Event" subsection has an "Add Item" button
- [ ] Each schedule item has: Time (text input, e.g., "16:00"), Title (text input), Description (textarea, optional)
- [ ] Items are displayed in order with drag-to-reorder or up/down arrow buttons
- [ ] Each item has a "Remove" button
- [ ] Existing schedule items are pre-populated when editing config

### Save Behavior

- [ ] "Save Configuration" button submits all fields (event config + celebrants + schedule) in one request
- [ ] On success, celebrant gallery and schedule preview update in the UI
- [ ] On error, error message is displayed

### Visual Design

- [ ] Celebrant photos display as circular thumbnails with name/role label below
- [ ] Schedule displays as a vertical timeline with time on the left, title/description on the right
- [ ] Matches existing glass-panel aesthetic

## Blocked by

Issue 07 (Event Story DB Schema + API)

## Notes

AFK because the pattern (form → fetch → refresh) is identical to existing config update flow in admin.js. The base64 conversion is done client-side using FileReader API.
