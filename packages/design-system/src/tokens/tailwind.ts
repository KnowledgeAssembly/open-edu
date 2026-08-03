export const tailwindColorExtensions: Record<string, string> = {
  // Surface colors
  surface: 'rgb(var(--oe-color-surface-rgb) / <alpha-value>)',
  'surface-dim': 'rgb(var(--oe-color-surface-dim-rgb) / <alpha-value>)',
  'surface-bright': 'rgb(var(--oe-color-surface-bright-rgb) / <alpha-value>)',
  'surface-container-lowest': 'rgb(var(--oe-color-surface-container-lowest-rgb) / <alpha-value>)',
  'surface-container-low': 'rgb(var(--oe-color-surface-container-low-rgb) / <alpha-value>)',
  'surface-container': 'rgb(var(--oe-color-surface-container-rgb) / <alpha-value>)',
  'surface-container-high': 'rgb(var(--oe-color-surface-container-high-rgb) / <alpha-value>)',
  'surface-container-highest': 'rgb(var(--oe-color-surface-container-highest-rgb) / <alpha-value>)',
  'on-surface': 'rgb(var(--oe-color-on-surface-rgb) / <alpha-value>)',
  'on-surface-variant': 'rgb(var(--oe-color-on-surface-variant-rgb) / <alpha-value>)',
  'inverse-surface': 'rgb(var(--oe-color-inverse-surface-rgb) / <alpha-value>)',
  'inverse-on-surface': 'rgb(var(--oe-color-inverse-on-surface-rgb) / <alpha-value>)',
  'surface-variant': 'rgb(var(--oe-color-surface-variant-rgb) / <alpha-value>)',

  // Outline / border
  outline: 'rgb(var(--oe-color-outline-rgb) / <alpha-value>)',
  'outline-variant': 'rgb(var(--oe-color-outline-variant-rgb) / <alpha-value>)',
  'surface-tint': 'rgb(var(--oe-color-surface-tint-rgb) / <alpha-value>)',

  // Primary
  primary: 'rgb(var(--oe-color-primary-rgb) / <alpha-value>)',
  'on-primary': 'rgb(var(--oe-color-on-primary-rgb) / <alpha-value>)',
  'primary-container': 'rgb(var(--oe-color-primary-container-rgb) / <alpha-value>)',
  'on-primary-container': 'rgb(var(--oe-color-on-primary-container-rgb) / <alpha-value>)',
  'inverse-primary': 'rgb(var(--oe-color-inverse-primary-rgb) / <alpha-value>)',

  // Secondary
  secondary: 'rgb(var(--oe-color-secondary-rgb) / <alpha-value>)',
  'on-secondary': 'rgb(var(--oe-color-on-secondary-rgb) / <alpha-value>)',
  'secondary-container': 'rgb(var(--oe-color-secondary-container-rgb) / <alpha-value>)',
  'on-secondary-container': 'rgb(var(--oe-color-on-secondary-container-rgb) / <alpha-value>)',

  // Tertiary
  tertiary: 'rgb(var(--oe-color-tertiary-rgb) / <alpha-value>)',
  'on-tertiary': 'rgb(var(--oe-color-on-tertiary-rgb) / <alpha-value>)',
  'tertiary-container': 'rgb(var(--oe-color-tertiary-container-rgb) / <alpha-value>)',
  'on-tertiary-container': 'rgb(var(--oe-color-on-tertiary-container-rgb) / <alpha-value>)',

  // Error / destructive
  destructive: 'rgb(var(--oe-color-error-rgb) / <alpha-value>)',
  error: 'rgb(var(--oe-color-error-rgb) / <alpha-value>)',
  'on-error': 'rgb(var(--oe-color-on-error-rgb) / <alpha-value>)',
  'error-container': 'rgb(var(--oe-color-error-container-rgb) / <alpha-value>)',
  'on-error-container': 'rgb(var(--oe-color-on-error-container-rgb) / <alpha-value>)',

  // Success / warning
  success: 'rgb(var(--oe-color-success-rgb) / <alpha-value>)',
  'success-container': 'rgb(var(--oe-color-success-container-rgb) / <alpha-value>)',
  'on-success': 'rgb(var(--oe-color-on-success-rgb) / <alpha-value>)',
  'on-success-container': 'rgb(var(--oe-color-on-success-container-rgb) / <alpha-value>)',
  warning: 'rgb(var(--oe-color-warning-rgb) / <alpha-value>)',

  // Fixed variants
  'primary-fixed': 'rgb(var(--oe-color-primary-fixed-rgb) / <alpha-value>)',
  'primary-fixed-dim': 'rgb(var(--oe-color-primary-fixed-dim-rgb) / <alpha-value>)',
  'on-primary-fixed': 'rgb(var(--oe-color-on-primary-fixed-rgb) / <alpha-value>)',
  'on-primary-fixed-variant': 'rgb(var(--oe-color-on-primary-fixed-variant-rgb) / <alpha-value>)',
  'secondary-fixed': 'rgb(var(--oe-color-secondary-fixed-rgb) / <alpha-value>)',
  'secondary-fixed-dim': 'rgb(var(--oe-color-secondary-fixed-dim-rgb) / <alpha-value>)',
  'on-secondary-fixed': 'rgb(var(--oe-color-on-secondary-fixed-rgb) / <alpha-value>)',
  'on-secondary-fixed-variant':
    'rgb(var(--oe-color-on-secondary-fixed-variant-rgb) / <alpha-value>)',
  'tertiary-fixed': 'rgb(var(--oe-color-tertiary-fixed-rgb) / <alpha-value>)',
  'tertiary-fixed-dim': 'rgb(var(--oe-color-tertiary-fixed-dim-rgb) / <alpha-value>)',
  'on-tertiary-fixed': 'rgb(var(--oe-color-on-tertiary-fixed-rgb) / <alpha-value>)',
  'on-tertiary-fixed-variant': 'rgb(var(--oe-color-on-tertiary-fixed-variant-rgb) / <alpha-value>)',

  // Background
  background: 'rgb(var(--oe-color-background-rgb) / <alpha-value>)',
  'on-background': 'rgb(var(--oe-color-on-background-rgb) / <alpha-value>)',

  // Misc
  'primary-light': 'rgb(var(--oe-color-primary-light-rgb) / <alpha-value>)',

  // Shadcn/ui semantic aliases — map to design-system tokens
  foreground: 'rgb(var(--oe-color-on-surface-rgb) / <alpha-value>)',
  border: 'rgb(var(--oe-color-outline-variant-rgb) / <alpha-value>)',
  input: 'rgb(var(--oe-color-outline-variant-rgb) / <alpha-value>)',
  ring: 'rgb(var(--oe-color-primary-rgb) / <alpha-value>)',
  'ring-offset': 'rgb(var(--oe-color-background-rgb) / <alpha-value>)',

  // Card
  card: 'rgb(var(--oe-color-surface-container-lowest-rgb) / <alpha-value>)',
  'card-foreground': 'rgb(var(--oe-color-on-surface-rgb) / <alpha-value>)',

  // Popover
  popover: 'rgb(var(--oe-color-surface-container-rgb) / <alpha-value>)',
  'popover-foreground': 'rgb(var(--oe-color-on-surface-rgb) / <alpha-value>)',

  // Muted
  muted: 'rgb(var(--oe-color-surface-variant-rgb) / <alpha-value>)',
  'muted-foreground': 'rgb(var(--oe-color-on-surface-variant-rgb) / <alpha-value>)',

  // Accent
  accent: 'rgb(var(--oe-color-accent-rgb) / <alpha-value>)',
  'accent-foreground': 'rgb(var(--oe-color-on-secondary-rgb) / <alpha-value>)',

  // Primary foreground
  'primary-foreground': 'rgb(var(--oe-color-on-primary-rgb) / <alpha-value>)',

  // Secondary foreground
  'secondary-foreground': 'rgb(var(--oe-color-on-secondary-rgb) / <alpha-value>)',

  // Destructive foreground
  'destructive-foreground': 'rgb(var(--oe-color-on-error-rgb) / <alpha-value>)',
};

