# Logo — usage

The MarcVista logo is an angular **M/V monogram** built from two slanted violet strokes that read as both the "M" of MarcVista and a forward-leaning "V" (vista / vector). It is extracted directly from the live brand mark — nothing has been added.

## File inventory

| File | Variant | Use when |
| --- | --- | --- |
| `mark.svg` / `.png` / `.jpg` | Icon-only, violet `#7C3AED` on light | App icon, favicon source, social avatar, anywhere the wordmark won't fit |
| `mark-inverse.svg` | Icon-only, white | On black, on violet `brand/900`, on photography with a scrim |
| `wordmark.svg` | "MarcVista" only, Inter Bold, black | Footers, dense UI, places the mark is redundant |
| `lockup-horizontal.svg` / `.png` / `.jpg` | Mark + wordmark, side by side | **Default logo.** Nav bars, email headers, deck title slides, letterhead |
| `lockup-stacked.svg` / `.png` / `.jpg` | Mark above wordmark | Square/centered contexts: profile images, badges, merch, story covers |
| `favicon.svg` | Square mark, full bleed | Browser tab, PWA icon |

## Construction (the simplifying choices — do not "improve")

- The mark is **two angular strokes only** — a left stroke and a right stroke, both sharp-edged parallelograms forming the M/V. There are a few tiny corner-cut fragments in the source vector; they are part of the original and are preserved. **Do not** add a third stroke, an enclosing box, a dot, a gradient, or a rounded join.
- The mark is **single-color** — `#7C3AED` violet, or white when inverted. It is never two-tone, never gradient-filled.
- Corners are **sharp (0px radius)** — this matches the brand's system-wide sharp-corner signature. Do not round them.
- The wordmark is **Inter Bold (700)**, sentence case, set tight (`-0.02em`). One word, no space: "MarcVista".

## Clear space & minimum size

- **Clear space** = the height of the mark (its cap height) on all four sides. Nothing — text, edges, other logos — enters that zone.
- **Minimum sizes:** lockup 120px wide (web) / 24mm (print) · mark 24px (web) / 8mm (print) · favicon 16px.

## Color variants

| Background | Logo |
| --- | --- |
| Paper `#FFFFFF` / surface `#F5F5F5` | `mark.svg` (violet) + black wordmark |
| Black `#000000` | `mark-inverse.svg` (white) + white wordmark |
| Violet `brand/900` `#4C1D95` | `mark-inverse.svg` (white) + white wordmark |
| Photography | `mark-inverse.svg` over a ≥40% black scrim, never on a busy area |

One-color rendering (fax, embroidery, single-ink print): use the solid mark in 100% black or 100% violet — no halftones.

## What NOT to do

- Don't stretch, squash, or change the mark's proportions.
- Don't rotate the mark or set it on an angle.
- Don't recolor it outside the approved set (violet / white / single-ink black).
- Don't add effects — no drop shadows, glows, bevels, outlines, or 3D.
- Don't animate the mark on marketing surfaces (a single quiet fade-in on a hero is the only exception).
- Don't place it on a busy background without a scrim.
- **Don't add features that aren't in the source mark** — no third stroke, no enclosing shape, no dot, no rounded corners.
- Don't use Title Case or a space ("Marc Vista" / "MARCVISTA" are wrong — it's "MarcVista").
