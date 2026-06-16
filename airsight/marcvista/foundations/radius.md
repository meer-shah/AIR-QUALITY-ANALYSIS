# Radius

**Sharp is the MarcVista signature.** The live brand uses `0px` everywhere — and we kept it. Sharp corners read as exact, engineered, confident. This is the single most distinctive thing about the system; protect it.

## Scale

| Token | Value | Use |
| --- | --- | --- |
| `none` | 0px | **Default — everything, unless listed below** |
| `xs` | 4px | (Reserved) tiny inline chips in dense UI |
| `sm` | 6px | (Reserved) |
| `md` | 10px | Product-UI controls where softness aids scannability |
| `lg` | 16px | (Reserved) large media cards inside product UI only |
| `xl` | 24px | (Reserved) |
| `full` | 9999px | Avatars and status dots only |

## The two rules

1. **Marketing surfaces are sharp (`none`).** Buttons, cards, inputs, images, sections, badges, ads, slides, carousels — all 0px. MarcVista does **not** use pill CTAs. (This is a deliberate override of the usual "marketing CTA = pill" convention.)
2. **Product UI may soften to `md` (10px)** — and only product UI — when rounded controls genuinely help a dense interface feel friendlier. Pick one (sharp or md) per product and commit; don't mix within a screen.

## Consistency within a composition

Every element in one composition shares one radius. A sharp card does not contain a rounded button. If a screen is sharp, the inputs, cards, and buttons are all sharp.

## Exceptions

- **Avatars / profile images:** `full` (circle).
- **Status dots / live indicators:** `full`.
- **The logo:** no radius — ever. The mark's corners are part of the artwork.
- **Photographs on paper:** sharp by default (0px). This is intentional — it reinforces the engineered feel. (The token system offers `lg` for product contexts, but marketing keeps photos sharp.)