export const tailwindFontFamilyExtensions: Record<string, string> = {
  display: 'var(--oe-font-expressive-display-family)',
  'display-lg': 'var(--oe-font-expressive-display-family)',
  'headline-lg': 'var(--oe-font-productive-heading-family)',
  'headline-md': 'var(--oe-font-productive-subheading-family)',
  title: 'var(--oe-font-productive-subheading-family)',
  'body-lg': 'var(--oe-font-expressive-body-family)',
  'body-md': 'var(--oe-font-productive-body-family)',
  'body-reading': 'var(--oe-font-expressive-body-family)',
  label: 'var(--oe-font-productive-label-family)',
  'label-caps': 'var(--oe-font-productive-label-family)',
  caption: 'var(--oe-font-productive-caption-family)',
  mono: 'var(--oe-font-productive-code-family)',
};

export const tailwindFontSizeExtensions: Record<string, [string, Record<string, string>]> = {
  'display-lg': [
    'var(--oe-font-expressive-display-size)',
    {
      lineHeight: 'var(--oe-font-expressive-display-lineHeight)',
      letterSpacing: 'var(--oe-font-expressive-display-letterSpacing)',
      fontWeight: 'var(--oe-font-expressive-display-weight)',
    },
  ],
  h1: [
    'var(--oe-font-productive-heading-size)',
    {
      lineHeight: 'var(--oe-font-productive-heading-lineHeight)',
      fontWeight: 'var(--oe-font-productive-heading-weight)',
    },
  ],
  h2: [
    'var(--oe-font-productive-subheading-size)',
    {
      lineHeight: 'var(--oe-font-productive-subheading-lineHeight)',
      fontWeight: 'var(--oe-font-productive-subheading-weight)',
    },
  ],
  h3: [
    'var(--oe-font-productive-heading3-size)',
    {
      lineHeight: 'var(--oe-font-productive-heading3-lineHeight)',
      fontWeight: 'var(--oe-font-productive-heading3-weight)',
    },
  ],
  h4: [
    'var(--oe-font-productive-heading4-size)',
    {
      lineHeight: 'var(--oe-font-productive-heading4-lineHeight)',
      fontWeight: 'var(--oe-font-productive-heading4-weight)',
    },
  ],
  h5: [
    'var(--oe-font-productive-heading5-size)',
    {
      lineHeight: 'var(--oe-font-productive-heading5-lineHeight)',
      fontWeight: 'var(--oe-font-productive-heading5-weight)',
    },
  ],
  h6: [
    'var(--oe-font-productive-heading6-size)',
    {
      lineHeight: 'var(--oe-font-productive-heading6-lineHeight)',
      fontWeight: 'var(--oe-font-productive-heading6-weight)',
    },
  ],
  'headline-lg': [
    'var(--oe-font-productive-display-size)',
    {
      lineHeight: 'var(--oe-font-productive-display-lineHeight)',
      fontWeight: 'var(--oe-font-productive-display-weight)',
    },
  ],
  'body-reading': [
    'var(--oe-font-expressive-body-size)',
    {
      lineHeight: 'var(--oe-font-expressive-body-lineHeight)',
      fontWeight: 'var(--oe-font-expressive-body-weight)',
    },
  ],
  'body-ui': [
    'var(--oe-font-productive-body-size)',
    {
      lineHeight: 'var(--oe-font-productive-body-lineHeight)',
      fontWeight: 'var(--oe-font-productive-body-weight)',
    },
  ],
  caption: [
    'var(--oe-font-productive-caption-size)',
    {
      lineHeight: 'var(--oe-font-productive-caption-lineHeight)',
      fontWeight: 'var(--oe-font-productive-caption-weight)',
    },
  ],
  'label-caps': [
    'var(--oe-font-productive-label-size)',
    {
      lineHeight: 'var(--oe-font-productive-label-lineHeight)',
      letterSpacing: 'var(--oe-font-productive-label-letterSpacing)',
      fontWeight: 'var(--oe-font-productive-label-weight)',
    },
  ],
  label: [
    'var(--oe-font-productive-label-size)',
    {
      lineHeight: 'var(--oe-font-productive-label-lineHeight)',
      letterSpacing: 'var(--oe-font-productive-label-letterSpacing)',
      fontWeight: 'var(--oe-font-productive-label-weight)',
    },
  ],
  mono: [
    'var(--oe-font-productive-code-size)',
    {
      lineHeight: 'var(--oe-font-productive-code-lineHeight)',
      fontWeight: 'var(--oe-font-productive-code-weight)',
    },
  ],
};

