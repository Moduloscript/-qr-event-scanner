# Issue 16: Mobile Guest UI Redesign — Aesthetic Overhaul for the Download Page

**Status**: `implemented` | **Triage**: `design`, `ux`, `mobile`, `frontend`
**Last updated**: 2026-05-22 — Added celebrant marquee carousel with auto-scroll, touch/swipe, nav arrows, page dots, and conic gradient spinning ring
**Dependencies**: Issue 14 (Inline PDF Viewer) — already implemented  
**Estimate**: Medium (3–5 focused sessions)

---

## Problem Statement

The guest download page ([`public/download.html`](public/download.html)) currently functions correctly but suffers from several aesthetic and UX flaws that diminish the celebratory feel of a birthday event:

1. **Generic purple gradient hero** — The hero banner uses a flat `#4f46e5 → #7c3aed → #a855f7` gradient that is indistinguishable from countless AI-generated templates. No personality.
2. **Poor spacing rhythm** — Padding/margin values are inconsistent (`48px 24px 32px` hero, `0 24px 24px` body). The vertical rhythm lacks a clear modular scale.
3. **Weak iconography** — Section titles use raw emoji (`&#x1F389;`, `&#x1F4C5;`) instead of styled SVG icons. Emoji rendering varies wildly across Android devices (Samsung J5 will show ugly monochrome or outdated emoji).
4. **Celebrant cards too small on mobile** — At `90px` width with `64px` circular photos, the cards feel cramped. No visual hierarchy between primary celebrant (birthday person) and others.
5. **Schedule timeline lacks visual weight** — The timeline line is `2px` wide, the dots are `10px`. On a small screen this is barely perceptible.
6. **No visual differentiation for the birthday person** — The celebrant who is actually having the birthday should be visually distinguished from other celebrants (parents, siblings, etc.).
7. **PDF viewer has no "scroll hint"** — The canvas viewer is a scrollable `<div>` with no visual indicator that the user should scroll down to see more pages.
8. **Loading state is text-only** — "Loading birthday program..." with a spinner is functional but not delightful.
9. **No micro-interactions or transitions** — Elements appear but don't animate in a coordinated way. The card-enter animation is the only motion.
10. **Font choice is generic** — Outfit is clean but overused. A more distinctive pairing would elevate the design.

---

## Research-Backed Design Direction

### Aesthetic Direction: **"Warm Celebration" — Gold + Deep Indigo + Rose Accent**

**Rationale**: Birthday celebrations are warm, personal, and joyful. The current purple/indigo palette is cold and tech-oriented. A warm gold/amber palette with deep indigo as a neutral and rose as an accent creates a celebratory, premium feel that works beautifully on mobile OLED screens.

| Token        | Current                  | Proposed                 | Rationale                    |
| ------------ | ------------------------ | ------------------------ | ---------------------------- |
| Primary      | `#6366f1` (Indigo)       | `#F59E0B` (Amber/Gold)   | Warmth, celebration, premium |
| Secondary    | `#a855f7` (Purple)       | `#F472B6` (Rose)         | Feminine/celebratory accent  |
| Accent       | —                        | `#FB923C` (Orange)       | Gradient partner for gold    |
| Background   | `#0a0b10`                | `#0F0A0A` (Warm black)   | Warmer than pure cool black  |
| Surface      | `rgba(255,255,255,0.03)` | `rgba(255,247,237,0.03)` | Warm-tinted glass            |
| Text primary | `#f3f4f6`                | `#FFF7ED` (Warm white)   | Softer on eyes               |
| Success      | `#10b981`                | Keep                     | Works with warm palette      |

### Typography Direction

| Role             | Current    | Proposed                 | Rationale                                   |
| ---------------- | ---------- | ------------------------ | ------------------------------------------- |
| Display/Headings | Outfit 800 | **Playfair Display** 700 | Serif = elegance, celebration, premium feel |
| Body             | Outfit 400 | **Outfit** 400 (keep)    | Clean readability, pairs well with Playfair |
| Accent/Mono      | —          | **JetBrains Mono**       | For time stamps, code-adjacent data         |

