# Tokens

Three synchronized representations of the same MarcVista design decisions. `tokens.json` is the source of truth; the other two are generated views.

| File | Consume from |
| --- | --- |
| `tokens.json` | Design tools, Style Dictionary, any token pipeline (W3C-ish schema) |
| `tokens.css` | Plain CSS / any framework — `var(--marcvista-brand-600)` etc. |
| `tailwind.preset.js` | Tailwind projects — `presets: [require('./tokens/tailwind.preset.js')]` |

## The decisions, in one glance

- **Primary:** `#7C3AED` violet (= `brand-600`). The full ramp is the Tailwind violet scale, so `brand-600` is exact. One primary — everything else is ink, surface, and semantic feedback.
- **Ink:** pure black `#000000` text (kept from the live brand) over a neutral gray ramp.
- **Canvas:** paper `#FFFFFF`, panel/surface tint `#F5F5F5`, hairline `#E5E7EB`.
- **Type:** Inter, full scale display-xl → overline. Headlines 700, body 400.
- **Radius:** `none` (0px) is the default — sharp corners are the MarcVista signature.
- **Shadow:** neutral, low-opacity. Default is `none`; reserve `md`+ for menus/modals.
- **Motion:** 80 / 160 / 240 / 480 / 720ms; ease-out default; reduced-motion reset included in `tokens.css`.

If you change a value, change it in `tokens.json` first, then mirror into the CSS + Tailwind files.
