# Issue 15: Deployment & PWA Strategy — Make the App Available to Guests

**Status:** `ready-for-agent`

**Labels:** `architecture`, `devops`, `frontend`, `documentation`

**Dependencies:** Issue 14 (Inline PDF Viewer) — ✅ Complete

---

## Problem

The app currently runs only on the organizer's local machine (`localhost:3000`). Guests cannot access it unless they are on the same Wi-Fi network. For a real birthday event, the app needs to be **publicly accessible** so any guest can scan the QR code and reach the download page from anywhere.

Additionally, the guest experience can be enhanced with **PWA (Progressive Web App)** features — allowing the download page to be "installed" on the guest's phone home screen, work offline, and feel like a native app.

---

## Acceptance Criteria

1. **Deployment option documented** — at least 3 viable deployment paths with cost/complexity trade-offs
2. **PWA manifest added** — `site.webmanifest` with icons, theme color, display mode
3. **Service worker added** — caches the download page and event info for offline access
4. **QR code updates automatically** — after deployment, the admin panel QR code reflects the public URL
5. **Environment-based configuration** — `PUBLIC_URL` in `.env` controls the QR code target and PWA scope
6. **Documentation updated** — `PRD.md` or `CONTEXT.md` notes deployment architecture

---

## Technical Design

### Option A: Free / Low-Cost Hosting (Recommended for MVP)

| Platform                | Cost               | Complexity | Notes                                                                                    |
| ----------------------- | ------------------ | ---------- | ---------------------------------------------------------------------------------------- |
| **Render** (render.com) | Free tier          | Low        | Node.js + SQLite supported. Free web service sleeps after inactivity (wakes on request). |
| **Fly.io**              | Free tier (~$0)    | Medium     | Supports SQLite via volume mounts. Always-on free tier limited.                          |
| **Railway**             | Free tier (~$5/mo) | Low        | Node.js + SQLite. Generous free tier.                                                    |
| **Koyeb**               | Free tier          | Low        | Node.js + SQLite. Similar to Render.                                                     |

**Recommended: Render** — simplest setup, free tier sufficient for a single-birthday event.

### Option B: VPS / Cloud VM

| Platform                      | Cost            | Complexity | Notes                                                |
| ----------------------------- | --------------- | ---------- | ---------------------------------------------------- |
| **DigitalOcean App Platform** | ~$5/mo          | Low        | Managed Node.js, no SQLite persistence on basic tier |
| **Hetzner VPS**               | ~$4/mo          | Medium     | Full control, install Node.js + PM2 manually         |
| **AWS EC2 (t2.micro)**        | Free tier (1yr) | High       | Overkill for this app                                |

### Option C: Serverless (Requires Code Changes)

| Platform                        | Cost | Complexity | Notes                                                                |
| ------------------------------- | ---- | ---------- | -------------------------------------------------------------------- |
| **Vercel Serverless Functions** | Free | High       | Requires SQLite → in-memory or external DB. Major refactor.          |
| **Cloudflare Workers**          | Free | High       | No SQLite support. Requires external DB (D1, Turso). Major refactor. |

**Not recommended** — the app is built as a long-running Express server with SQLite. Serverless would require significant architectural changes.

---

### PWA Implementation

#### 1. Web App Manifest (`public/site.webmanifest`)

```json
{
  "name": "Birthday Program",
  "short_name": "Birthday",
  "description": "Birthday celebration program and information",
  "start_url": "/download.html",
  "scope": "/",
  "display": "standalone",
  "background_color": "#0f0f1a",
  "theme_color": "#4f46e5",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

#### 2. Service Worker (`public/sw.js`)

A minimal service worker that:

- Caches the download page shell (`/download.html`, `/css/styles.css`, `/js/download.js`)
- Caches `/api/event/info` response for offline viewing
- Falls back to cache when network is unavailable
- Updates cache when new event info is published

```js
const CACHE = "birthday-program-v1";
const SHELL = ["/download.html", "/css/styles.css", "/js/download.js"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request)),
  );
});
```

#### 3. Register Service Worker in `download.html`

```html
<script>
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js");
  }
</script>
```

#### 4. Link Manifest in `download.html`

```html
<link rel="manifest" href="/site.webmanifest" />
<link rel="apple-touch-icon" href="/icons/icon-192.png" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta
  name="apple-mobile-web-app-status-bar-style"
  content="black-translucent" />
```

---

### Environment Configuration

Update `.env` with deployment-specific values:

```env
# Deployment
PUBLIC_URL=https://birthday-program.onrender.com
PORT=3000
ADMIN_PASSWORD=admin123
```

The `PUBLIC_URL` is used by:

- QR code generation in admin panel
- PWA manifest `start_url` scope
- Service worker cache scope

---

## Files to Create/Modify

| File                        | Action     | Purpose                                         |
| --------------------------- | ---------- | ----------------------------------------------- |
| `public/site.webmanifest`   | **Create** | PWA manifest                                    |
| `public/sw.js`              | **Create** | Service worker                                  |
| `public/icons/icon-192.png` | **Create** | PWA icon (192x192)                              |
| `public/icons/icon-512.png` | **Create** | PWA icon (512x512)                              |
| `public/download.html`      | **Modify** | Add manifest link + service worker registration |
| `.env`                      | **Modify** | Add `PUBLIC_URL` variable                       |
| `src/server.js`             | **Modify** | Serve `PUBLIC_URL` from env for QR code         |
| `CONTEXT.md`                | **Modify** | Add deployment section                          |
| `PRD.md`                    | **Modify** | Add deployment considerations                   |

---

## Test Plan

1. **Local test:** Run `npm start`, verify PWA manifest is served at `/site.webmanifest`
2. **Local test:** Verify service worker registers in Chrome DevTools → Application → Service Workers
3. **Local test:** Verify "Add to Home Screen" prompt appears on Android Chrome
4. **Deployment test:** Deploy to chosen platform, verify QR code points to public URL
5. **Offline test:** After visiting download page once, switch to airplane mode — page should still render from cache

---

## Open Questions (HITL)

1. **Which deployment platform?** Render (free) is simplest. Fly.io has better SQLite support. Which do you prefer?
2. **Custom domain?** Do you want the app at a custom domain (e.g., `birthday.yourname.com`) or is a `*.onrender.com` subdomain acceptable?
3. **Icon design?** PWA icons need to be 192x192 and 512x512 PNGs. Should I generate simple placeholder icons (gradient with a "🎂" emoji) or do you have a specific design?
4. **SSL/HTTPS?** All free platforms provide automatic HTTPS. No manual certificate management needed.
