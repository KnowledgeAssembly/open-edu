---
name: Zen Ethos
colors:
  surface: '#fff9e8'
  surface-dim: '#e0dac6'
  surface-bright: '#fff9e8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#faf4df'
  surface-container: '#f4eeda'
  surface-container-high: '#eee8d4'
  surface-container-highest: '#e8e2cf'
  on-surface: '#1e1c10'
  on-surface-variant: '#464740'
  inverse-surface: '#333123'
  inverse-on-surface: '#f7f1dc'
  outline: '#77786f'
  outline-variant: '#c7c7bd'
  surface-tint: '#5c614d'
  primary: '#535845'
  on-primary: '#ffffff'
  primary-container: '#6b705c'
  on-primary-container: '#eff4db'
  inverse-primary: '#c4c9b1'
  secondary: '#5f604b'
  on-secondary: '#ffffff'
  secondary-container: '#e2e1c7'
  on-secondary-container: '#63644f'
  tertiary: '#685140'
  on-tertiary: '#ffffff'
  tertiary-container: '#826957'
  on-tertiary-container: '#ffefe5'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e0e5cc'
  primary-fixed-dim: '#c4c9b1'
  on-primary-fixed: '#191d0e'
  on-primary-fixed-variant: '#444937'
  secondary-fixed: '#e5e4ca'
  secondary-fixed-dim: '#c8c8af'
  on-secondary-fixed: '#1c1d0c'
  on-secondary-fixed-variant: '#474835'
  tertiary-fixed: '#fddcc6'
  tertiary-fixed-dim: '#e0c1ab'
  on-tertiary-fixed: '#28180b'
  on-tertiary-fixed-variant: '#584232'
  background: '#fff9e8'
  on-background: '#1e1c10'
  surface-variant: '#e8e2cf'
typography:
  headline-lg:
    fontFamily: Manrope
    fontSize: 40px
    fontWeight: '300'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '300'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Manrope
    fontSize: 28px
    fontWeight: '400'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Source Serif 4
    fontSize: 20px
    fontWeight: '400'
    lineHeight: '1.8'
  body-md:
    fontFamily: Source Serif 4
    fontSize: 17px
    fontWeight: '400'
    lineHeight: '1.7'
  label-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.08em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1140px
  gutter: 32px
  margin-mobile: 20px
  section-gap: 80px
---

## Brand & Style

The design system is rooted in the philosophy of _Ma_ (the space between), prioritizing intentional emptiness to foster deep focus and academic reflection. It targets learners and educators seeking a sanctuary from the high-velocity digital world.

The visual style is a blend of **Minimalism** and **Tactile** design. It avoids the clinical coldness of modern tech in favor of organic textures and soft transitions. Surfaces should feel like washi paper or smoothed stone rather than glass or plastic. The emotional response is one of immediate decompression, clarity, and quiet authority.

## Colors

The palette is derived from natural elements: moss (primary), weathered stone (secondary), and sand (neutral).

- **Primary (#6B705C):** A muted sage green used for primary actions and progress indicators.
- **Secondary (#A5A58D):** A desaturated olive for supporting UI elements and accents.
- **Tertiary (#DDBEA9):** A warm clay tone for highlight states and soft alerts.
- **Neutral/Background:** We eschew pure white (#FFFFFF) for a soft "Antique White" (#F0EAD6) and "Parchment" (#F5F2ED) to reduce eye strain.
- **Typography:** Avoid pure black. Use a deep charcoal (#353535) for text to maintain a soft but legible contrast ratio.

## Typography

Typography in this design system is a dialogue between modern utility and classical scholarship.

- **UI & Navigation:** Use **Manrope**. Its geometric but balanced proportions provide a clear, modern framework for functional elements.
- **Long-form Content:** Use **Source Serif 4**. The generous x-height and classic serifs are optimized for extended reading, encouraging a slower, more rhythmic intake of information.
- **Vertical Rhythm:** Line heights are intentionally expanded (1.7x - 1.8x for body text) to provide breathing room between lines, preventing the "wall of text" effect.

## Layout & Spacing

This design system utilizes a **Fixed Grid** philosophy for desktop to ensure content remains centered and contained, mimicking the margins of a well-designed book.

- **Whitespace:** Treat whitespace as a structural element. Increase padding in containers by 1.5x compared to standard SaaS patterns.
- **Desktop:** 12-column grid, 1140px max-width, with 32px gutters.
- **Mobile:** 4-column grid with 20px margins.
- **Rhythm:** Use an 8px base unit. Section headers should have a minimum of 80px top margin to clearly demarcate different areas of study.

## Elevation & Depth

Depth is achieved through **Tonal Layers** rather than shadows. We avoid heavy dropshadows to keep the interface feeling grounded and light.

- **Stacking:** Use subtle shifts in background color (e.g., a Parchment card on a Sand background) to indicate elevation.
- **Soft Borders:** When necessary, use 1px solid borders in a color only slightly darker than the surface (e.g., 5-10% more saturation) to define edges without creating visual "noise."
- **Focus States:** Indicate focus using a soft inner glow or a subtle tint change rather than high-contrast outlines.

## Shapes

The shape language is **Soft**. Sharp corners are perceived as aggressive; however, perfectly circular corners (pill-shaped) feel too "bubbly" and playful for a scholarly environment. A consistent 0.25rem to 0.75rem radius provides a disciplined yet approachable aesthetic, reminiscent of smooth river stones or hand-planed wood.

## Components

- **Buttons:** Primary buttons use a solid fill of the primary moss green with light text. Secondary buttons use a ghost style with a 1px border. Transitions must be slow (300ms+) and ease-in-out.
- **Cards:** Cards should have no box-shadow. Use a subtle fill color change and a soft border to separate content. Padding within cards should be generous (min 24px).
- **Inputs:** Text fields are underlined or have a very light background fill. Avoid heavy boxes. The label should always be visible to reduce cognitive load.
- **Progress Indicators:** Use thin, elegant lines. Avoid chunky bars. The movement should be fluid, not stepped.
- **Navigation:** Top navigation should be minimal. Use text labels over icons where possible to maintain the literary feel.
- **Lists:** Increase vertical padding between list items to 16px to ensure each item feels distinct and important.
