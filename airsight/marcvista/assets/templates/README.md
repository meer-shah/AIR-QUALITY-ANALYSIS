# Templates

What's real, what's a starting theme, and what's only a layout reference. **When producing a new asset, open the closest match and adapt it — don't redraw the look from scratch.**

## Inventory

| Path | What it is | Status |
| --- | --- | --- |
| `banners/marcvista-banner-1584x396.jpg` | **Real shipped MarcVista banner** — black bg, abstract violet particle imagery, "A Brand-First Tech Studio," mark bottom-right | ✅ **Real, canonical.** Match this for LinkedIn/site banners. |
| `marp-theme.css` | Complete MarcVista Marp theme for markdown-driven 16:9 decks | ✅ **Real, load-bearing.** Use as-is. |
| `infographics-inspiration/market-analysis-report-INSPIRATION.pdf` | A Canva "Market Analysis Report" infographic you supplied | ⚠️ **Inspiration only — not a MarcVista asset.** |
| `decks/` | Reserved for your real shipped decks | ⬜ Empty — drop real files here. |

## About the real banner (`banners/`)

This is a genuine shipped MarcVista asset — use it as the canonical reference for banner-style surfaces (LinkedIn/company banner 1584×396, website hero strips). It confirms the brand's dark-mode look: **black background, abstract violet particle/cloth imagery on the left, white overline + headline, violet mark bottom-right.** When making a new banner, adapt this — don't invent a new look. (Note: the shipped banner uses Title Case "A Brand-First Tech Studio"; the system standard is sentence case — follow sentence case on new work unless matching this exact asset.)

## About the infographics inspiration

The PDF in `infographics-inspiration/` is a **layout reference you liked**, not a MarcVista-branded asset. It's a generic Canva template in periwinkle blue. Use it for its **structure** — sectioned charts, a bold title with one italic accent word, split "chart + one-sentence takeaway" blocks, numbered stat rows — but render everything in the MarcVista brand: violet `#7C3AED` (not the periwinkle), pure white canvas, Inter, sharp 0px corners. Full guidance in `../../applications/infographics.md`.

## What's NOT here yet (gaps to fill with real assets)

You gave us a website + logo + one inspiration. We did **not** invent fake "shipped" templates to pad this folder — that would degrade the system. As you ship real assets, drop them here so future work adapts the real thing instead of guessing:

- `one-pager/` — your real sales one-pager / proposal PDF
- `decks/` — your real pitch / sales deck (or export slides as PNGs)
- `linkedin-carousel/` — real exported carousel PDFs/PNGs you're proud of
- `instagram-carousel/` — real exported carousels
- `ads/` — real ad creatives that performed

Until those exist, the **application guides** (`../../applications/*.md`) + the **Marp theme** + the **components** are your production templates — they encode the rules to build any surface on-brand.

## How to use this with Claude Design

1. Upload the whole `design-system/` folder to Claude Design's "Set up your design system" flow.
2. When you build a deck, attach `marp-theme.css` or point Claude at `applications/presentations.md`.
3. When you build an infographic, show it the inspiration PDF **and** `applications/infographics.md` so it copies the layout but applies your brand.
4. As you produce assets you love, save the best back into this folder — the system compounds.
