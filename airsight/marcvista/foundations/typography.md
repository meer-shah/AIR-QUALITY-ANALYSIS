# Typography

**One family: Inter.** It's what the live site uses, it's free, universal, and renders cleanly from a 12px caption to a 240px slide number. No second display face, no serif (serif is allowed only inside long-form legal/contract PDFs).

## Type scale

| Token | Size / line-height | Weight | Tracking | Use |
| --- | --- | --- | --- | --- |
| `display-xl` | 72 / 80 | 700 | -0.02em | Hero headline (desktop) |
| `display-lg` | 56 / 64 | 700 | -0.02em | Big section openers, slide titles |
| `h1` | 40 / 48 | 700 | -0.015em | Page titles |
| `h2` | 32 / 40 | 600 | -0.015em | Section headings |
| `h3` | 24 / 32 | 600 | -0.015em | Card titles, subsections |
| `h4` | 20 / 28 | 600 | -0.015em | Small headings, labels |
| `body-lg` | 18 / 28 | 400 | — | Hero subcopy, intro paragraphs |
| `body-md` | 16 / 24 | 400 | — | Default body |
| `body-sm` | 14 / 20 | 400 | — | Secondary, captions in dense UI |
| `caption` | 12 / 16 | 500 | — | Metadata, footnotes |
| `overline` | 11 / 16 | 600 | +0.08em, UPPERCASE | Section eyebrows ("FOR EARLY-STAGE FOUNDERS") |
| `code` | 14 / 20 | 400 | — | Inline code, JetBrains Mono |

## Weights used

400 regular · 500 medium · 600 semibold · 700 bold. Headlines are 700 (display/h1) or 600 (h2–h4); body is 400; labels/overlines 500–600. Don't use 300/thin — it disappears against the brand's confident tone.

## Seven rules

1. **Sentence case for all headlines.** "A brand-first tech studio." — never "A Brand-First Tech Studio." ALL CAPS only in a ≤3-word overline.
2. **Max three sizes per surface.** A section gets an overline, a heading, and body. Adding a fourth size makes it noisy.
3. **Line length 50–75 characters.** Body copy maxes at `680px` (`reading` width). Hero subcopy maxes ~520px.
4. **Weight creates hierarchy, not size alone.** Prefer a 700 heading over a bigger 400 one.
5. **Italics are for the accent word only.** In Marp/marketing, `*emphasis*` renders violet — use it on one or two words, never a sentence. (The inspiration infographic's italic accent word, e.g. *Report*, is the allowed pattern.)
6. **No text shadows, no letter-spacing on body.** Negative tracking on display only.
7. **Headings own their space.** 24px below an h2 before body; 48–64px above a new section heading.

## Pairings by context

| Context | Heading | Body | Eyebrow |
| --- | --- | --- | --- |
| Marketing hero | display-xl / display-lg | body-lg | overline (violet) |
| Web section | h2 | body-md | overline |
| Card | h3 | body-sm/md | — |
| Slide (16:9) | 72px (display-xl) | 32px | 18px label |
| Carousel | 40–56px | 20–24px | overline |

## Font loading (web)

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

```css
font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
```

For JetBrains Mono (code), add `family=JetBrains+Mono:wght@400;500`. Self-host both for production to avoid layout shift.

## When NOT to use Inter

- **Long-form legal/contract PDFs** — a serif (Georgia / `ui-serif`) is acceptable for multi-page reading.
- **The logo wordmark** — it's Inter Bold but locked as artwork; don't re-typeset it live.
- Never substitute a "fun" or script face anywhere. One family, always.
