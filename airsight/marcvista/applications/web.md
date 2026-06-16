# Web

How MarcVista builds pages. Sharp, calm, lots of white space, one violet accent, real proof.

## Global primitives

- **Container:** max 1200px, centered. Gutters 16px mobile / 24px desktop.
- **Canvas:** `paper #FFFFFF`. Alternate sections with `surface #F5F5F5` for rhythm — never more than every other section.
- **Section padding:** 80–96px top/bottom desktop, 64px mobile.
- **Reading width:** body text caps at 680px.
- **Dividers:** 1px `line #E5E7EB`, not shadows.
- **Radius:** sharp (0px) everywhere. No pills, no rounded cards.

## Nav bar

- Sticky, 64px tall, `paper` background, 1px bottom `line` once scrolled.
- Left: `lockup-horizontal.svg`. Center/right: 3–5 links (sentence case). Far right: one primary CTA ("Book a free positioning call").
- Mobile: mark + hamburger → full-height drawer.
- One CTA only. Links are `ink/700`, hover `ink/900`; active link gets a `brand/600` underline.

## Hero

- Overline (violet, uppercase) → display-xl headline (sentence case) → body-lg subcopy (≤520px) → primary CTA (+ optional ghost secondary).
- Background: paper, or `brand-wash.svg`, or an abstract geometric composition. Optional oversized mark motif cropped at low contrast on the right.
- No looping video, no carousel of headlines.

```tsx
<Hero
  overline="For early-stage founders"
  headline="A brand-first tech studio."
  sub="We clarify your brand identity first, then build around it."
  primaryCta={{ label: 'Book a free positioning call', href: '/contact' }}
/>
```

## Six section patterns

1. **Why (problem)** — h2 + 2–3 short paragraphs at reading width. The "two-team tax" story. Calm, no graphics needed.
2. **How (process)** — numbered steps (01/02/03) with feature-icon chips. Discover → Design → Develop → Deploy.
3. **Case studies** — sharp cards: client, problem, solution, links. Real names. 2–4 across.
4. **Features / services** — feature-card grid (icon chip + h3 + body-sm). 3 across desktop.
5. **Pricing / engagement** — start-with-a-sprint framing; one column or simple tiers, sharp cards, one CTA each.
6. **Final CTA band** — full-bleed `brand/900` or `ink/900`, white headline, one CTA. Closes every page.

## Stats / proof

Big-number `stat` blocks: "5+ years", "100K+ coding hours". Client logo band as a quiet marquee. Always real, always specific.

## Footer

- `ink/900` or paper with top `line`.
- Columns: lockup + 1-line boilerplate · nav · contact (info@marcvista.com) · social.
- Legal row: "© 2026 MarcVista. All rights reserved." in `caption`.

## Pages every site should have

Home · Services (/services) · Hire Talent (/hire-talent) · Case studies/Work · About · Contact (positioning call) · Privacy + Terms.

## What we never do

Stock-photo people · pill CTAs · gradients over everything · glassmorphism · 3D · autoplay video · carousels of marketing claims · more than one accent color per section · Title Case headings.

## Accessibility baseline

- Body text `ink/700`+ on paper (AA). Small violet text → `brand/700`.
- Visible focus ring (`brand/600 @ 40%`, 2px, offset).
- All interactive targets ≥ 44px.
- Respect `prefers-reduced-motion`.
- Real alt text on every meaningful image; semantic headings in order.