### Iconography Direction

Replace all raw emoji with a consistent **SVG sprite system** using inline `<svg>` elements. This guarantees pixel-perfect rendering across all Android devices (Samsung J5 included).

| Section               | Current Emoji              | Proposed SVG Icon           |
| --------------------- | -------------------------- | --------------------------- |
| Celebrants            | `&#x1F389;` (Party Popper) | Gift box icon (24px stroke) |
| Schedule              | `&#x1F4C5;` (Calendar)     | Clock + list icon           |
| PDF download          | `&#x1F4E5;` (Inbox tray)   | Download arrow icon         |
| Loading               | —                          | Animated confetti SVG       |
| Birthday person badge | —                          | Crown SVG                   |

---

## Detailed Redesign Plan

### 1. Hero Section — "The Invitation Card" Metaphor

**Current**: Flat gradient banner with text overlay.  
**Proposed**: A layered hero that mimics a physical invitation card:

```
┌──────────────────────────────┐
│  ✦  You're Invited!  ✦      │  ← decorative script text
│                              │
│     SARAH'S                  │  ← Playfair Display, gold
│     30TH BIRTHDAY            │
│                              │
│  ───── ✦ ─────              │  ← decorative divider
│                              │
│  Skyline Terrace Lounge      │  ← venue, warm white
│  Saturday, June 1st 2026     │
│  8:00 PM                     │
│                              │
│  ┌──────────────────────┐   │
│  │  View Program ↓      │   │  ← CTA button, gold gradient
│  └──────────────────────┘   │
└──────────────────────────────┘
```

**Key changes**:

- Add "You're Invited!" decorative header text in script/cursive
- Event name in Playfair Display with gold gradient text
- Decorative divider (gold line with diamond/circle)
- CTA button that scrolls to PDF viewer
- Subtle confetti particle overlay (CSS-only, 15–20 dots)

### 2. Celebrant Gallery — "Spotlight" Layout

**Current**: Uniform grid of equal-sized circular photos.  
**Proposed**: The birthday person gets a **hero spotlight** — larger photo, crown badge, name in gold. Other celebrants are smaller, arranged in a horizontal scrollable row below.

```
┌──────────────────────────────┐
│  👑                          │
│  ┌──────────┐                │
│  │  PHOTO   │  ← 120px      │  ← Birthday person (spotlight)
│  │  (large) │    circle      │
│  └──────────┘                │
│  Sarah Johnson               │
│  Birthday Girl               │
│                              │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐       │
│  │P1│ │P2│ │P3│ │P4│  ← 70px│  ← Other celebrants (horizontal scroll)
│  └──┘ └──┘ └──┘ └──┘       │
│  Mum  Dad  Sis  Bro         │
└──────────────────────────────┘
```

**Key changes**:

- Parse `celebrants` array — first celebrant is the birthday person (by convention)
- Birthday person gets `120px` photo, gold border, crown SVG badge
- Others get `70px` photos in a `display: flex; overflow-x: auto` scrollable row
- Staggered fade-in animation (each card delays by `0.1s`)

### 3. Schedule Timeline — "Bold Vertical" Layout

**Current**: Thin line (`2px`), small dots (`10px`), left-aligned text.  
**Proposed**: Thicker gradient line (`4px`), larger dots (`16px`) with glow, time prominently displayed on the left in mono font, event title on the right.

```
┌──────────────────────────────┐
│  Order of Events             │
│                              │
│  ● 07:00 PM                 │
│  │  Welcome Reception        │
│  │  Guests arrive, cocktails │
│  │                           │
│  ● 08:00 PM                 │
│  │  Grand Entrance           │
│  │  Birthday person arrives  │
│  │                           │
│  ● 09:30 PM                 │
│  │  Cake Cutting             │
│  │  ─────── ✦ ───────       │
│  │  "Happy Birthday!"        │  ← highlighted/featured item
│  └──────────────────────────┘
```

