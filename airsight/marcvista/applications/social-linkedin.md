# LinkedIn

The primary channel — this whole repo (`linkedin-content/`) feeds it. LinkedIn carries **both registers**: company posts (MarcVista marketing) and the founder's personal posts (Founder register). Most personal posts use the Founder register; visuals always use the MarcVista system.

## Aspect ratios

- **Single image / document carousel:** 1:1 (1200×1200) or 4:5 (1080×1350). 4:5 wins more feed height — default to it for carousels.
- **Banner (personal/company):** 1584×396.

## Carousel structure (PDF "document" post)

1. **Cover** — the hook. One sharp line (sentence case, 40–56px), violet accent on the key word, the mark in a corner. No more than 8 words.
2. **Context slide** — the problem or the stakes, one idea.
3. **Teaching slides (3–6)** — one point each. Feature-icon chip + short headline + 1–2 lines. Number them.
4. **Takeaway** — the one thing to remember, big.
5. **CTA** — "Book a free positioning call" / "Follow for more" + lockup. `brand/900` or black background.

Design rules: sharp 0px corners, Inter, one violet accent per slide, generous margins, page numbers small in `ink/500`. Black/violet cover and closer; white interior slides.

## Post types

- **Text-only thought-leadership (Founder register):** the bread and butter. Hook line, short paragraphs, one idea, a real opinion, end with a question or a flat statement. No hashtag soup (0–3 max). Example opener in `../voice/examples.md`.
- **Case study (MarcVista register):** client + problem + what we did + named result. One stat card image optional.
- **Number post:** one stat as a 1:1 card ("100K+ coding hours"), 2-line caption.
- **Hiring (Founder register):** honest, specific, anti-"rockstar ninja." What they'll actually do.
- **Build-in-public (Founder register):** show the work and the number. Slightly self-deprecating, always lands a point.

## Company page spec

- **Banner (1584×396):** `brand/900` or paper, lockup + one-line positioning ("A brand-first tech studio for founders").
- **Logo:** the square mark (`mark.svg` / `favicon.svg`) on paper.
- **Tagline:** "We clarify your brand, then build around it."
- **About:** the 2-sentence boilerplate from `../voice/homepage-copy.md`.

## What NOT to do

No engagement-bait ("Agree? 👇👇👇"), no broetry with a one-word line per row for fake depth, no stock images, no Title Case headlines on visuals, no more than 3 hashtags, no hype words. Don't post a company-voice humble-brag from the personal profile — match the register to the account.

## Frequency

Sustainable beats sporadic. The folder pipeline (`1-drafts → 2-approved → 3-posted`) is built for a steady cadence — a few founder-register posts a week, a case study or number post when there's real proof to show.
