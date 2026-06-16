# Shadow

Shadows are **neutral, low-opacity, and rare**. MarcVista leans on sharp edges and hairline borders (`line #E5E7EB`), not elevation, to separate things. When you do use a shadow, it's pure-black at very low alpha — never colored.

## Scale

| Token | Value |
| --- | --- |
| `none` | `none` |
| `xs` | `0 1px 2px rgba(0,0,0,0.04)` |
| `sm` | `0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)` |
| `md` | `0 4px 12px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04)` |
| `lg` | `0 12px 32px rgba(0,0,0,0.08), 0 4px 8px rgba(0,0,0,0.04)` |
| `xl` | `0 24px 48px rgba(0,0,0,0.10), 0 8px 16px rgba(0,0,0,0.06)` |

## Five rules

1. **Default is `none`.** Cards on paper use a `1px line` border, not a shadow. This is the MarcVista default look.
2. **Add `xs` on hover** for interactive cards/buttons — a subtle lift to signal "clickable," nothing more.
3. **Reserve `md`+ for things that truly float** — dropdowns, popovers, modals, command menus. Never on static page content.
4. **Never colored shadows.** No violet glow, no tinted elevation. Black at low alpha only.
5. **No inner shadows, no neumorphism.** Flat and confident — not soft-extruded.