**Key changes**:

- Timeline line: `4px` wide, gold-to-rose gradient
- Dots: `16px` with `box-shadow` glow effect
- Time column: JetBrains Mono, gold color, left-aligned
- Featured items (like cake cutting) get a gold divider and italic quote
- Each item has a staggered slide-in animation

### 4. PDF Viewer — "Swipeable Pages" Metaphor

**Current**: Scrollable canvas column with no page indicator.  
**Proposed**: Add a **page counter badge** (`Page 1 of 3`) and **scroll progress indicator** at the bottom of the viewer.

```
┌──────────────────────────────┐
│  ┌──────────────────────┐   │
│  │                      │   │
│  │   PDF PAGE 1         │   │
│  │                      │   │
│  └──────────────────────┘   │
│                              │
│  ┌──────────────────────┐   │
│  │   PDF PAGE 2         │   │
│  │                      │   │
│  └──────────────────────┘   │
│                              │
│  ═══════════════════════    │  ← scroll progress bar
│  Page 2 of 3                │  ← page counter badge
└──────────────────────────────┘
```

**Key changes**:

- Add `page-indicator` element that updates as user scrolls through canvas pages
- Add thin progress bar at bottom of viewer
- Keep the download button but restyle it with gold gradient

### 5. Loading State — "Confetti Pulse" Animation

**Current**: Spinner + "Loading birthday program..." text.  
**Proposed**: Animated confetti dots (CSS-only) that pulse and drift, with a warm message.

```
┌──────────────────────────────┐
│   ✦  ✦  ✦  ✦  ✦           │  ← floating confetti dots
│       ✦      ✦              │     (CSS keyframe animation)
│   ✦      ✦      ✦          │
│                              │
│      🎂                      │  ← cake emoji (larger)
│   Preparing your             │
│   Birthday Experience...     │
│                              │
│   ✦  ✦  ✦  ✦  ✦           │
└──────────────────────────────┘
```

### 6. Error State — "Friendly Recovery"

**Current**: Red-tinted error box with technical message.  
**Proposed**: Warm-toned error card with helpful guidance and a retry button.

```
┌──────────────────────────────┐
│  😅  Oops!                   │
│                              │
│  We couldn't load the        │
│  birthday program.           │
│                              │
│  This might mean:            │
│  • The event hasn't been     │
│    set up yet                │
│  • There's a network issue   │
│                              │
│  ┌──────────────────────┐   │
│  │  Try Again ↻         │   │  ← retry button
│  └──────────────────────┘   │
│                              │
│  Ask the organizer to check  │
│  the admin panel.            │
└──────────────────────────────┘
```

---

## CSS Architecture Changes

### New CSS Variables (in `:root`)

```css
:root {
  /* Warm Celebration Palette */
  --gold: #f59e0b;
  --gold-light: #fbbf24;
  --gold-dark: #d97706;
  --rose: #f472b6;
  --rose-light: #f9a8d4;
  --warm-bg: #0f0a0a;
  --warm-surface: rgba(255, 247, 237, 0.03);
  --warm-text: #fff7ed;
  --warm-muted: #a8a29e;

  /* Gradients */
  --gold-gradient: linear-gradient(135deg, #f59e0b 0%, #f472b6 100%);
  --gold-hover: linear-gradient(135deg, #d97706 0%, #ec4899 100%);

  /* Typography */
  --font-display: "Playfair Display", serif;
  --font-body: "Outfit", sans-serif;
  --font-mono: "JetBrains Mono", monospace;

  /* Spacing Scale (4px base) */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;
  --space-3xl: 64px;
}
```

### New Animation Keyframes

