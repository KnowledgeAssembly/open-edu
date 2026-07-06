---
name: Open-Edu Design System
version: '1.0'
description: Open runtime for educational experiences with a 3-theme system (Light, Dark, Zen)
colors:
  primary: '#1d1b20'
  secondary: '#494551'
  tertiary: '#6750a4'
  error: '#ba1a1a'
  background: '#ffffff'
  surface: '#fdf7ff'
  on-primary: '#ffffff'
  on-secondary: '#ffffff'
  on-tertiary: '#ffffff'
  on-background: '#1d1b20'
  on-surface: '#1d1b20'
typography:
  display:
    fontFamily: Inter, system-ui, -apple-system, sans-serif
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  heading:
    fontFamily: Inter, system-ui, -apple-system, sans-serif
    fontSize: 28px
    fontWeight: '650'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  body:
    fontFamily: Inter, system-ui, -apple-system, sans-serif
    fontSize: 14px
    fontWeight: '420'
    lineHeight: '1.6'
  label:
    fontFamily: Inter, system-ui, -apple-system, sans-serif
    fontSize: 11px
    fontWeight: '600'
    lineHeight: '1.0'
    letterSpacing: 0.08em
rounded:
  sm: 4px
  md: 8px
  lg: 12px
spacing:
  sm: 8px
  md: 16px
  lg: 24px
components:
  button-primary:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.on-primary}'
---

## Overview

The Open-Edu Design System is built to support an open runtime for educational experiences. It is a monorepo framework designed to separate educational content from delivery platforms, ensuring accessibility and extensibility through a configurable runtime.

## Themes

The design system incorporates a multi-theme architecture consisting of:

- **Light:** A clean and vibrant interface.
- **Dark:** A low-glare mode for visual comfort.
- **Zen:** A warm, limestone foundation (e.g., `#f5f5f4`) designed to minimize distraction.

## Colors

The palette leverages high-contrast foregrounds on clean backgrounds to ensure accessibility, with support for semantic mapping across themes.

- **Primary:** Core text and primary elements.
- **Secondary:** Borders, captions, and secondary elements.
- **Tertiary:** Interactive accents (e.g., purple tones `#6750a4`).
- **Error:** Destructive actions and form validation (`#ba1a1a`).

## Typography

The typography system is divided into two primary sets:

- **Productive:** Utilizes `Inter` for highly functional, data-dense interfaces.
- **Expressive:** Utilizes `Source Serif 4` for reading-focused, editorial educational content.

## Accessibility

Built-in accessibility is a first-class citizen:

- Strict adherence to WCAG color contrast ratios.
- All interactive components support focus traps and ARIA live regions.
- Rendered UI must pass `axe-core` audits.
