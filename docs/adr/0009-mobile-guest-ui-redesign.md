# ADR 0009: Mobile Guest UI Redesign — Warm Celebration Aesthetic

**Status**: Proposed  
**Date**: 2026-05-22  
**Deciders**: Zoo (Architect)  
**Context**: Issue 16 — Mobile Guest UI Redesign  

---

## Context

The guest download page ([`public/download.html`](public/download.html)) is the primary touchpoint for all birthday guests. They access it by scanning a QR code on their phone. The current design:

- Uses a generic indigo/purple gradient that feels tech-oriented rather than celebratory
- Relies on raw emoji for icons, which render inconsistently across Android devices (especially Samsung J5)
- Has inconsistent spacing and lacks a modular vertical rhythm
- Treats all celebrants equally, with no visual distinction for the birthday person
- Uses thin timeline elements that are barely perceptible on small screens
- Has no page indicator for the PDF viewer, leaving users unsure how many pages remain
- Shows a plain spinner during loading with no celebratory feel

The frontend-design skill was loaded to guide the aesthetic direction. Research was conducted on mobile-first event page best practices, celebration-themed color psychology, and cross-device icon rendering strategies.

---

## Decision

We will implement a **"Warm Celebration"** aesthetic overhaul of the guest download page, characterized by:

### 1. Color Palette: Gold + Deep Warm Indigo + Rose

| Role | Color | Hex | Rationale |
|------|-------|-----|-----------|
| Primary | Amber/Gold | `#F59E0B` | Warmth, celebration, premium feel |
| Secondary | Rose | `#F472B6` | Feminine celebratory accent |
| Accent | Orange | `#FB923C` | Gradient partner for gold |
| Background | Warm Black | `#0F0A0A` | Warmer than cool `#0a0b10` |
| Text | Warm White | `#FFF7ED` | Softer on OLED screens |

**Why not keep the current purple palette?**  
The existing indigo/purple (`#6366f1` → `#a855f7`) was chosen during the architecture pivot when the app was still conceptually a "scanner/validator" tool. Now that the app is purely an information source for a birthday celebration, warm tones better communicate the emotional context. The admin dashboard retains the original palette since it's a utility interface, not a guest-facing one.

### 2. Typography: Playfair Display + Outfit

| Role | Font | Weight | Rationale |
|------|------|--------|-----------|
| Display/Headings | Playfair Display | 700 | Serif = elegance, celebration, premium |
| Body | Outfit | 400 | Clean readability, retained from current |
| Mono (times) | JetBrains Mono | 500 | Technical precision for timestamps |

**Why not keep Outfit for everything?**  
Outfit is a clean sans-serif but lacks personality for a celebratory context. Playfair Display adds the serif elegance associated with formal invitations and celebration cards. The pairing (serif display + sans body) is a classic editorial pattern.

### 3. Iconography: Inline SVG Icons

All emoji used in section titles and UI elements will be replaced with inline `<svg>` elements. This guarantees:

- **Pixel-perfect rendering** across all Android versions (Samsung J5 included)
- **Consistent styling** (stroke width, color, size) regardless of OS emoji font
- **No layout shifts** from emoji having different advance widths across devices

### 4. Layout: Spotlight + Horizontal Scroll

The celebrant gallery shifts from a uniform grid to a **spotlight layout**:

- The first celebrant (by convention, the birthday person) gets a `120px` circular photo with a gold border, crown SVG badge, and subtle glow animation
- All other celebrants are displayed in a horizontal scrollable row with `70px` photos
- This creates clear visual hierarchy and immediately answers "who is this party for?"

### 5. Timeline: Bold Gradient Line

The schedule timeline thickens from `2px` to `4px`, dots grow from `10px` to `16px` with a glow effect, and timestamps use JetBrains Mono for visual contrast. Featured items (like cake cutting) get a decorative divider and italic quote treatment.

### 6. PDF Viewer: Page Indicator

A page counter badge (`Page 1 of 3`) and a thin scroll progress bar are added to the PDF canvas viewer. This solves the UX problem of users not knowing how many pages remain in a multi-page program.

### 7. Loading State: Confetti Animation

The plain spinner is replaced with CSS-only animated confetti dots (15–20 floating particles) and a warm message ("Preparing your Birthday Experience..."). This sets a celebratory tone from the first moment.

### 8. Error State: Friendly Recovery

The error state shifts from a technical red-tinted box to a warm-toned card with:
- Friendly emoji header (`😅`)
- Bulleted list of possible causes
- "Try Again" button that re-fetches `GET /api/event/info`
- Guidance to contact the organizer

---

## Consequences

### Positive

- **Emotional resonance**: The warm gold/rose palette communicates "celebration" rather than "utility"
- **Cross-device consistency**: SVG icons eliminate emoji rendering discrepancies on Android
- **Clear visual hierarchy**: The birthday person is immediately identifiable
- **Better UX feedback**: Page indicator, scroll progress, and retry button improve usability
- **Delightful first impression**: Confetti animation sets a celebratory tone from the loading state
- **No backend changes**: All changes are purely frontend (CSS, HTML, JS)

### Negative

- **Two CSS palettes to maintain**: The admin dashboard retains the original indigo/purple palette, while the download page uses the warm palette. This adds some CSS maintenance overhead.
- **Additional font loading**: Playfair Display and JetBrains Mono are loaded from Google Fonts, adding ~40KB to page load. Mitigated by `font-display: swap`.
- **Increased CSS complexity**: The download page's inline `<style>` block grows significantly. Consider extracting to a separate `download.css` file if it exceeds 300 lines.

### Risks

- **Playfair Display may not render well at small sizes** on low-resolution Android screens. Mitigation: use it only for headings (`≥1.3rem`), body text remains Outfit.
- **Confetti animation may cause jank on low-end devices** (Samsung J5). Mitigation: limit to 15 particles, use `will-change: transform` sparingly, test on actual device.
- **Gold text on warm background may fail WCAG contrast** if not carefully specified. Mitigation: use `#F59E0B` only on dark backgrounds (`#0F0A0A`), never on light.

---

## Related Documents

- [Issue 16: Mobile Guest UI Redesign](.scratch/qr-event-scanner/issues/16-mobile-guest-ui-redesign.md)
- [PRD §4.1 — Simplified System Architecture](PRD.md)
- [ADR 0006 — Architecture Pivot to Information QR](docs/adr/0006-architecture-pivot-to-information-qr.md)
