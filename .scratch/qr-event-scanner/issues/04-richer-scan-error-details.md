Status: ready-for-agent

## What to build

Enhance the scanner overlay to show more informative error messages for each failure mode, helping door staff resolve ticket issues professionally at the door.

## Acceptance criteria

- [ ] DUPLICATE scan overlay shows: "Already checked in at {firstScannedAt time}" with the guest name
- [ ] CAPACITY_EXCEEDED overlay shows: "Venue at capacity ({currentCount}/{maxCapacity})" with the guest name
- [ ] INVALID_SIGNATURE overlay shows: "Counterfeit ticket — security signature mismatch"
- [ ] Guest not found (404 from validate) shows: "Ticket not found in guest registry"
- [ ] All error overlays auto-dismiss after 4 seconds (existing behavior preserved)
- [ ] `verify.js` asserts that DUPLICATE response body includes `firstScannedAt` and that CAPACITY_EXCEEDED includes capacity context in the error string

## Blocked by

None - can start immediately
