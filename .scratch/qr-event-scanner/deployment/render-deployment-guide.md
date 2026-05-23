# Render Deployment Guide — QR Birthday Information System

> **Target:** Deploy the Express + SQLite app to Render's free tier
> **Last Updated:** 2026-05-23
> **Source:** [Render Docs — Deploy Node Express App](https://render.com/docs/deploy-node-express-app), [Render Docs — Web Services](https://render.com/docs/web-services), [Render Docs — Free Tier](https://render.com/docs/free), [Render Docs — Persistent Disks](https://render.com/docs/disks), [Render Docs — Node Version](https://render.com/docs/node-version)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites](#2-prerequisites)
3. [Step-by-Step Deployment](#3-step-by-step-deployment)
4. [Environment Variables](#4-environment-variables)
5. [SQLite Data Persistence Strategy](#5-sqlite-data-persistence-strategy)
6. [Free Tier Limitations & Workarounds](#6-free-tier-limitations--workarounds)
7. [Upgrading to Paid Tier](#7-upgrading-to-paid-tier)
8. [Custom Domain Setup](#8-custom-domain-setup)
9. [Troubleshooting](#9-troubleshooting)
10. [Deployment Checklist](#10-deployment-checklist)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    Render Web Service                │
│  ┌───────────────────────────────────────────────┐  │
│  │         Node.js Runtime (v20 LTS)             │  │
│  │  ┌─────────────┐    ┌──────────────────────┐  │  │
│  │  │  Express.js  │    │   SQLite Database    │  │  │
│  │  │  (server)    │    │  (database.sqlite)   │  │  │
│  │  └─────────────┘    └──────────────────────┘  │  │
│  │  ┌──────────────────────────────────────────┐  │  │
│  │  │  Static Assets (public/)                 │  │  │
│  │  │  - download.html (PWA-enabled)           │  │  │
│  │  │  - site.webmanifest (PWA manifest)       │  │  │
│  │  │  - sw.js (Service Worker)                │  │  │
│  │  │  - icons/ (PWA icons)                    │  │  │
│  │  └──────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────┘  │
│                                                      │
│  Port: process.env.PORT (default 10000 on Render)    │
│  Host: 0.0.0.0                                       │
└─────────────────────────────────────────────────────┘
         │
         ▼
  https://birthday-program.onrender.com
         │
         ├── Admin Panel: /index.html
         ├── Guest Page:  /download.html
         ├── API:         /api/event/info
         └── QR Code:    Points to /download.html
```

### Key Design Decisions

| Decision        | Choice                      | Rationale                                                                             |
| --------------- | --------------------------- | ------------------------------------------------------------------------------------- |
| **Platform**    | Render (Free Tier)          | Simplest setup, Node.js + SQLite supported natively                                   |
| **Runtime**     | Node.js v20 LTS             | Stable, matches local dev environment                                                 |
| **Database**    | SQLite (file-based)         | Single-file, zero-config, fully portable                                              |
| **Persistence** | Ephemeral filesystem (Free) | Data lost on spin-down/redeploy — see [Strategy](#5-sqlite-data-persistence-strategy) |
| **HTTPS**       | Automatic (Render-managed)  | Free TLS certificates included                                                        |
| **PWA**         | Manifest + Service Worker   | Guest can "install" download page on phone home screen                                |

---

## 2. Prerequisites

1. **GitHub account** (Render links to GitHub for auto-deploys)
2. **Render account** — Sign up at [dashboard.render.com/register](https://dashboard.render.com/register)
3. **Node.js v20+** locally (for testing)
4. **Git repository** with the project code pushed to GitHub

---

## 3. Step-by-Step Deployment

### 3.1 Prepare the Repository

Ensure these files are committed to your Git repository:

| File                                   | Purpose                                      |
| -------------------------------------- | -------------------------------------------- |
| [`package.json`](../../package.json)   | Node.js dependencies and start script        |
| [`src/server.js`](../../src/server.js) | Express server (binds to `0.0.0.0`)          |
| [`src/db.js`](../../src/db.js)         | SQLite database wrapper                      |
| [`public/`](../../public/)             | Static assets (HTML, CSS, JS, PWA files)     |
| [`.node-version`](../../.node-version) | Pin Node.js version (recommended: `20.18.0`) |
| [`.env.example`](../../.env.example)   | Template for environment variables           |

**Critical:** The server must bind to `0.0.0.0` (already done in [`src/server.js:313`](../../src/server.js:313)):

```js
app.listen(PORT, "0.0.0.0", () => { ... });
```

### 3.2 Create the Web Service on Render

1. Log in to [Render Dashboard](https://dashboard.render.com/)
2. Click **New > Web Service**
3. Connect your GitHub repository
4. Fill in the service creation form:

| Field             | Value                                                                        |
| ----------------- | ---------------------------------------------------------------------------- |
| **Name**          | `birthday-program` (your `onrender.com` subdomain)                           |
| **Region**        | Choose closest to your event (e.g., `Frankfurt` for Europe, `Oregon` for US) |
| **Branch**        | `main` (or your deployment branch)                                           |
| **Language**      | `Node`                                                                       |
| **Build Command** | `npm install`                                                                |
| **Start Command** | `npm start`                                                                  |
| **Instance Type** | **Free**                                                                     |

5. Click **Advanced** and add environment variables (see [Section 4](#4-environment-variables))
6. Click **Create Web Service**

### 3.3 First Deploy

Render will:

1. Pull your code from GitHub
2. Run `npm install` (build step)
3. Start the server with `npm start` → `node src/server.js`
4. Assign a URL like `https://birthday-program.onrender.com`

**Monitor progress** from your service's **Events** page in the Render Dashboard.

### 3.4 Verify Deployment

Once the deploy is live, verify:

```bash
# Check the public event info endpoint
curl https://birthday-program.onrender.com/api/event/info

# Check the admin config endpoint (should return 401 without password)
curl https://birthday-program.onrender.com/api/admin/config

# Check the PWA manifest
curl https://birthday-program.onrender.com/site.webmanifest

# Check the service worker
curl https://birthday-program.onrender.com/sw.js
```

### 3.5 Auto-Deploys

Every push to your linked branch automatically triggers a new build and deploy. If a build fails, Render cancels the deploy and your app's existing version continues running.

---

## 4. Environment Variables

Set these in the Render Dashboard under **Environment** (or in a `.env` file locally):

```env
# ── Server Configuration ──
PORT=10000                    # Render's default port (overridable)
HOST=https://birthday-program.onrender.com   # Public URL for QR code

# ── Admin Authentication ──
ADMIN_PASSWORD=your-secure-password-here    # CHANGE THIS!

# ── Node.js Version (optional, set via .node-version instead) ──
# NODE_VERSION=20.18.0
```

### How to Set on Render Dashboard

1. Go to your service → **Environment** tab
2. Add each variable:
   - `ADMIN_PASSWORD` → `your-secure-password`
   - `HOST` → `https://birthday-program.onrender.com`
3. Click **Save Changes** — Render will redeploy automatically

### Local `.env` Template

Create [`.env.example`](../../.env.example) for documentation:

```env
# Server Configuration
PORT=3000
HOST=http://localhost:3000

# Admin Authentication
ADMIN_PASSWORD=admin123
```

---

## 5. SQLite Data Persistence Strategy

### The Problem

Render's **Free tier** has an [ephemeral filesystem](https://render.com/docs/free#local-files-lost-on-redeploy):

- Data written to the filesystem (including `database.sqlite`) is **lost** every time the service:
  - Spins down after 15 minutes of inactivity
  - Redeploys (on git push)
  - Restarts

### Strategy A: Free Tier — Manual Seed (Recommended for MVP)

Since this is a **single-event** system, the workflow is:

1. **Deploy** the app fresh (empty database)
2. **Configure** the event via the admin panel (upload PDF, add celebrants, set schedule)
3. **Use the app** during the event — the service stays warm with guest traffic
4. **After the event**, data loss doesn't matter

**Trade-off:** If the service spins down during the event (no traffic for 15 min), data is lost. Mitigate by:

- Setting up a cron job (e.g., [cron-job.org](https://cron-job.org) free) to ping [`/api/health`](../../src/server.js) every 10 minutes — see [detailed setup guide](#keeping-the-service-warm-cron-job)
- Using the admin panel to reconfigure if the database is lost

### Strategy B: Paid Tier — Persistent Disk ($7/month)

1. Upgrade to **Starter** instance type ($7/month)
2. Attach a **Persistent Disk** (1 GB minimum):
   - Mount path: `/opt/render/project/src/data`
3. Configure the app to store SQLite on the disk:

In [`src/db.js`](../../src/db.js):

```js
const dbPath = process.env.RENDER_DISK_PATH
  ? path.join(process.env.RENDER_DISK_PATH, "database.sqlite")
  : path.resolve(__dirname, "../database.sqlite");
```

### Strategy C: Paid Tier — Render Postgres ($7/month)

Use Render Postgres instead of SQLite:

- Data persists independently of the web service
- Free Postgres expires after 30 days
- Requires code changes to use `pg` driver instead of `sqlite3`

**Not recommended** — the app is built around SQLite's portability.

---

## 6. Free Tier Limitations & Workarounds

| Limitation                     | Detail                                        | Workaround                                                               |
| ------------------------------ | --------------------------------------------- | ------------------------------------------------------------------------ |
| **Spin-down on idle**          | Service spins down after 15 min of no traffic | Use [cron-job.org](https://cron-job.org) to ping every 10 min            |
| **Spin-up delay**              | ~1 minute cold start on first request         | Render shows a loading page during spin-up                               |
| **Ephemeral filesystem**       | Data lost on restart/redeploy                 | See [Strategy A](#strategy-a-free-tier--manual-seed-recommended-for-mvp) |
| **750 instance hours/mo**      | ~31 days of continuous uptime                 | Free tier is sufficient for a single event                               |
| **No persistent disks**        | Only available on paid tiers                  | Upgrade if data persistence is critical                                  |
| **No scaling**                 | Single instance only                          | Sufficient for single-event traffic                                      |
| **No SSH access**              | Cannot shell into the service                 | Debug via logs in Render Dashboard                                       |
| **No private network inbound** | Cannot receive private network traffic        | Not needed for this app                                                  |

### Keeping the Service Warm (Cron Job)

The Render free tier spins down the service after **15 minutes of inactivity**. To prevent this during your event, set up a free cron job at [cron-job.org](https://cron-job.org) that pings the service every 10 minutes.

We use a dedicated lightweight health endpoint [`/api/health`](../../src/server.js) that responds in under 1ms without touching the database.

#### Step-by-Step cron-job.org Setup

**Step 1: Create an Account**

1. Go to [cron-job.org](https://cron-job.org)
2. Click **Sign Up** (top right)
3. Enter your email address and a password
4. Check your email and click the verification link
5. Log in to your new account

**Step 2: Create a Cron Job**

1. From the dashboard, click **Create Cronjob**
2. Fill in the form:

| Field              | Value                                                     |
| ------------------ | --------------------------------------------------------- |
| **Title**          | `QR Event Scanner Keep-Alive`                             |
| **URL**            | `https://qr-event-scanner.onrender.com/api/health`        |
| **Method**         | `GET`                                                     |
| **Interval**       | Every 10 minutes (or select "Every 10 minutes" from list) |
| **Execution time** | Leave as default (runs 24/7)                              |
| **Save responses** | Optional — enable if you want to debug later              |
| **Notification**   | Disabled (you don't need alerts for keep-alive)           |

3. Click **Create**

**Step 3: Test the Cron Job**

1. On the cron job detail page, click **Run now** (or **Execute now**)
2. Wait a few seconds for the request to complete
3. Check the **Last execution** status — it should show **Success** (HTTP 200)
4. If it shows an error, verify the URL is correct and the service is running

**Step 4: Verify in Render Logs**

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Select your service → **Logs** tab
3. You should see entries like:
   ```
   [HEALTH] Keep-alive ping from 185.xxx.xxx.xxx
   ```
   (The actual IP will be cron-job.org's server)

**Step 5: Confirm the Service Stays Warm**

1. Wait 15+ minutes without visiting the app yourself
2. Open the app URL in a browser — it should load instantly (no cold start delay)
3. If it still shows a cold start, check that:
   - The cron job status shows "Success" for recent runs
   - The URL in cron-job.org matches your actual Render URL exactly
   - The cron job is **enabled** (not paused)

#### Configuration Reference

| Field        | Value                                              |
| ------------ | -------------------------------------------------- |
| **URL**      | `https://qr-event-scanner.onrender.com/api/health` |
| **Interval** | Every 10 minutes                                   |
| **Method**   | GET                                                |

> **Note:** Replace `qr-event-scanner` with your actual Render service name if different.

#### What Happens If cron-job.org Goes Down?

cron-job.org is a free service with no SLA. If it's unavailable:

- The Render service may spin down after 15 minutes of no traffic
- **Recovery:** Visit the app URL in a browser — Render will spin it back up (~1 min cold start)
- **Data loss:** If the service spun down, the SQLite database is lost. Reconfigure via admin panel (5 minutes)
- **Alternative:** Set up a second cron job on a different service (e.g., [UptimeRobot](https://uptimerobot.com) free tier) as backup

This is acceptable for a single-event system. The cron job is a mitigation, not a guarantee.

---

## 7. Upgrading to Paid Tier

If you need data persistence or zero spin-up delay:

1. Go to your service → **Settings** → **Instance Type**
2. Choose **Starter** ($7/month) or higher
3. Go to **Disks** tab → **Add Disk**
   - Mount path: `/opt/render/project/src/data`
   - Size: 1 GB (minimum)
4. Update [`src/db.js`](../../src/db.js) to use the disk path (see [Strategy B](#strategy-b-paid-tier--persistent-disk-7month))
5. Save — Render redeploys with persistent storage

---

## 8. Custom Domain Setup

1. Go to your service → **Settings** → **Custom Domain**
2. Enter your domain (e.g., `birthday.yourname.com`)
3. Add the DNS `CNAME` record at your domain registrar:

```
Type: CNAME
Name: birthday
Value: birthday-program.onrender.com
TTL: 3600 (or default)
```

4. Render provisions a free TLS certificate automatically
5. Update `HOST` environment variable to your custom domain:

```env
HOST=https://birthday.yourname.com
```

---

## 9. Troubleshooting

### Deploy Fails

| Symptom                     | Cause                           | Fix                                                  |
| --------------------------- | ------------------------------- | ---------------------------------------------------- |
| `npm install` fails         | Missing dependencies            | Check `package.json` for valid dependencies          |
| Port binding error          | Server not binding to `0.0.0.0` | Ensure `app.listen(PORT, "0.0.0.0")`                 |
| Build succeeds, app crashes | Runtime error                   | Check **Events** tab for error logs                  |
| `sqlite3` build fails       | Native module compilation       | Ensure Node.js version matches (use `.node-version`) |

### Runtime Issues

| Symptom                   | Cause                     | Fix                                                                         |
| ------------------------- | ------------------------- | --------------------------------------------------------------------------- |
| 404 on all routes         | Static files not found    | Check `express.static` path in [`src/server.js:18`](../../src/server.js:18) |
| 401 on admin routes       | Wrong `ADMIN_PASSWORD`    | Verify env variable is set in Render Dashboard                              |
| QR code shows `localhost` | `HOST` env not set        | Add `HOST=https://your-app.onrender.com` to Render env                      |
| PWA not installing        | Missing manifest or icons | Verify `/site.webmanifest` returns 200                                      |

### Viewing Logs

- **Build logs:** Events tab → Click on a deploy
- **Runtime logs:** Logs tab in Render Dashboard
- **Local logs:** `npm start` or `npm run dev`

---

## 10. Deployment Checklist

### Pre-Deployment

- [ ] All code committed to Git and pushed to GitHub
- [ ] `npm install` runs successfully locally
- [ ] `node verify.js` passes all tests
- [ ] Server starts with `npm start` on `localhost:3000`
- [ ] PWA manifest accessible at `/site.webmanifest`
- [ ] Service worker accessible at `/sw.js`
- [ ] `.node-version` file exists (pins Node.js to v20)
- [ ] `.env.example` created with all required variables

### On Render

- [ ] Web service created with correct build/start commands
- [ ] `ADMIN_PASSWORD` environment variable set
- [ ] `HOST` environment variable set to public URL
- [ ] Free instance type selected
- [ ] First deploy succeeds (check Events tab)

### Post-Deployment

- [ ] `https://your-app.onrender.com/api/event/info` returns valid JSON
- [ ] `https://your-app.onrender.com/api/admin/config` returns 401 (no auth)
- [ ] `https://your-app.onrender.com/site.webmanifest` returns manifest JSON
- [ ] `https://your-app.onrender.com/sw.js` returns service worker JS
- [ ] Admin panel loads and accepts password
- [ ] QR code in admin panel points to public URL
- [ ] Cron job set up (cron-job.org) to keep service warm

### Event Day

- [ ] Event configured via admin panel (name, venue, time)
- [ ] Program PDF uploaded
- [ ] Celebrant photos uploaded
- [ ] Schedule configured
- [ ] QR code printed/shared with guests
- [ ] Service stays warm (cron job active)

---

## Appendix: Render Configuration Files

### [`render.yaml`](../../render.yaml) — Blueprint (Infrastructure as Code)

```yaml
services:
  - type: web
    name: birthday-program
    env: node
    region: frankfurt # or oregon
    plan: free
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: ADMIN_PASSWORD
        sync: false # Set manually in Dashboard
      - key: HOST
        value: https://birthday-program.onrender.com
```

### [`.node-version`](../../.node-version)

```
20.18.0
```

### [`.nvmrc`](../../.nvmrc) (alternative to `.node-version`)

```
20.18.0
```

---

## References

- [Render Docs: Deploy a Node Express App](https://render.com/docs/deploy-node-express-app)
- [Render Docs: Web Services](https://render.com/docs/web-services)
- [Render Docs: Free Tier](https://render.com/docs/free)
- [Render Docs: Persistent Disks](https://render.com/docs/disks)
- [Render Docs: Node.js Version](https://render.com/docs/node-version)
- [Render Docs: Custom Domains](https://render.com/docs/custom-domains)
- [Render Docs: Environment Variables](https://render.com/docs/environment-variables)
- [Issue 15: Deployment & PWA Strategy](../issues/15-deployment-and-pwa-strategy.md)
