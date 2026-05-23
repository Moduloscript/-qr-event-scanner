# ADR 0008: Deployment & PWA Strategy

**Status:** Proposed

**Date:** 2026-05-22

## Context

The QR Birthday Information System currently runs only on the organizer's local machine (`localhost:3000`). For a real birthday event, guests need to access the download page from their phones by scanning a QR code. This requires:

1. **Public hosting** — the app must be reachable from any device with internet access
2. **PWA capabilities** — guests should be able to "install" the download page on their phone home screen and access it offline
3. **Zero-config for guests** — no app store, no login, no registration

The app is a single-file Express.js server with SQLite persistence. It serves static HTML/CSS/JS from a `public/` directory and exposes REST API endpoints. The database file (`database.sqlite`) is created automatically on first run.

### Constraints

- **SQLite persistence** — the database is a local file. Hosting platforms must support persistent filesystems (ephemeral filesystems lose data on restart).
- **Single-event lifecycle** — the app is configured once, used for one birthday event, then retired. Long-term persistence is not critical.
- **Low traffic** — at most a few hundred guests over a few days.
- **Budget** — free or near-free hosting preferred for a single-event utility.
- **No architectural changes** — the Express + SQLite architecture is fixed. Serverless/function-based platforms would require a full rewrite.

## Decision

### Deployment: Render (Free Tier)