export const tailwindSpacingExtensions: Record<string, string> = {
  base: 'var(--oe-space-base)',
  xs: 'var(--oe-space-xs)',
  sm: 'var(--oe-space-sm)',
  md: 'var(--oe-space-md)',
  lg: 'var(--oe-space-lg)',
  xl: 'var(--oe-space-xl)',
  gutter: 'var(--oe-space-gutter)',
  'margin-desktop': 'var(--oe-space-margin-desktop)',
  'margin-mobile': 'var(--oe-space-margin-mobile)',
  'container-max': 'var(--oe-space-container-max)',
  'panel-nav': 'var(--oe-space-panel-nav)',
  'panel-explorer': 'var(--oe-space-panel-explorer)',
  'reading-width': 'var(--oe-reading-width)',
  'paragraph-spacing': 'var(--oe-paragraph-spacing)',
};

export const tailwindRadiusExtensions: Record<string, string> = {
  DEFAULT: 'var(--oe-radius-DEFAULT)',
  sm: 'var(--oe-radius-sm)',
  md: 'var(--oe-radius-md)',
  lg: 'var(--oe-radius-lg)',
  xl: 'var(--oe-radius-xl)',
  full: 'var(--oe-radius-full)',
};

export const tailwindTransitionDurationExtensions: Record<string, string> = {
  fast: 'var(--oe-motion-duration-fast)',
  normal: 'var(--oe-motion-duration-normal)',
  slow: 'var(--oe-motion-duration-slow)',
};

