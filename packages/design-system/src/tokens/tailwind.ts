export const tailwindColorExtensions: Record<string, string> = {
  // Surface colors
  surface: 'var(--oe-color-surface)',
  'surface-dim': 'var(--oe-color-surface-dim)',
  'surface-bright': 'var(--oe-color-surface-bright)',
  'surface-container-lowest': 'var(--oe-color-surface-container-lowest)',
  'surface-container-low': 'var(--oe-color-surface-container-low)',
  'surface-container': 'var(--oe-color-surface-container)',
  'surface-container-high': 'var(--oe-color-surface-container-high)',
  'surface-container-highest': 'var(--oe-color-surface-container-highest)',
  'on-surface': 'var(--oe-color-on-surface)',
  'on-surface-variant': 'var(--oe-color-on-surface-variant)',
  'inverse-surface': 'var(--oe-color-inverse-surface)',
  'inverse-on-surface': 'var(--oe-color-inverse-on-surface)',
  'surface-variant': 'var(--oe-color-surface-variant)',

  // Outline / border
  outline: 'var(--oe-color-outline)',
  'outline-variant': 'var(--oe-color-outline-variant)',
  'surface-tint': 'var(--oe-color-surface-tint)',

  // Primary
  primary: 'var(--oe-color-primary)',
  'on-primary': 'var(--oe-color-on-primary)',
  'primary-container': 'var(--oe-color-primary-container)',
  'on-primary-container': 'var(--oe-color-on-primary-container)',
  'inverse-primary': 'var(--oe-color-inverse-primary)',

  // Secondary
  secondary: 'var(--oe-color-secondary)',
  'on-secondary': 'var(--oe-color-on-secondary)',
  'secondary-container': 'var(--oe-color-secondary-container)',
  'on-secondary-container': 'var(--oe-color-on-secondary-container)',

  // Tertiary
  tertiary: 'var(--oe-color-tertiary)',
  'on-tertiary': 'var(--oe-color-on-tertiary)',
  'tertiary-container': 'var(--oe-color-tertiary-container)',
  'on-tertiary-container': 'var(--oe-color-on-tertiary-container)',

  // Error / destructive
  destructive: 'var(--oe-color-error)',
  error: 'var(--oe-color-error)',
  'on-error': 'var(--oe-color-on-error)',
  'error-container': 'var(--oe-color-error-container)',
  'on-error-container': 'var(--oe-color-on-error-container)',

  // Fixed variants
  'primary-fixed': 'var(--oe-color-primary-fixed)',
  'primary-fixed-dim': 'var(--oe-color-primary-fixed-dim)',
  'on-primary-fixed': 'var(--oe-color-on-primary-fixed)',
  'on-primary-fixed-variant': 'var(--oe-color-on-primary-fixed-variant)',
  'secondary-fixed': 'var(--oe-color-secondary-fixed)',
  'secondary-fixed-dim': 'var(--oe-color-secondary-fixed-dim)',
  'on-secondary-fixed': 'var(--oe-color-on-secondary-fixed)',
  'on-secondary-fixed-variant': 'var(--oe-color-on-secondary-fixed-variant)',
  'tertiary-fixed': 'var(--oe-color-tertiary-fixed)',
  'tertiary-fixed-dim': 'var(--oe-color-tertiary-fixed-dim)',
  'on-tertiary-fixed': 'var(--oe-color-on-tertiary-fixed)',
  'on-tertiary-fixed-variant': 'var(--oe-color-on-tertiary-fixed-variant)',

  // Background
  background: 'var(--oe-color-background)',
  'on-background': 'var(--oe-color-on-background)',

  // Misc
  'primary-light': 'var(--oe-color-primary-light)',
  success: 'var(--oe-color-success)',

  // Shadcn/ui semantic aliases — map to design-system tokens
  foreground: 'var(--oe-color-on-surface)',
  border: 'var(--oe-color-outline-variant)',
  input: 'var(--oe-color-outline-variant)',
  ring: 'var(--oe-color-primary)',
  'ring-offset': 'var(--oe-color-background)',

  // Card
  card: 'var(--oe-color-surface-container-lowest)',
  'card-foreground': 'var(--oe-color-on-surface)',

  // Popover
  popover: 'var(--oe-color-surface-container)',
  'popover-foreground': 'var(--oe-color-on-surface)',

  // Muted
  muted: 'var(--oe-color-surface-variant)',
  'muted-foreground': 'var(--oe-color-on-surface-variant)',

  // Accent
  accent: 'var(--oe-color-accent)',
  'accent-foreground': 'var(--oe-color-on-secondary)',

  // Primary foreground
  'primary-foreground': 'var(--oe-color-on-primary)',

  // Secondary foreground
  'secondary-foreground': 'var(--oe-color-on-secondary)',

  // Destructive foreground
  'destructive-foreground': 'var(--oe-color-on-error)',
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
  'label-caps': [
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
