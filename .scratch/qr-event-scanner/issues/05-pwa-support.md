> **SUPERSEDED** — This issue belongs to the original Access Control architecture. Per [ADR 0006](../../../docs/adr/0006-architecture-pivot-to-information-qr.md), the project has pivoted to a Birthday Information QR scope. PWA support for the scanner is no longer needed.

Status: superseded

## What to build

Add Progressive Web Application support so the ticket view and scanner can be installed to the home screen and work reliably on mobile devices. This includes a web app manifest, service worker for static asset caching, and appropriate meta tags.

## Acceptance criteria

- [ ] `manifest.json` is served at the root with: name, short_name, description, start_url, display (standalone), background_color, theme_color, and icons (192x192, 512x512 SVG or PNG)
- [ ] All HTML pages include `<link rel="manifest" href="/manifest.json">` and `<meta name="theme-color">`
- [ ] `sw.js` service worker caches static assets (CSS, JS, HTML pages) on install using a cache-first strategy
- [ ] Service worker is registered in all HTML pages
- [ ] Ticket page (`ticket.html`) is cached and viewable offline once visited
- [ ] Scanner page (`scanner.html`) gracefully handles offline state with a user-friendly message
- [ ] Icons are generated or sourced — placeholder SVG icons are acceptable for initial implementation

## Blocked by

None - can start immediately

## Notes

This slice is marked HITL because it requires decisions on:

- Icon assets (SVG vs PNG, sizes)
- Caching strategy (cache-first vs network-first for different asset types)
- Whether to precache the scanner page or only the ticket page