export const tailwindTransitionTimingExtensions: Record<string, string> = {
  in: 'var(--oe-motion-easing-ease-in)',
  out: 'var(--oe-motion-easing-ease-out)',
  'in-out': 'var(--oe-motion-easing-ease-in-out)',
};

export const tailwindSizingExtensions: Record<string, string> = {
  'icon-xs': 'var(--oe-size-icon-xs)',
  'icon-sm': 'var(--oe-size-icon-sm)',
  'icon-md': 'var(--oe-size-icon-md)',
  'icon-lg': 'var(--oe-size-icon-lg)',
  'icon-xl': 'var(--oe-size-icon-xl)',
};

export const tailwindComponentHeightExtensions: Record<string, string> = {
  xs: 'var(--oe-size-height-xs)',
  sm: 'var(--oe-size-height-sm)',
  md: 'var(--oe-size-height-md)',
  lg: 'var(--oe-size-height-lg)',
  xl: 'var(--oe-size-height-xl)',
};

export const tailwindMinWidthExtensions: Record<string, string> = {
  xs: 'var(--oe-size-min-width-xs)',
  sm: 'var(--oe-size-min-width-sm)',
  md: 'var(--oe-size-min-width-md)',
  lg: 'var(--oe-size-min-width-lg)',
};

export const tailwindOpacityExtensions: Record<string, string> = {
  '0': 'var(--oe-opacity-0)',
  '5': 'var(--oe-opacity-5)',
  '10': 'var(--oe-opacity-10)',
  '20': 'var(--oe-opacity-20)',
  '30': 'var(--oe-opacity-30)',
  '40': 'var(--oe-opacity-40)',
  '50': 'var(--oe-opacity-50)',
  '60': 'var(--oe-opacity-60)',
  '70': 'var(--oe-opacity-70)',
  '80': 'var(--oe-opacity-80)',
  '90': 'var(--oe-opacity-90)',
  '100': 'var(--oe-opacity-100)',
};

export const tailwindBorderWidthExtensions: Record<string, string> = {
  '0': 'var(--oe-border-width-0)',
  '1': 'var(--oe-border-width-1)',
  '2': 'var(--oe-border-width-2)',
  '4': 'var(--oe-border-width-4)',
  '8': 'var(--oe-border-width-8)',
};

export const tailwindFocusExtensions: Record<string, string> = {
  width: 'var(--oe-focus-ring-width)',
  offset: 'var(--oe-focus-ring-offset)',
  color: 'var(--oe-focus-ring-color)',
};

export const tailwindIconSizeExtensions: Record<string, string> = {
  xs: 'var(--oe-icon-size-xs)',
  sm: 'var(--oe-icon-size-sm)',
  md: 'var(--oe-icon-size-md)',
  lg: 'var(--oe-icon-size-lg)',
  xl: 'var(--oe-icon-size-xl)',
  '2xl': 'var(--oe-icon-size-2xl)',
};

export const tailwindElevationExtensions: Record<string, string> = {
  'elevation-flat': 'var(--oe-elevation-flat)',
  'elevation-raised': 'var(--oe-elevation-raised)',
  'elevation-overlay': 'var(--oe-elevation-overlay)',
  'elevation-modal': 'var(--oe-elevation-modal)',
  'elevation-sticky': 'var(--oe-elevation-sticky)',
};

export const tailwindAnimationExtensions: Record<string, string> = {
  'orbit-float': 'orbit-float 3s ease-in-out infinite',
  'pipili-wave': 'pipili-wave 2s ease-in-out infinite',
  'pipili-nod': 'pipili-nod 1.5s ease-in-out infinite',
  'pipili-surprised': 'pipili-surprised 0.6s ease-in-out',
  'pipili-reward-enter': 'pipili-reward-enter 0.3s ease-out',
  'banner-slide-down': 'banner-slide-down 0.3s ease-out',
};

export const tailwindLayoutExtensions: Record<string, string> = {
  sidebar: 'var(--oe-layout-sidebar-width)',
  'sidebar-collapsed': 'var(--oe-layout-sidebar-collapsed-width)',
  header: 'var(--oe-layout-header-height)',
  'panel-nav': 'var(--oe-layout-panel-nav-width)',
  'panel-explorer': 'var(--oe-layout-panel-explorer-width)',
  content: 'var(--oe-layout-content-max-width)',
  reading: 'var(--oe-layout-reading-width)',
  'grid-sm': 'var(--oe-layout-grid-gap-sm)',
  'grid-md': 'var(--oe-layout-grid-gap-md)',
  'grid-lg': 'var(--oe-layout-grid-gap-lg)',
  'grid-xl': 'var(--oe-layout-grid-gap-xl)',
};
