---
name: High Focus
colors:
  surface: '#fcf8f9'
  surface-dim: '#dcd9da'
  surface-bright: '#fcf8f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f4'
  surface-container: '#f0edee'
  surface-container-high: '#eae7e8'
  surface-container-highest: '#e5e2e3'
  on-surface: '#1b1b1c'
  on-surface-variant: '#434653'
  inverse-surface: '#303031'
  inverse-on-surface: '#f3f0f1'
  outline: '#747685'
  outline-variant: '#c4c5d6'
  surface-tint: '#2a55c9'
  primary: '#002a81'
  on-primary: '#ffffff'
  primary-container: '#003eb3'
  on-primary-container: '#a2b6ff'
  inverse-primary: '#b5c4ff'
  secondary: '#046d3f'
  on-secondary: '#ffffff'
  secondary-container: '#9af3b8'
  on-secondary-container: '#0f7142'
  tertiary: '#631700'
  on-tertiary: '#ffffff'
  tertiary-container: '#8a2501'
  on-tertiary-container: '#ffa185'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b5c4ff'
  on-primary-fixed: '#00164e'
  on-primary-fixed-variant: '#003cad'
  secondary-fixed: '#9df5bb'
  secondary-fixed-dim: '#81d9a0'
  on-secondary-fixed: '#00210f'
  on-secondary-fixed-variant: '#00522e'
  tertiary-fixed: '#ffdbd1'
  tertiary-fixed-dim: '#ffb59f'
  on-tertiary-fixed: '#3a0a00'
  on-tertiary-fixed-variant: '#862300'
  background: '#fcf8f9'
  on-background: '#1b1b1c'
  surface-variant: '#e5e2e3'
typography:
  headline-lg:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 26px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.02em
  caption:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.4'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  gutter: 24px
  margin-desktop: 64px
  margin-mobile: 20px
  container-max: 1100px
---

## Brand & Style
The design system is engineered for cognitive accessibility, specifically targeting neurodivergent users who benefit from reduced sensory overload and clear information hierarchy. The brand personality is grounded, supportive, and exceptionally organized.

The visual style is **High-Contrast / Modern**, utilizing a "Structured Minimalist" approach. By stripping away non-functional decorative elements like gradients, shadows, and blurs, the design system eliminates visual noise that can lead to executive dysfunction or overstimulation. Key characteristics include heavy structural lines, generous negative space to prevent "clutter anxiety," and a strict adherence to predictable UI patterns.

## Colors
This design system prioritizes a high-contrast ratio (WCAG AAA compliance where possible) to ensure text and functional elements are unmistakable. 

- **Primary:** A deep, stable Blue (#003EB3) used for main actions and focus states. It provides a calm, authoritative anchor for the UI.
- **Secondary:** A muted but distinct Forest Green (#006B3D) used for success states and secondary progress indicators, chosen for its grounding effect.
- **Neutral:** A near-black Carbon (#1A1A1B) for text to maximize legibility without the harsh vibration of pure #000000 on pure white for some users.
- **Surface Strategy:** Surfaces use distinct light grays to separate content blocks without relying on shadows.

## Typography
Typography is the core of this design system. We use **Atkinson Hyperlegible Next** for all editorial and functional text; its character differentiation (e.g., distinguishing between 'I', 'l', and '1') is critical for users with dyslexia or processing challenges.

- **Line Height:** Body text uses a generous 1.6x line height to prevent "line jumping" while reading.
- **Paragraph Spacing:** Ensure large gaps between paragraphs to facilitate scanning.
- **Technical Labels:** **JetBrains Mono** is used for metadata and labels. The monospaced nature provides a rhythmic, predictable structure for data-heavy information.

## Layout & Spacing
The layout follows a **Fixed Grid** philosophy on desktop to limit the horizontal scanning distance, which can be taxing for neurodivergent learners.

- **Content Center:** All primary learning content is constrained to a 1100px max-width container to maintain a comfortable reading eye-span.
- **Rhythm:** An 8px linear scale is used. Group related items with 8px or 16px, and separate distinct sections with 48px or 64px to provide clear "mental breaks" between topics.
- **Mobile:** On mobile, margins are reduced to 20px, and gutters to 16px. Vertical stacking is strictly enforced—no multi-column layouts on mobile to reduce cognitive load.

## Elevation & Depth
This design system avoids shadows entirely. Depth is communicated through **Bold Borders** and **Tonal Layers**.

- **Borders:** All interactive elements (cards, inputs, buttons) must have a 2px solid border. This creates a clear "container" for the eye to land on.
- **Z-Index Strategy:** Layers are represented by physical stacking. A "raised" element simply uses a thicker border or a high-contrast background color (e.g., a white card on a light gray background).
- **Focus States:** Focus indicators are highly aggressive—using a 4px primary-colored offset outline to ensure the user always knows exactly where the keyboard focus resides.

## Shapes
We use a **Soft** shape language (4px - 8px radius). Pure sharp corners can feel overly clinical or "harsh," while fully rounded/pill shapes can look like "toys." A slight rounding provides a professional yet approachable feel that defines the edges clearly without being visually aggressive.

- **Standard Radius:** 4px for small components (checkboxes, tags).
- **Large Radius:** 8px for containers (cards, modals).

## Components
- **Buttons:** Must be 2px solid bordered. Primary buttons use a solid primary color fill with white text. Secondary buttons use a white background with a primary border and text. Never use "ghost" buttons with no borders.
- **Inputs:** Input fields must have a permanent 2px border (#1A1A1B). Active states should change the border color to Primary and increase thickness to 3px. Place labels permanently above the field; never use disappearing placeholder text as the primary label.
- **Cards:** Use a white background with a 2px neutral border. No shadows. Use a "Header" section within the card with a light gray fill to separate the title from the body.
- **Progress Indicators:** Use simple, thick bars. Avoid circular spinners; use linear loading bars to provide a better sense of "time remaining," which assists with time blindness.
- **Checkboxes/Radio Buttons:** Scaled up to 24x24px for easier interaction. Use the 2px border style consistently.
- **Alerts/Toasts:** Use high-contrast color blocks with a thick 4px left-hand border in the status color (e.g., Red for errors).