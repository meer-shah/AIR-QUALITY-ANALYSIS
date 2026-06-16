# Iconography

**Library: [Lucide](https://lucide.dev).** One set, everywhere. Outline only, consistent stroke. Don't mix in Font Awesome, Heroicons solid, emoji, or 3D icons.

## Style

- **Stroke width: 1.5.** Matches Inter's weight and the system's clean, exact feel.
- **Outline only** — never filled icon glyphs.
- **Default corner rounding** as Lucide ships (slightly rounded joins — this is the one place a touch of round is allowed, and it's intrinsic to the icon set, not a brand radius).
- Icons inherit `currentColor` so they match their text by default.

## Size by context

| Context | Size |
| --- | --- |
| Inline with 14px text | 14px |
| Inline with 16px body | 16px |
| Inline with 18px lead | 18px |
| Button icon | 18px |
| Nav icon | 20px |
| Feature icon (in chip) | 20px (chip is 40×40) |
| Hero / spot icon | 24–32px |
| Empty-state icon | 32–40px |

## Color rules

- **Default:** `currentColor` — the icon is the color of its text (`ink/700` in body, `ink/500` muted).
- **Feature-icon chip:** the signature pattern — a **40×40 chip** filled `brand/100 #EDE9FE`, with a `brand/600 #7C3AED` 20px Lucide icon centered. Sharp corners (0px), of course.
- **On violet/dark backgrounds:** white icons.
- Never multicolor an icon. Never put a gradient on one.

## The feature-icon pattern

```
40×40 box · background brand/100 · radius none (sharp) · centered 20px Lucide icon in brand/600
```

Use it next to feature titles, in "what we do" cards, and in process steps. It's the brand's recurring visual unit. See `../components/feature-card.tsx`.

## What the brand doesn't use

- **No emoji on marketing surfaces** (web, decks, ads, proposals). Emoji are fine in the **founder LinkedIn register** and casual DMs — never in MarcVista marketing copy.
- No second icon library mixed in.
- No filled/duotone/3D icon styles.
- No skeuomorphic or hand-drawn icons.

## Custom-icon fallback order

1. Use an existing **Lucide** icon (search lucide.dev first).
2. Combine/compose two Lucide icons if needed.
3. Draw a custom icon **matching Lucide's grid + 1.5 stroke + outline** only if nothing fits.
4. Never drop in a random found icon that breaks the stroke/outline rule.
