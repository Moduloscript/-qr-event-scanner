# Issue 17: Keep-Alive Endpoint + Cron-Job.org Setup

**Status:** `ready-for-agent`

**Labels:** `enhancement`, `deployment`, `ops`

**Slice:** Schema → API → Config → Docs

---

## Problem

The Render free tier spins down the web service after **15 minutes of inactivity**. When the service spins down:

1. The SQLite database file (`database.sqlite`) is **lost** — all event configuration (PDF, celebrants, schedule) must be re-entered via the admin panel.
2. Guests scanning the QR code experience a **~1 minute cold start** delay while Render boots the service.
3. If spin-down happens during the event, the organizer must scramble to reconfigure.

The deployment guide ([`render-deployment-guide.md`](../deployment/render-deployment-guide.md)) mentions using [cron-job.org](https://cron-job.org) to ping the service every 10 minutes, but:

- The currently suggested endpoint (`/api/event/info`) is a **heavy** endpoint that reads from the database and returns the full event payload. It's not designed for health-check traffic.
- There is **no lightweight keep-alive endpoint** that minimizes server load.
- There are **no step-by-step instructions** for setting up cron-job.org.
- The service worker and PWA manifest also need to be served correctly during keep-alive pings.

---

## Acceptance Criteria

### 1. Lightweight `/api/health` Endpoint (Server)

Add a new public GET endpoint at [`/api/health`](../../src/server.js) that:

- Returns `{ status: "ok", timestamp: "<ISO-8601>" }` with HTTP 200
- Does **not** query the database (zero DB load)
- Does **not** require authentication
- Responds in under 10ms
- Logs a minimal message like `[HEALTH] Keep-alive ping from <IP>` at `debug` level (not `info`, to avoid log noise)

**Rationale:** A dedicated health endpoint is the standard pattern for load balancers, monitoring, and keep-alive cron jobs. It decouples the keep-alive mechanism from the business logic.

### 2. Update cron-job.org Target

Change the cron-job.org target URL from `/api/event/info` to `/api/health`.

### 3. Step-by-Step cron-job.org Setup Guide

Update the deployment guide with a complete, copy-pasteable setup walkthrough including:

- Account creation at cron-job.org
- Creating a new cron job
- Setting the URL to `https://qr-event-scanner.onrender.com/api/health`
- Setting interval to "Every 10 minutes"
- Setting method to GET
- Enabling "Save responses" (optional, for debugging)
- Testing the cron job (manual run)
- Verifying it works (check Render logs for the health ping)

### 4. Update ADR 0008

Document the keep-alive strategy decision in [`docs/adr/0008-deployment-and-pwa-strategy.md`](../../docs/adr/0008-deployment-and-pwa-strategy.md):

- Why a dedicated `/api/health` endpoint instead of reusing `/api/event/info`
- Why cron-job.org instead of other uptime monitors (UptimeRobot, Pingdom, etc.)
- Trade-off: cron-job.org is free but has no SLA — acceptable for a single-event app

### 5. Update verify.js

Add a test for the new `/api/health` endpoint:

- `GET /api/health` returns `200` with `{ status: "ok", timestamp: "<string>" }`
- Response includes a valid ISO-8601 timestamp

---

## Implementation Notes

### Server Code Change

Add before the existing routes (after line 32 in [`src/server.js`](../../src/server.js)):

```js
// Lightweight health check endpoint for keep-alive cron jobs
// Does NOT query the database — zero load
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});
```

### verify.js Test

Add after the existing tests (before the cleanup section):

```js
// ==========================================
// TEST N: Health check endpoint
// ==========================================
console.log("[TEST] N. Testing health check endpoint...");
const healthRes = await makeRequest("GET", "/api/health");
assert.strictEqual(
  healthRes.status,
  "ok",
  "Health check should return status ok",
);
assert.ok(healthRes.timestamp, "Health check should include timestamp");
assert.ok(
  Date.parse(healthRes.timestamp),
  "Timestamp should be valid ISO-8601",
);
console.log("[TEST] N. PASSED — Health check endpoint works");
```

---

## Files to Modify

| File                                                                                                          | Change                                              |
| ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| [`src/server.js`](../../src/server.js)                                                                        | Add `/api/health` GET endpoint                      |
| [`verify.js`](../../verify.js)                                                                                | Add health check test                               |
| [`.scratch/qr-event-scanner/deployment/render-deployment-guide.md`](../deployment/render-deployment-guide.md) | Update cron-job.org section with step-by-step guide |
| [`docs/adr/0008-deployment-and-pwa-strategy.md`](../../docs/adr/0008-deployment-and-pwa-strategy.md)          | Add keep-alive strategy decision                    |

---

## Verification

1. Run `node verify.js` — all tests pass including the new health check test
2. Start the server locally, hit `GET /api/health` — returns `{ status: "ok", timestamp: "..." }`
3. Hit `GET /api/event/info` — still works as before (no regression)
4. Confirm the cron-job.org setup instructions are complete enough for a non-technical organizer to follow
