---
name: Sylvan Workspace
colors:
  surface: '#f9faf6'
  surface-dim: '#d9dad7'
  surface-bright: '#f9faf6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f0'
  surface-container: '#edeeea'
  surface-container-high: '#e7e9e5'
  surface-container-highest: '#e2e3df'
  on-surface: '#1a1c1a'
  on-surface-variant: '#434843'
  inverse-surface: '#2e312f'
  inverse-on-surface: '#f0f1ed'
  outline: '#737973'
  outline-variant: '#c3c8c1'
  surface-tint: '#4d6453'
  primary: '#061b0e'
  on-primary: '#ffffff'
  primary-container: '#1b3022'
  on-primary-container: '#819986'
  inverse-primary: '#b4cdb8'
  secondary: '#536253'
  on-secondary: '#ffffff'
  secondary-container: '#d3e4d1'
  on-secondary-container: '#576757'
  tertiary: '#251207'
  on-tertiary: '#ffffff'
  tertiary-container: '#3c261a'
  on-tertiary-container: '#ac8c7b'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d0e9d4'
  primary-fixed-dim: '#b4cdb8'
  on-primary-fixed: '#0b2013'
  on-primary-fixed-variant: '#364c3c'
  secondary-fixed: '#d6e7d4'
  secondary-fixed-dim: '#bacbb8'
  on-secondary-fixed: '#111f13'
  on-secondary-fixed-variant: '#3c4a3c'
  tertiary-fixed: '#ffdbca'
  tertiary-fixed-dim: '#e3bfad'
  on-tertiary-fixed: '#2a170c'
  on-tertiary-fixed-variant: '#5a4134'
  background: '#f9faf6'
  on-background: '#1a1c1a'
  surface-variant: '#e2e3df'
typography:
  headline-lg:
    fontFamily: Source Serif 4
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Source Serif 4
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Source Serif 4
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  body-lg:
    fontFamily: Literata
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 30px
  body-md:
    fontFamily: Literata
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
  label-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1200px
  gutter: 24px
  margin-desktop: 64px
  margin-mobile: 20px
---

## Brand & Style

The design system is built for deep focus and academic rigor, drawing inspiration from the quiet sanctuary of a forest. It balances a professional knowledge-management aesthetic with organic, tactile warmth. The target audience—educators, researchers, and lifelong learners—requires an environment that minimizes cognitive load while providing a sense of stability and growth.

The design style is **Modern Organic**. It leverages the structural clarity of Corporate Modernism but replaces sterile whites and harsh grays with a layered, earth-toned palette. Soft transitions, subtle grain textures, and high-quality typography create a workspace that feels like a physical library nestled in nature. The emotional response is one of calm productivity, intellectual safety, and endurance.

## Colors

The color strategy prioritizes "chromatic neutrals" to reduce eye strain during long-form reading sessions.

- **Primary (Deep Forest):** Used for primary navigation, headings, and high-importance actions. It provides the grounding "ink" of the system.
- **Secondary (Soft Sage):** Used for accents, subtle highlights, and secondary UI elements. It acts as a bridge between the deep greens and the background.
- **Tertiary (Earth Brown):** Reserved for specific callouts, human-centric touchpoints, or organic dividers.
- **Neutral (Parchment):** The background is not a pure white but a warm, desaturated "Parchment" (#F8F9F5) to soften the contrast and mimic high-quality paper.

Text should primarily use the Primary color at varying opacities rather than pure black to maintain the forest-themed cohesion.

## Typography

Typography is the cornerstone of this design system, optimized for "deep reading."

- **Headlines:** Use **Source Serif 4**. Its authoritative, academic structure provides clear hierarchy and a sense of institutional trust.
- **Body:** Use **Literata**. Designed specifically for long-form digital reading, its warm, bookish proportions ensure maximum comfort during research and study.
- **Labels & UI:** Use **Hanken Grotesk**. This clean, contemporary sans-serif handles functional metadata, navigation, and buttons, providing a sharp contrast to the serif-heavy content areas.

Maintain generous line heights (1.6x for body text) to allow the "breathability" characteristic of the forest theme.

## Layout & Spacing

The layout follows a **Fluid Grid** model with a maximum content width to preserve readability.

- **Desktop:** A 12-column grid with wide margins (64px) to create a focused "center-stage" for reading. Sidebars for navigation and table of contents should feel like auxiliary branches, easily tucked away.
- **Mobile:** A 4-column grid with 20px margins. Content should occupy the full width to maximize text legibility.
- **Spacing Rhythm:** Based on an 8px scale. Use larger gaps (32px, 48px) between major sections to mimic the openness of a natural clearing. Group related data tightly (8px, 16px) to maintain a logical "cluster" feeling.

## Elevation & Depth

In this design system, depth is achieved through **Tonal Layers** and **Low-contrast Outlines** rather than aggressive shadows.

- **Surface Tiers:** Surfaces "lift" by becoming slightly lighter than the base Parchment color. Use a 1px solid border in a soft sage-tinted neutral (#E2E8E2) instead of drop shadows for a flatter, more professional feel.
- **Soft Diffusion:** Where depth is essential (e.g., a floating search bar), use a very large, low-opacity (8%) shadow tinted with the Primary Forest Green to suggest a soft, ambient light filtering through a canopy.
- **Backdrop Blurs:** Use subtle background blurs (8px) on overlays to maintain context without visual clutter.

## Shapes

The shape language is **Soft (Level 1)**.

Elements use a subtle 4px (0.25rem) radius to remove the harshness of sharp corners while maintaining a professional, structured appearance. Larger containers like cards or image frames can scale up to 8px or 12px for a friendlier feel, but avoid pill-shapes for functional UI to keep the workspace feeling serious and efficient.

## Components

- **Buttons:** Primary buttons use the Forest Green background with Parchment text. Secondary buttons are ghost-style with Sage borders. Hover states should involve a subtle shift in saturation rather than brightness.
- **Cards:** Cards should have no background (transparent) with a 1px Sage-tinted border, or a very subtle off-white fill to separate them from the main background.
- **Input Fields:** Use a "minimalist paper" style—bottom border only in default state, transitioning to a full, soft-green outline on focus.
- **Lists & Trees:** Use a "branching" visual logic for nested knowledge trees, using thin, Earth Brown vertical lines to show hierarchy.
- **Chips:** Soft-edged (rounded-lg) with Sage backgrounds and Forest Green text. Used for tagging topics or metadata.
- **Progress Bars:** Represented as "growing vines"—a solid Forest Green bar on a very pale Sage track.
