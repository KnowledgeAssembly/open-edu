---
name: OpenEdu Nocturnal
colors:
  surface: '#151219'
  surface-dim: '#151219'
  surface-bright: '#3c373f'
  surface-container-lowest: '#100d14'
  surface-container-low: '#1e1a21'
  surface-container: '#221e25'
  surface-container-high: '#2c2830'
  surface-container-highest: '#37333b'
  on-surface: '#e8e0ea'
  on-surface-variant: '#cdc3d4'
  inverse-surface: '#e8e0ea'
  inverse-on-surface: '#332f37'
  outline: '#978d9d'
  outline-variant: '#4b4452'
  surface-tint: '#dab9ff'
  primary: '#dab9ff'
  on-primary: '#460283'
  primary-container: '#bb86fc'
  on-primary-container: '#4c0f89'
  inverse-primary: '#7743b5'
  secondary: '#46f5e0'
  on-secondary: '#003731'
  secondary-container: '#00d8c4'
  on-secondary-container: '#005950'
  tertiary: '#d4ca38'
  on-tertiary: '#353200'
  tertiary-container: '#aba200'
  on-tertiary-container: '#3b3700'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#eedbff'
  primary-fixed-dim: '#dab9ff'
  on-primary-fixed: '#2a0053'
  on-primary-fixed-variant: '#5e289b'
  secondary-fixed: '#4ffbe6'
  secondary-fixed-dim: '#17deca'
  on-secondary-fixed: '#00201c'
  on-secondary-fixed-variant: '#005048'
  tertiary-fixed: '#f1e752'
  tertiary-fixed-dim: '#d4ca38'
  on-tertiary-fixed: '#1e1c00'
  on-tertiary-fixed-variant: '#4d4800'
  background: '#151219'
  on-background: '#e8e0ea'
  surface-variant: '#37333b'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 40px
  xl: 64px
  gutter: 20px
  margin: 24px
---

## Brand & Style

The design system for OpenEdu is built on a foundation of "Focus and Depth," drawing inspiration from high-productivity environments like Arc and Obsidian. The brand personality is professional, intellectual, and immersive, designed to reduce cognitive load during long study sessions.

The style leverages **Minimalism** with a touch of **Glassmorphism** for navigational elements. It prioritizes content through deep contrast, using a "layering" approach rather than heavy borders. The emotional response should be one of calm, premium utility—a digital sanctuary for learning where the interface recedes to let the educational material shine.

## Colors

The palette is centered on a "Deep Black" base to maximize contrast and reduce eye strain.

- **Primary (#bb86fc):** A soft, desaturated purple used for high-importance actions, progress indicators, and active states.
- **Secondary (#03dac6):** A vibrant teal used for success states, secondary interactive elements, and accents within data visualizations.
- **Surface Strategy:** We use three tiers of black. `#0d0d0d` is the global canvas. `#1a1a1a` is used for sidebar and navigation containers. `#262626` is reserved for elevated cards and modals.
- **Subtle Glows:** Active interactive elements (like a selected course or active tab) should utilize a 15% opacity drop-shadow of the Primary color to create a soft "neon" depth effect.

## Typography

This design system utilizes **Inter** exclusively to maintain a systematic, utilitarian aesthetic.

- **Hierarchy:** Use bold weights (700) sparingly for display titles. Semi-bold (600) is the standard for headlines to maintain a professional tone.
- **Readability:** Body text uses a generous line-height (1.5x) to ensure long-form educational content is easily digestible in dark mode.
- **Labels:** Use uppercase for `label-sm` with increased letter spacing to provide a structural feel for metadata and categories.

## Layout & Spacing

The layout follows a **fluid grid** model with standardized 12-column structures for desktop and 4-column for mobile.

- **Desktop:** Sidebar-centric layout (inspired by Arc). The sidebar is fixed at 260px, while the main content area expands. Main margins are 40px.
- **Reflow:** On tablet, the sidebar collapses into a hamburger menu or a slim icon-only rail.
- **Rhythm:** Use an 8px spacing system. Components should primarily use `sm` (16px) for internal padding and `md` (24px) for vertical rhythm between sections.

## Elevation & Depth

This design system avoids traditional heavy shadows, opting instead for **Tonal Layering** and **Subtle Outlines**.

- **Depth Levels:**
  - **Level 0 (Base):** `#0d0d0d` (The background).
  - **Level 1 (Sidebar/In-set):** `#1a1a1a` with a 1px border of `#ffffff10` on the right or left edge only.
  - **Level 2 (Cards/Content):** `#262626`. Use a very soft 1px border of `#ffffff08` to define the edges.
- **Active State Glow:** Instead of elevation height, active elements use a `0px 0px 12px 0px` shadow using the Primary color at 20% opacity.

## Shapes

The shape language is "Modern Geometric."

- **Standard Elements:** Buttons, input fields, and cards use the `rounded` (0.5rem) setting.
- **Large Containers:** Modals and main content wrappers use `rounded-xl` (1.5rem) to soften the high-contrast transitions.
- **Interactive Indicators:** Small decorative elements like status dots or notification badges should be fully circular (pill-shaped).

## Components

- **Buttons:**
  - _Primary:_ Solid `#bb86fc` with black text. No border. On hover, apply a soft purple outer glow.
  - _Secondary:_ Ghost style with a 1px `#ffffff20` border and teal text.
- **Input Fields:** Filled with `#1a1a1a`. 1px border that turns Primary purple on focus. No shadows except for the active glow.
- **Cards:** Use `surface-bright` (#262626). Ensure internal padding is consistent with the `md` (24px) spacing token.
- **Progress Bars:** Thin 4px tracks. The track is `#ffffff10` and the fill is a gradient from Primary to Secondary.
- **Lists:** Clean rows with no separators. Use a subtle `#ffffff05` background-color change on hover to indicate interactivity.
- **Sidebar Tabs:** Rounded-md (8px) corners. When active, the background is `#ffffff10` and a 2px vertical pill of Primary purple appears on the far left.
