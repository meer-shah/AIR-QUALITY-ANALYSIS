# Color

One confident primary — **violet `#7C3AED`** — over a disciplined ink/paper system. Everything else is text shades and semantic feedback. No second primary.

## Brand scale (violet)

The ramp is the Tailwind violet scale, anchored so `brand/600` is the exact extracted brand color.

| Token | Hex | Use |
| --- | --- | --- |
| `brand/50` | `#F5F3FF` | Faintest wash, hover tints on light |
| `brand/100` | `#EDE9FE` | Feature-icon chips, info backgrounds, badges |
| `brand/200` | `#DDD6FE` | Wash gradients, subtle fills |
| `brand/300` | `#C4B5FD` | Text/accents on dark brand backgrounds |
| `brand/400` | `#A78BFA` | Decorative, charts (secondary series) |
| `brand/500` | `#8B5CF6` | Charts, hover-from on dark |
| **`brand/600`** | **`#7C3AED`** | **Primary — CTAs, mark, links, emphasis** |
| `brand/700` | `#6D28D9` | Primary hover / pressed |
| `brand/800` | `#5B21B6` | Pressed on dark, deep accents |
| `brand/900` | `#4C1D95` | Brand-background sections (deep violet) |

## Ink scale (text + neutrals)

| Token | Hex | Use |
| --- | --- | --- |
| `ink/900` | `#000000` | Primary text, headlines (pure black, kept) |
| `ink/700` | `#374151` | Body text on paper |
| `ink/600` | `#4B5563` | Secondary text |
| `ink/500` | `#6B7280` | Muted text, captions, footer |
| `ink/400` | `#9CA3AF` | Placeholder, disabled |
| `ink/300` | `#D1D5DB` | Strong borders |
| `ink/200` | `#E5E7EB` | `line` — default divider |
| `ink/100` | `#F3F4F6` | `line-soft`, code background, hover fill |

## Surfaces

| Token | Hex | Use |
| --- | --- | --- |
| `paper` | `#FFFFFF` | Page background — the marketing canvas |
| `surface` | `#F5F5F5` | Cards, panels, product UI canvas, alternating sections |
| `line` | `#E5E7EB` | Dividers, card borders on paper |
| `line-soft` | `#F3F4F6` | Faint internal rules |

## Semantic

| State | 100 (bg) | 600 (text/icon) |
| --- | --- | --- |
| Success | `#DCFCE7` | `#16A34A` |
| Warning | `#FEF3C7` | `#D97706` |
| Danger | `#FEE2E2` | `#DC2626` |
| Info | `#EDE9FE` | `#7C3AED` (brand) |

## Where the primary goes

- Primary CTAs and their hover state.
- The logo mark.
- Links and inline emphasis (`<strong>`, `<em>` render violet).
- One accent per composition: a stat number, a section overline, a chart's lead series, list markers.
- Deep violet `brand/900` as an occasional full-bleed section or closing CTA band.

## Where the primary does NOT go

- Not large flat fills behind body text (kills contrast and feels loud).
- Not as a second "brand color" partner — there is one primary.
- Not on more than ~10% of a marketing surface. Violet is the punctuation, paper is the page.
- Not in gradients-over-everything. A soft single-hue wash (`brand/100` → `paper`) is the only gradient.

## Text contrast (WCAG)

| Combo | Ratio | Verdict |
| --- | --- | --- |
| `ink/900 #000` on `paper #FFF` | 21:1 | ✅ AAA |
| `ink/700 #374151` on `paper` | 10.4:1 | ✅ AAA |
| `ink/500 #6B7280` on `paper` | 4.8:1 | ✅ AA (body); use 700 for small text |
| White on `brand/600 #7C3AED` | 4.6:1 | ✅ AA — fine for button labels/large text |
| `brand/600` on `paper` | 4.6:1 | ✅ AA — links OK; avoid for <14px |

Rule: text under 18px on paper uses `ink/700` or darker. White-on-violet is fine for ≥16px button labels; for small violet text on white, darken to `brand/700`.

## Reasoning

The live site already commits to a single violet over near-white with Tailwind grays — a clean, modern, "AI-era" signal. We kept the exact `#7C3AED` (it lands on Tailwind `violet-600`, so the ramp is principled, not hand-mixed) and tightened the canvas from cool `#F5F5F5` to pure `#FFFFFF`, demoting that gray to a panel surface. Pure-black text was kept by choice — it pairs with the sharp 0px corners to read confident and exact rather than soft. The result: one loud color, lots of quiet space, and contrast that passes AA everywhere it needs to.
