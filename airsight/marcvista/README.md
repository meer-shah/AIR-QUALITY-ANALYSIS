# MarcVista Design System

The single source of truth for every asset MarcVista ships — websites, landing pages, decks, LinkedIn/Instagram carousels, infographics, emails, and ads. Built to be uploaded to **Claude Design's "Set up your design system"** flow and fed to any LLM that produces brand assets.

**MarcVista** — a brand-first tech studio for early-stage founders.
**Tagline:** A brand-first tech studio.

## Quick start

- **Building anything?** Read [`CLAUDE.md`](CLAUDE.md) first — it's the rules + defaults.
- **Adding a landing page** → [`applications/web.md`](applications/web.md) + [`components/`](components/).
- **Making a deck** → [`applications/presentations.md`](applications/presentations.md) + [`assets/templates/marp-theme.css`](assets/templates/marp-theme.css).
- **Writing a LinkedIn post** → [`applications/social-linkedin.md`](applications/social-linkedin.md) + [`voice/examples.md`](voice/examples.md).
- **Need exact values** → [`tokens/tokens.json`](tokens/tokens.json).
- **Placing the logo** → [`logo/usage.md`](logo/usage.md).

## File tree

```
design-system/
├── README.md                 ← you are here
├── CLAUDE.md                 ← rules + load order for any LLM (read first)
├── BRAND-SUMMARY.md          ← one-page snapshot
├── foundations/              ← brand, voice, vocabulary, color, type, spacing,
│                                radius, shadow, motion, iconography, imagery
├── tokens/                   ← tokens.json · tokens.css · tailwind.preset.js · README
├── logo/                     ← 6 SVGs + rendered mark/lockups + usage.md
├── components/               ← React + Tailwind starters (button, hero, card, …)
├── voice/                    ← examples.md (do/don't) · homepage-copy.md
├── applications/             ← web, presentations, social-linkedin, social-instagram,
│                                email, infographics, ads
└── assets/
    ├── patterns/             ← grid.svg · brand-wash.svg
    └── templates/            ← marp-theme.css · infographics inspiration · (your real assets go here)
```

## Eight principles (the system in one breath)

1. **One violet, lots of white.** `#7C3AED` is the only brand color; pure white is the canvas.
2. **Inter, always.** One typeface, sentence case, headlines bold.
3. **Sharp corners.** 0px is the signature — no pills, no rounded cards.
4. **Clarity over hype.** Banned words list enforced; every claim gets a number or a name.
5. **Two voices, one system.** MarcVista marketing (confident, specific) + Founder/LinkedIn (witty, first-person).
6. **Abstract imagery.** Geometric violet-on-white. No stock people, no AI clichés.
7. **Calm motion.** Fade + small translate, nothing loops or jacks the scroll.
8. **Proof, not adjectives.** 5+ years, 100K+ coding hours, real client names.

## How this was built

Extracted from the live site (marcvista.com) via Firecrawl, logo rendered and verified from the real mark, then refined against the system's design laws. Decisions and any conflicts are recorded in [`../research/reconciliation.md`](../research/reconciliation.md).