We recommend **Render** ([render.com](https://render.com)) as the primary deployment platform for the following reasons:

| Factor                 | Render                                         | Fly.io                 | Railway              | VPS                 |
| ---------------------- | ---------------------------------------------- | ---------------------- | -------------------- | ------------------- |
| **Free tier**          | ✅ Yes                                         | ✅ Yes (limited)       | ✅ Yes               | ❌ (~$4/mo min)     |
| **SQLite persistence** | ✅ Yes (disk persists while service is active) | ✅ Yes (volume mounts) | ✅ Yes               | ✅ Yes              |
| **Node.js support**    | ✅ Native                                      | ✅ Native              | ✅ Native            | ✅ Manual           |
| **Setup complexity**   | Low (5 min)                                    | Medium (CLI + config)  | Low                  | High (server admin) |
| **Auto HTTPS**         | ✅ Yes                                         | ✅ Yes                 | ✅ Yes               | ❌ (manual)         |
| **Cold start**         | ⚠️ 5-10s after idle sleep                      | ✅ Always-on (paid)    | ⚠️ Similar to Render | ✅ Always-on        |
| **Custom domain**      | ✅ Yes (free)                                  | ✅ Yes                 | ✅ Yes               | ✅ Yes              |

**Render's free tier** is the best fit:

- Web service sleeps after 15 minutes of inactivity (acceptable for a birthday event — first guest waits ~5s for wake-up)
- Disk persists while the service is active
- Automatic HTTPS with `*.onrender.com` subdomain
- Deploy via GitHub repo — push to `main` triggers auto-deploy

### PWA: Service Worker + Manifest

We will add Progressive Web App support to the guest download page:

1. **Web App Manifest** (`/site.webmanifest`) — defines app name, icons, theme color, standalone display mode
2. **Service Worker** (`/sw.js`) — caches the download page shell and event info for offline access
3. **Icon placeholders** — simple gradient PNGs with a "🎂" motif (192x192 and 512x512)

**Why PWA instead of a native app:**

- Zero installation friction — guests get an "Add to Home Screen" prompt in Chrome
- Works offline — cached content renders without network
- No app store submission — updates are instant
- Maintains the core value proposition: "scan QR code, get info"

### Environment Configuration

A new `PUBLIC_URL` environment variable will control:

- QR code target URL (admin panel generation)
- PWA manifest `start_url` and `scope`
- Service worker cache scope

```env
PUBLIC_URL=https://birthday-program.onrender.com
```

## Consequences

### Positive

- **Guests can access from anywhere** — scan QR code → public URL → download page
- **Installable on home screen** — Android Chrome shows "Add to Home Screen" prompt
- **Offline access** — once loaded, the download page works without internet
- **Free hosting** — no cost for a single-event deployment
- **Auto HTTPS** — secure connection, no mixed-content warnings
- **Git-based deployment** — push to GitHub, Render auto-deploys

### Negative

- **Cold start delay** — Render free tier sleeps after 15min idle. First request after idle takes ~5s to wake. Acceptable for a birthday event.
- **SQLite data loss on restart** — Render's free tier disk is ephemeral (data persists while service is active but may be lost on service re-deploy). Mitigation: export the database file before making changes, or upgrade to Render's paid tier ($7/mo) with persistent disk.
- **No iOS "Add to Home Screen" prompt** — Safari does not show the install prompt for PWAs. iOS users can still bookmark the page. This is a known Safari limitation.
- **Service worker scope** — the service worker only controls the download page. The admin panel (`/`) is excluded from caching for security.

### Keep-Alive Strategy (Cron Job)

To prevent the free tier from spinning down during event hours, we use a **dedicated lightweight health endpoint** pinged by an external cron service.

#### Decision: Dedicated `/api/health` Endpoint

We add a new public GET endpoint at `/api/health` that:

- Returns `{ status: "ok", timestamp: "<ISO-8601>" }` with HTTP 200
- Does **not** query the database (zero load)
- Does **not** require authentication
- Responds in under 10ms

**Why a dedicated endpoint instead of reusing `/api/event/info`?**

| Factor         | `/api/event/info`                   | `/api/health`         |
| -------------- | ----------------------------------- | --------------------- |
| Database query | ✅ Yes — reads `event_config` table | ❌ No — zero DB load  |
| Response size  | ~1-10 KB (full event payload)       | ~50 bytes             |
| Latency        | ~5-50ms (depends on DB)             | <1ms                  |
| Purpose        | Business data for guests            | Infrastructure health |
| Log noise      | High (full payload logged)          | Minimal (single line) |

Reusing `/api/event/info` would add unnecessary database load every 10 minutes for no benefit. A health endpoint is the standard pattern.

#### Decision: cron-job.org as Keep-Alive Provider

We use [cron-job.org](https://cron-job.org) because:

| Factor               | cron-job.org      | UptimeRobot                     | Pingdom              |
| -------------------- | ----------------- | ------------------------------- | -------------------- |
| **Free tier**        | ✅ Unlimited jobs | ✅ 50 monitors (5-min interval) | ❌ Free tier removed |
| **Interval**         | Down to 1 minute  | 5 minutes minimum               | N/A                  |
| **Account required** | ✅ Yes (email)    | ✅ Yes                          | ✅ Yes               |
| **Setup time**       | 2 minutes         | 5 minutes                       | 10+ minutes          |
| **SLA**              | None (free)       | None (free)                     | Paid only            |

cron-job.org is the simplest option: create a free account, add one job pointing to `https://qr-event-scanner.onrender.com/api/health` at 10-minute intervals.

**Trade-off:** cron-job.org has no SLA. If their service is down, the Render service may spin down. Acceptable because:

- The event is a single-day affair
- If the service spins down, the organizer reconfigures via admin panel (5 minutes)
- The cron job is a mitigation, not a guarantee

### Data Persistence Strategy

For a single-birthday event, data persistence requirements are minimal:

1. Organizer configures the event once (admin panel)
2. Guests view/download over a few days
3. After the event, the app is retired

**If Render re-deploys and the SQLite file is lost:**

- The organizer re-enters the event details (takes 5 minutes)
- The PDF and photos are re-uploaded

**For production use (optional):**

- Upgrade to Render's paid tier ($7/mo) for persistent disk
- Or use a cron job to back up `database.sqlite` to cloud storage

## Alternatives Considered

### Fly.io with SQLite Volume

Fly.io supports persistent SQLite volumes and has a free tier. However, setup requires installing the Fly CLI, creating a `fly.toml` config, and managing volume mounts. The complexity is higher than Render's git-push deployment.

### Railway

Railway is similar to Render but has a more restrictive free tier (limited monthly credits). For a single-event app, Render's truly free tier is preferable.

### VPS (Hetzner / DigitalOcean Droplet)

A VPS gives full control but requires manual Node.js installation, process management (PM2), firewall configuration, SSL certificate setup (Let's Encrypt), and ongoing maintenance. Overkill for a single-birthday event.

### Serverless (Vercel / Cloudflare Workers)

Would require rewriting the Express server as serverless functions and replacing SQLite with an external database (Turso, Neon, or Supabase). This is a significant architectural change that contradicts the PRD's "zero-config, fully portable" principle.

---

**Status:** Proposed — awaiting organizer's decision on deployment platform and custom domain preference.
