# Components — MarcVista React + Tailwind starters

Copy-paste React components wired to the MarcVista token system. They assume Tailwind with the preset at `../tokens/tailwind.preset.js` applied, so classes like `bg-brand-600`, `text-ink-900`, `border-line`, `text-h2`, `duration-sm`, `ease-out` resolve.

## Dependencies

```bash
npm install class-variance-authority clsx tailwind-merge lucide-react framer-motion
```

- `class-variance-authority` + `clsx` + `tailwind-merge` → variant + `cn()` helper (`utils.ts`)
- `lucide-react` → icon set (stroke 1.5, outline only — see `../foundations/iconography.md`)
- `framer-motion` → motion primitives in `animated.tsx`

## Tailwind config

```js
// tailwind.config.js
const marcvista = require('./design-system/tokens/tailwind.preset.js')
module.exports = {
  presets: [marcvista],
  content: ['./app/**/*.{ts,tsx,mdx}', './components/**/*.{ts,tsx}'],
}
```

Load Inter (400/500/600/700) — see `../foundations/typography.md` for the snippet.

## Inventory

| File | What it is |
| --- | --- |
| `utils.ts` | `cn()` — clsx + tailwind-merge |
| `button.tsx` | primary / secondary / ghost / link / danger. **Default radius = none (sharp).** |
| `input.tsx` | input + textarea with label, hint, error |
| `card.tsx` | card + Header/Title/Description/Content/Footer |
| `badge.tsx` | small status / category pill |
| `feature-card.tsx` | icon chip + title + body |
| `nav.tsx` | sticky top bar (mark + links + CTA) + mobile drawer |
| `hero.tsx` | marketing hero (overline / headline / sub / CTAs / optional image) |
| `testimonial.tsx` | quote + name/role + optional outcome stat |
| `cta-section.tsx` | closing CTA band (dark or wash) |
| `stat.tsx` | big-number stat block (e.g. "100K+ coding hours") |
| `animated.tsx` | FadeIn, Stagger, CountUp, Spotlight, QuietMarquee |

## The MarcVista override: sharp corners

The brand's signature is **0px radius**. `button.tsx` already defaults to `rounded="none"`. When you adapt `card.tsx`, `input.tsx`, `badge.tsx`, or `feature-card.tsx`, prefer `rounded-none` over the rounded utilities unless you're inside dense product UI where a soft `rounded-md` aids scannability. Never use pills on marketing CTAs. The only always-round elements are avatars and status dots (`rounded-full`).

## Usage

```tsx
import { Button } from '@/design-system/components/button'
import { Hero } from '@/design-system/components/hero'

<Hero
  overline="For early-stage founders"
  headline="A brand-first tech studio."
  sub="We clarify your brand identity first, then build around it."
  primaryCta={{ label: 'Book a free positioning call', href: '/contact' }}
/>
```
