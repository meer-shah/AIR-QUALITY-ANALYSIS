# Spacing

A **4px base** scale. Every margin, padding, and gap is a token — never an arbitrary value.

## Scale

| Token | px | Typical use |
| --- | --- | --- |
| `0` | 0 | Reset |
| `0_5` | 2 | Hairline nudges |
| `1` | 4 | Icon ↔ label gap |
| `1_5` | 6 | Tight inline |
| `2` | 8 | Badge padding, small gaps |
| `3` | 12 | Compact button padding |
| `4` | 16 | Default body gap, card inner padding (mobile) |
| `5` | 20 | — |
| `6` | 24 | Card padding, gap between cards |
| `8` | 32 | Heading ↔ content |
| `10` | 40 | Sub-section gaps |
| `12` | 48 | Section inner rhythm |
| `16` | 64 | Section padding (mobile) |
| `20` | 80 | Section padding (desktop) |
| `24` | 96 | Large section padding |
| `32` | 128 | Hero vertical padding |
| `40` | 160 | Max breathing room (rare) |

## Section rhythm (vertical)

```
overline            → 12px → h2 heading
h2 heading          → 24px → body / lead paragraph
body                → 48px → section content (cards, grid)
section ↕ section   → 80–96px desktop / 64px mobile
```

## Grid & container

- **Container max:** 1200px, centered.
- **Gutters:** 16px mobile, 24px desktop.
- **Reading width:** 680px max for body text (≈50–75 chars/line).
- **Hero subcopy:** ~520px max.
- **Columns:** 12-col mental model; cards usually 1 / 2 / 3 across at sm / md / lg.

## Internal padding per element

| Element | Padding |
| --- | --- |
| Button (md) | 12px × 24px |
| Button (lg) | 14px × 32px |
| Input | 12px × 16px |
| Card | 24px (32px on feature cards) |
| Badge | 4px × 10px |
| Modal | 32px |
| Nav bar | 16px × 24px (h ≈ 64px) |

## Gap conventions

- Icon ↔ label: `1` (4px) or `2` (8px).
- Buttons in a row: `3` (12px).
- Cards in a grid: `6` (24px).
- Form fields stacked: `4` (16px).

## Four rules

1. **Only scale values.** If you're typing `13px`, stop — round to a token.
2. **Whitespace is the look.** MarcVista is sharp + calm; generous section padding (80px+) carries the brand more than any decoration.
3. **Consistent gaps within a composition.** Don't mix 20px and 24px gaps in the same grid.
4. **Vertical rhythm compounds.** Bigger gaps separate bigger ideas — section > subsection > paragraph.