```css
@keyframes confetti-float {
  0%,
  100% {
    transform: translateY(0) rotate(0deg);
    opacity: 0.6;
  }
  50% {
    transform: translateY(-20px) rotate(180deg);
    opacity: 1;
  }
}

@keyframes spotlight-glow {
  0%,
  100% {
    box-shadow: 0 0 20px rgba(245, 158, 11, 0.3);
  }
  50% {
    box-shadow: 0 0 40px rgba(245, 158, 11, 0.6);
  }
}

@keyframes slide-in-left {
  from {
    opacity: 0;
    transform: translateX(-16px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes pulse-gold {
  0%,
  100% {
    border-color: rgba(245, 158, 11, 0.3);
  }
  50% {
    border-color: rgba(245, 158, 11, 0.8);
  }
}
```

---

## Implementation Plan

### Phase 1: CSS Variable Overhaul (styles.css)

1. Add new warm palette CSS variables to `:root`
2. Add Google Fonts import for Playfair Display + JetBrains Mono
3. Keep existing variables for backward compatibility (admin page uses old palette)
4. Add new animation keyframes

### Phase 2: Download Page HTML Restructure (download.html)

1. Restructure hero section with invitation-card layout
2. Add decorative elements (divider, confetti dots container)
3. Restructure celebrant gallery with spotlight layout
4. Restructure schedule timeline with bold layout
5. Add page indicator to PDF viewer
6. Add retry button to error state
7. Replace emoji with inline SVG icons

### Phase 3: Download Page JS Updates (download.js)

1. Update `renderPages()` to track current page and update page indicator
2. Add scroll event listener to PDF canvas container for progress bar
3. Add retry button handler
4. Update celebrant rendering to spotlight first celebrant
5. Add confetti animation trigger on load complete

### Phase 4: Testing

1. Test on Samsung J5 (or Chrome DevTools device emulation set to 360×640)
2. Test on desktop at 1440px
3. Test PDF viewer with multi-page PDF
4. Test error state (stop server, refresh download page)
5. Test with 0, 1, 5, and 10 celebrants
6. Test with 0, 1, and 10 schedule items

---

## Acceptance Criteria

- [ ] Hero section uses invitation-card layout with gold gradient, decorative divider, and "You're Invited!" header
- [ ] Celebrant gallery spotlights the first celebrant (birthday person) with larger photo, crown badge, gold border
- [ ] Other celebrants displayed in horizontal scrollable row below
- [ ] Schedule timeline uses 4px gradient line, 16px glowing dots, mono-font timestamps
- [ ] Featured schedule items (e.g., cake cutting) have special visual treatment
- [ ] All emoji replaced with inline SVG icons (consistent across all Android devices)
- [ ] PDF viewer has page counter badge and scroll progress bar
- [ ] Loading state shows animated confetti dots
- [ ] Error state has friendly tone and retry button
- [ ] All animations use staggered delays for coordinated reveal
- [ ] Color palette changed to Warm Celebration (gold/rose/amber) on download page only
- [ ] Admin page (`index.html`) retains its original indigo/purple palette (no regression)
- [ ] All 14 existing `verify.js` tests still pass
- [ ] Tested on 360px width mobile viewport

---

## Files to Modify

| File                                             | Changes                                                                                  |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| [`public/css/styles.css`](public/css/styles.css) | Add warm palette CSS vars, new keyframes, download-page-specific overrides               |
| [`public/download.html`](public/download.html)   | Restructure hero, celebrant gallery, schedule timeline, PDF viewer, loading/error states |
| [`public/js/download.js`](public/js/download.js) | Add page indicator logic, retry handler, spotlight rendering, confetti trigger           |
| [`verify.js`](verify.js)                         | Add Test 15 for new UI elements (page indicator exists, retry button exists, etc.)       |

---

## Design Principles Applied

1. **Progressive disclosure** — Information reveals in layers: hero → PDF → celebrants → schedule
2. **Visual hierarchy** — Birthday person is visually dominant, other celebrants secondary
3. **Consistent rhythm** — All spacing follows a 4px base scale
4. **Platform-aware** — SVG icons replace emoji for cross-device consistency
5. **Delightful micro-interactions** — Staggered animations, confetti, glow pulses
6. **Warmth over tech** — Gold/rose palette signals celebration, not utility
7. **Mobile-first** — All layouts designed for 360px width first, then scale up
