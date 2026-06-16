# Presentations

16:9 decks (pitch, sales, proposal). Sharp, high-contrast, one idea per slide. The full Marp theme is at `../assets/templates/marp-theme.css` — reference it with `theme: marcvista`.

## Format

- **Aspect:** 16:9, 1920×1080.
- **Background:** `paper #FFFFFF` default; `ink/900` (black) for section dividers and closers; `brand/900` violet for occasional emphasis slides.
- **Margins:** 96px. **Footer** on every slide: brand name left, page number right, in `ink/500`.
- **Radius:** sharp (0px) — including any images.

## Seven slide templates

1. **Title** — stacked lockup centered, deck title (96px), one-line subtitle, date/client in footer.
2. **Section divider** — black slide, big violet number ("01"), section name in white (96px).
3. **Big number** — one huge violet number (240px) + one sentence below ("100K+ coding hours").
4. **Three-column** — three feature-icon chips, each with an h3 + 2 lines. Equal weight.
5. **Chart / stat** — one chart (violet lead series, gray rest) left, takeaway sentence right. Mirrors the inspiration infographic's split layout.
6. **Quote / case** — large quote (56px) left-aligned, attribution (`ink/600`) below; or a client result.
7. **Closing CTA** — `brand/900` or black, white headline ("Let's build it"), one CTA line + contact.

## Type on slides

Headline 72px (display-xl), section 56px, body 32px, footer 16px. Sentence case. `**bold**` and `*italic*` render violet — use on one or two words max.

## What we never do in decks

No bullet-soup slides (≤4 points). No clip art or stock photos of people. No drop shadows on boxes. No gradient backgrounds. No more than one chart per slide. No Title Case titles. No company-logo wall on a content slide.

## Exceptions

A data-dense appendix slide may carry a table (use the theme's table style — uppercase `ink/700` headers, hairline rows). Keep appendix slides clearly after the closer.

## Marp usage

```markdown
---
marp: true
theme: marcvista
paginate: true
---

<!-- _class: title -->
# A brand-first tech studio
Positioning + product, one roof

---

<!-- _class: big-number -->
# 100K+
coding hours behind every build

---

<!-- _class: section -->
<span class="number">01</span>

# The problem
```
