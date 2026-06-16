# CLAUDE.md — read this first

You are producing an asset for **MarcVista** — a brand-and-product positioning sprint (2 weeks) for early-stage tech founders, co-founded by Shahmeer. This file is the contract. Read it before generating anything. Then read only the files you need for the surface you're building.

**Core message (anchor everything to it):** *We clarify your brand identity first, then build your product around it.* Archetype: **The Mentor**. Traits: thoughtful, practical, honest, founder-fluent.

## Load order

1. **This file** (`CLAUDE.md`) — rules + defaults.
2. `BRAND-SUMMARY.md` — one-page snapshot.
3. `foundations/brand.md` + `foundations/voice.md` + `foundations/vocabulary.md` — who we are, how we sound.
4. `tokens/tokens.json` — exact colors/type/spacing values.
5. `foundations/color.md`, `typography.md`, `spacing.md`, `radius.md`, `shadow.md`, `motion.md`, `iconography.md`, `imagery.md` — as needed.
6. The matching file in `applications/` for the surface you're building.
7. `voice/examples.md` + `voice/homepage-copy.md` for copy.
8. `logo/usage.md` before placing the logo. `components/` for React/Tailwind.

## Non-negotiables (MarcVista-specific)

1. **One primary color: violet `#7C3AED`.** No second brand color. Everything else is ink, paper, and semantic feedback.
2. **One typeface: Inter.** No serif (except long-form legal PDFs), no script, no second display face.
3. **One canvas: pure white `#FFFFFF`.** `#F5F5F5` is a panel/surface tint only.
4. **Sharp corners (0px) — the signature.** No pill CTAs, no rounded cards on marketing. Avatars/dots are the only round things.
5. **Sentence case headlines.** ALL CAPS only in a ≤3-word overline.
6. **Pure-black text `#000000`** for headlines/primary text (kept by choice).
7. **No hype words:** revolutionary, game-changing, 10x, cutting-edge, supercharge, unleash, leverage, transform, synergy, seamless, robust, world-class, stunning, elite, **AI-powered (bare adjective)**.
8. **Two voice registers** — MarcVista marketing (confident, specific) and Founder/LinkedIn (witty, first-person). Match the register to the surface; neither uses hype.
9. **Imagery is abstract/geometric.** No stock people, no AI-generated humans, no glowing-orb "AI" clichés.
10. **Every claim earns a number or a name** (5+ years, 100K+ coding hours, named clients).
11. **Motion is minimal** — fade + small translate, 160/240/480ms, ease-out. No parallax, loops, scroll-jacking, confetti.

If a request would violate one of these, push back and propose the on-brand alternative.

## Defaults when the request is ambiguous

| Question | Default |
| --- | --- |
| Background | Pure white `#FFFFFF` (paper) |
| Headline case | Sentence case |
| Body size | 16px (`body-md`), `ink/700` |
| CTA shape | Sharp (0px), violet `brand/600`, white label |
| Section spacing | 80–96px desktop / 64px mobile |
| Carousel aspect | 4:5 (1080×1350) |
| Slide aspect | 16:9 (1920×1080) |
| Email width | 600px |
| Accent per composition | One — violet |
| Voice register | MarcVista marketing, unless it's a personal LinkedIn/IG post → Founder |

## Asset-type cheat sheet

| User asks for… | Read |
| --- | --- |
| Website / landing page | `applications/web.md` + `components/` |
| Pitch / sales deck / slides | `applications/presentations.md` + `assets/templates/marp-theme.css` |
| LinkedIn post or carousel | `applications/social-linkedin.md` + `voice/examples.md` |
| Instagram post / carousel / story | `applications/social-instagram.md` |
| Email | `applications/email.md` |
| Infographic / report graphic | `applications/infographics.md` (+ inspiration PDF) |
| Ad (static or video) | `applications/ads.md` |
| Logo placement | `logo/usage.md` |
| Homepage / hero copy | `voice/homepage-copy.md` |

## Quality bar — ask before delivering

1. Is there exactly **one** accent color (violet) and is the canvas white?
2. Are all corners **sharp** (no pills, no rounded cards)?
3. Is every headline **sentence case** and free of **hype words**?
4. Does every claim have a **number or a name** behind it?
5. Is the **voice register** right for this surface (marketing vs. founder)?
6. Is the imagery **abstract/geometric** — zero stock people, zero AI clichés?
7. Is the **logo** rendered faithfully (two-stroke violet mark, nothing added)?
