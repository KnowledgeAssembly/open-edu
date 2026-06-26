---
name: Lumina Scholastica
colors:
  surface: '#fdf7ff'
  surface-dim: '#ded8e0'
  surface-bright: '#fdf7ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f8f2fa'
  surface-container: '#f2ecf4'
  surface-container-high: '#ece6ee'
  surface-container-highest: '#e6e0e9'
  on-surface: '#1d1b20'
  on-surface-variant: '#494551'
  inverse-surface: '#322f35'
  inverse-on-surface: '#f5eff7'
  outline: '#7a7582'
  outline-variant: '#cbc4d2'
  surface-tint: '#6750a4'
  primary: '#4f378a'
  on-primary: '#ffffff'
  primary-container: '#6750a4'
  on-primary-container: '#e0d2ff'
  inverse-primary: '#cfbcff'
  secondary: '#63597c'
  on-secondary: '#ffffff'
  secondary-container: '#e1d4fd'
  on-secondary-container: '#645a7d'
  tertiary: '#765b00'
  on-tertiary: '#ffffff'
  tertiary-container: '#c9a74d'
  on-tertiary-container: '#503d00'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e9ddff'
  primary-fixed-dim: '#cfbcff'
  on-primary-fixed: '#22005d'
  on-primary-fixed-variant: '#4f378a'
  secondary-fixed: '#e9ddff'
  secondary-fixed-dim: '#cdc0e9'
  on-secondary-fixed: '#1f1635'
  on-secondary-fixed-variant: '#4b4263'
  tertiary-fixed: '#ffdf93'
  tertiary-fixed-dim: '#e7c365'
  on-tertiary-fixed: '#241a00'
  on-tertiary-fixed-variant: '#594400'
  background: '#fdf7ff'
  on-background: '#1d1b20'
  surface-variant: '#e6e0e9'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  h1:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  h2:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-reading:
    fontFamily: Source Serif 4
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.7'
  body-ui:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.0'
    letterSpacing: 0.05em
  mono:
    fontFamily: jetbrainsMono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.6'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 40px
  xl: 64px
  panel-nav: 260px
  panel-explorer: 320px
  container-max: 800px
---

## Brand & Style

The design system is engineered for deep focus and structured learning. It adopts a **Modern Minimalist** aesthetic influenced by the high-productivity environments of Linear and Notion, utilizing a "Content-First" philosophy. The interface is characterized by a three-panel architecture (Navigation, Explorer, Content) that creates a sense of spatial hierarchy without visual clutter.

The brand personality is authoritative yet quiet, acting as a sophisticated vessel for AI-generated knowledge. It evokes a feeling of intellectual clarity and professional calm. By leveraging subtle borders and intentional whitespace rather than heavy shadows or vibrant gradients, the system minimizes cognitive load, making it ideal for long-duration educational sessions.

## Colors

The color strategy utilizes a multi-theme approach to accommodate different lighting environments and neurodivergent needs.

- **Light:** Optimized for high-glare environments; uses a cool slate palette to maintain a "SaaS-native" professional feel.
- **Dark:** Inspired by Obsidian; uses deep charcoal backgrounds to reduce eye strain while maintaining sharp text-to-background contrast.
- **Zen:** A specialized "Cream & Stone" palette using low-chroma browns and greys. It reduces the harshness of pure white for a more naturalistic reading experience.
- **Forest:** A monochromatic dark-green scale that leans into the "biophilia effect," promoting calm during dense technical subjects.
- **High Focus:** Maximizes contrast and removes all non-essential decorative colors. Use pure black borders (2px) to clearly define interactive zones for users with ADHD or visual processing sensitivities.

## Typography

This system employs a dual-typeface strategy. **Inter** handles all functional UI elements, navigation, and metadata, providing a systematic and neutral frame. **Source Serif 4** is reserved exclusively for the "Reading Pane," where AI-generated content resides. The serif's high x-height and generous line spacing (1.7) are designed to facilitate long-form immersion.

In the **High Focus** theme, the `body-reading` line height should be increased to 2.0 to prevent "line jumping." For code snippets within courses, **JetBrains Mono** is used to ensure maximum character differentiation (0 vs O, l vs 1).

## Layout & Spacing

The layout is built on a strict **8px grid system**. The primary architecture consists of three panels:

1.  **Global Nav (Left):** Collapsible slim bar for high-level app switching.
2.  **Context Explorer (Middle):** Fixed-width list of course modules and lessons.
3.  **Reading Canvas (Right):** Fluid area where the content container is centered with a max-width of 800px to maintain optimal line lengths (65-75 characters).

On mobile devices, the layout collapses into a single-pane view with a bottom-sheet navigation for the Explorer. Spacing increments are strictly linear multiples of 8px to ensure visual rhythm. In the **Zen** theme, `md` and `lg` spacing values are increased by 25% to provide more "breathable" margins.

## Elevation & Depth

To maintain a minimal profile, the design system avoids heavy drop shadows. Instead, it uses **Tonal Layering** and **Low-Contrast Outlines**:

- **Level 0 (Background):** The lowest base layer.
- **Level 1 (Surface):** Sidebar and Explorer panels, separated from the background by a 1px border.
- **Level 2 (SurfaceElevated):** Popovers, tooltips, and modals. These use a very soft, diffused ambient shadow (0px 4px 20px, 5% opacity) and a slightly brighter border than the base surface.
- **Zen Theme Exception:** Elevation is communicated solely through subtle shifts in background color (warm-grey to light-cream) without any shadows.
- **High Focus Exception:** Depth is eliminated. All elements are flat, with hierarchy established through border-weight (1px vs 2px).

## Shapes

The shape language is "Soft" and professional. A standard radius of `0.25rem` (4px) is applied to buttons, inputs, and small cards to maintain a crisp, technical look. Larger containers like modals or the main content area use `0.5rem` (8px).

In the **Zen** and **Forest** themes, the roundedness should be globally increased to **2 (Rounded)** to evoke a more organic, less clinical feeling. Progress bars always use a pill-shape (full radius) to distinguish them from interactive containers.

## Components

### Buttons

- **Primary:** Solid background (Accent color), `body-ui` bold text, 4px radius.
- **Ghost:** No background or border until hover. Used for sidebar items and secondary actions to reduce visual noise.

### Inputs

- **Field:** 1px border (`border` token) with a subtle inset shadow in Dark mode. On focus, the border changes to `accent` with a 2px outer glow of 10% opacity.

### Navigation Panels

- **Active State:** A vertical 2px line on the left side of the item using the `accent` color, paired with a slightly darker/lighter surface background.

### Callouts (AI Insights)

- **Design:** Bordered boxes with a light tinted background of the semantic color (e.g., light blue for info, light yellow for warning). Use an icon in the top left.

### Progress Bars

- **Track:** 4px height, using `surfaceElevated`.
- **Fill:** Gradient-free `accent` color. For "Forest" theme, use a soft sage green.

### Motion & Interaction

- All transitions (hover, toggle, panel collapse) must use a **200ms ease-out** curve.
- **Reading First:** When scrolling through content, the top navigation should blur or hide to maximize the vertical space for the serif text.
