# Infographics

Data-driven, single-purpose graphics for posts, decks, and reports. You provided a layout inspiration — a "Market Analysis Report" infographic (`../assets/templates/infographics-inspiration/market-analysis-report-INSPIRATION.pdf`). We **emulate its structure** (sectioned charts, bold title with one italic accent word, split chart-+-takeaway blocks) but **render it in the MarcVista brand**: violet `#7C3AED` not periwinkle, pure white canvas, Inter, sharp 0px corners.

> The inspiration PDF is a reference, not a MarcVista asset. Match its *layout discipline*, not its blue palette.

## Canvas sizes

- **Vertical report / carousel-friendly:** 1080×1350 (4:5) or tall 1080×1920.
- **Square stat:** 1080×1080.
- **Blog-embedded:** 1200×wide-as-needed.

## Four types

1. **Comparison** — two or more options side by side (us vs. the two-team approach). Sharp columns, violet header row, hairline dividers.
2. **Process flow** — numbered steps (Discover → Design → Develop → Deploy) with feature-icon chips and connectors. Vertical for social, horizontal for decks.
3. **Big number** — one stat dominating the canvas ("100K+ coding hours"), one line of context. Violet number on paper.
4. **Breakdown / chart** — bar/pie/line with a takeaway. **Violet is the lead series; everything else is `ink/300`–`ink/500` gray.** One chart per graphic. Pair each chart with a one-sentence takeaway (the inspiration's "Electronics lead sales in 2025" pattern → e.g. "Positioning sprint comes first").

## Layout rules

- Bold title at top, sentence case, with at most one *italic violet* accent word (the inspiration's "*Report*" device).
- Section labels in small violet chips.
- Generous white space; hairline `line` boxes around chart blocks.
- One accent color (violet). Charts: violet for the point, gray for the rest. Never a rainbow palette.
- Sharp corners on every box and bar. (The inspiration uses rounded bars — we square them.)
- Mark in a corner, footer with source/date in `ink/500`.

## Anti-patterns

3D charts · drop shadows on bars · rainbow categorical palettes · more than one chart per graphic competing for attention · decorative icons unrelated to the data · Title Case titles · the inspiration's periwinkle blue (use violet).

## Generation workflow (for Claude / AI tools)

1. State the **one** thing the graphic must communicate.
2. Pick the type (comparison / process / big-number / breakdown).
3. Lay out: title (+1 italic accent) → section chips → chart/blocks → takeaway sentence → mark + source.
4. Apply tokens: violet lead, gray rest, Inter, sharp corners, white canvas.
5. Render to PNG (see `../../scripts/render.mjs` for SVG → raster).

## Example (blog-embedded comparison)

> Title: **Two teams, or one roof.** *(roof in violet)*
> Left column "Two teams": separate branding + dev, handoffs, translation overhead, slower.
> Right column "MarcVista": one team, one vision, zero handoffs, ship in weeks.
> Takeaway strip: "One roof removes the handoff tax." Mark bottom-right.
