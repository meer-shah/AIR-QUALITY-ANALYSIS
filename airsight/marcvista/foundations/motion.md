# Motion

Minimal and purposeful. Fade + a small translate. Nothing bounces, loops, or hijacks the scroll. Motion confirms an action or gently reveals content — it is never decoration.

## Duration tokens

| Token | ms | Use |
| --- | --- | --- |
| `xs` | 80 | Instant feedback — button press, checkbox |
| `sm` | 160 | Hover states, small transitions |
| `md` | 240 | Menus, dropdowns, input focus, default UI |
| `lg` | 480 | Scroll-reveal, modal open, page-level fades |
| `xl` | 720 | Large hero reveal (use once, sparingly) |

## Easing tokens

| Token | Curve | Use |
| --- | --- | --- |
| `out` | `cubic-bezier(0.22, 1, 0.36, 1)` | **Default** — things entering / settling |
| `in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | UI that moves both ways (drawers, accordions) |
| `standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | Neutral |
| `linear` | `linear` | Loaders, marquees only |

## Standard animations

- **Button press:** scale `0.98`, `xs`, ease-out.
- **Input focus:** border → `brand/600`, `md`, plus a `brand/600 @ 40%` ring.
- **Menu / dropdown open:** fade + translate-y 4px, `md`, ease-out.
- **Modal open:** fade + scale from `0.98`, `lg`, ease-out; backdrop fades `md`.
- **Scroll reveal:** fade + translate-y 8–12px, `lg`, ease-out, **once** (never re-trigger on scroll-up).
- **Page transition:** cross-fade `lg`. No slide.

## We do not do

No parallax. No marquee on a hero. No looping background video. No scroll-jacking or pinned-scroll storytelling. No entrance animations that delay or block reading. No shake / bounce / wobble / jiggle. No confetti. No animated gradients or auroras. No typewriter effect, no text shimmer.

## Acceptable "21st.dev-style" components

Used sparingly, on brand:
- **Spotlight** — a soft radial follow on a hero, very subtle. ✅ (once per page)
- **Magic-card border** — a faint moving border on a single feature card. ✅ rarely
- **Quiet marquee** — a slow, non-looping-feel logo band for client logos. ✅
- **Number counter (CountUp)** — animate "100K+ coding hours" on first view. ✅
- **Scroll reveal** — fade-up sections. ✅

Banned even though trendy: **typewriter text**, **text shimmer/gradient-sweep on headlines**, particle fields.

## Reduced motion

Always respect the OS setting. `tokens.css` ships this reset:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```
