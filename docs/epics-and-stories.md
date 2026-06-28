# Carbon Adoption — Epics & Stories

**Target AI:** deepseek-4-flash (or any agent implementing independently)
**Convention:** Each story is self-contained. Read the "Context" section first, then implement.
**Verify:** `pnpm build && pnpm test && pnpm lint && pnpm typecheck` after each story.

---

## Epic 1: Design Token Foundation

| Story  | Description                                                   | Depends On     |
| ------ | ------------------------------------------------------------- | -------------- |
| DS-001 | Scaffold `@open-edu/design-system` package                    | —              |
| DS-002 | Create color tokens                                           | —              |
| DS-003 | Create spacing tokens                                         | —              |
| DS-004 | Create typography tokens                                      | —              |
| DS-005 | Create radius, elevation, motion, breakpoints, z-index tokens | —              |
| DS-006 | Wire tokens into theme system                                 | DS-002, DS-005 |
| DS-007 | Wire tokens into Tailwind configs                             | DS-006         |

---

### DS-001: Scaffold `@open-edu/design-system` package

**Context:** There is no `packages/design-system/` directory. We need to create it as a standard monorepo package exporting React components and TypeScript types.

**Files to create:**

```
packages/design-system/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   └── tokens/
│       └── index.ts
```

**`packages/design-system/package.json`:**

```json
{
  "name": "@open-edu/design-system",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./tokens": "./src/tokens/index.ts"
  },
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0"
  }
}
```

**`packages/design-system/tsconfig.json`:**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "jsx": "react-jsx"
  },
  "include": ["src"]
}
```

**`packages/design-system/src/index.ts`:**

```ts
export {};
```

**`packages/design-system/src/tokens/index.ts`:**

```ts
export {};
```

**`pnpm-workspace.yaml` update:** Ensure `packages/design-system` is included (it should be if it matches `packages/*`).

**Tests:** None for scaffolding alone.

**Acceptance:**

- `pnpm --filter @open-edu/design-system exec tsc --noEmit` passes
- `pnpm --filter @open-edu/design-system exec node -e "require('./src/index.ts')"` works (or just `pnpm build` passes)
- No lint errors

---

### DS-002: Create Color Tokens

**Context:** Current colors live in `packages/runtime/src/themes/` as hardcoded hex values inside each theme definition. The `component-audit.md` identifies inconsistencies (wrong fallback values, missing semantic aliases). We need a centralized color token system that both theme definitions and tailwind configs can consume.

**Files to create:**

- `packages/design-system/src/tokens/colors.ts`

**`packages/design-system/src/tokens/colors.ts`:**

Define three exports:

1. **`palette`** — the raw hex values (immutable, fine-grained)
2. **`semanticColors`** — semantic aliases that reference palette or direct hex values
3. **`colorTokenToCssVar`** — helper function that converts token path to `var(--oe-color-...)`

```ts
export const palette = {
  white: '#ffffff',
  black: '#000000',
  // Material-based base palette from existing themes
  purple10: '#22005d',
  purple20: '#4f378a',
  purple30: '#6750a4',
  purple40: '#7c6bb0',
  purple80: '#cfbcff',
  purple90: '#eaddff',
  purple95: '#f5eeff',
  purple99: '#fdf7ff',
  gray10: '#1d1b20',
  gray20: '#322f35',
  gray30: '#494551',
  gray40: '#7a7582',
  gray50: '#cbc4d2',
  gray80: '#e6e0e9',
  gray85: '#ece6ee',
  gray90: '#f2ecf4',
  gray92: '#f8f2fa',
  gray95: '#ded8e0',
  gray99: '#fdf7ff',
  red20: '#93000a',
  red30: '#ba1a1a',
  red80: '#ffb4ab',
  red90: '#ffdad6',
  green20: '#046d3f',
  green30: '#16a34a',
  green80: '#a7f0ba',
  green90: '#dafbe3',
  amber40: '#765b00',
  amber60: '#e7c365',
  amber80: '#ffdf93',
  blue40: '#003eb3',
  blue80: '#7fa9ff',
  blue90: '#d4e3ff',
} as const;

export interface SemanticColorTokens {
  surface: string;
  'surface-dim': string;
  'surface-bright': string;
  'surface-container-lowest': string;
  'surface-container-low': string;
  'surface-container': string;
  'surface-container-high': string;
  'surface-container-highest': string;
  'on-surface': string;
  'on-surface-variant': string;
  'inverse-surface': string;
  'inverse-on-surface': string;
  outline: string;
  'outline-variant': string;
  'surface-tint': string;
  primary: string;
  'on-primary': string;
  'primary-container': string;
  'on-primary-container': string;
  'inverse-primary': string;
  secondary: string;
  'on-secondary': string;
  'secondary-container': string;
  'on-secondary-container': string;
  tertiary: string;
  'on-tertiary': string;
  'tertiary-container': string;
  'on-tertiary-container': string;
  error: string;
  'on-error': string;
  'error-container': string;
  'on-error-container': string;
  'primary-fixed': string;
  'primary-fixed-dim': string;
  'on-primary-fixed': string;
  'on-primary-fixed-variant': string;
  'secondary-fixed': string;
  'secondary-fixed-dim': string;
  'on-secondary-fixed': string;
  'on-secondary-fixed-variant': string;
  'tertiary-fixed': string;
  'tertiary-fixed-dim': string;
  'on-tertiary-fixed': string;
  'on-tertiary-fixed-variant': string;
  background: string;
  'on-background': string;
  'surface-variant': string;
  // Convenience aliases
  bg: string;
  fg: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
}

type DeepColorTokens = Record<string, string | Record<string, string>>;

export type ColorTokens = Record<string, string>;

export function flattenColorTokens(tokens: DeepColorTokens): ColorTokens {
  const result: ColorTokens = {};
  for (const [key, value] of Object.entries(tokens)) {
    if (typeof value === 'string') {
      result[key] = value;
    } else if (typeof value === 'object') {
      for (const [subkey, subvalue] of Object.entries(value)) {
        result[`${key}-${subkey}`] = String(subvalue);
      }
    }
  }
  return result;
}

export function colorTokenToCssVar(tokenPath: string): string {
  return `var(--oe-color-${tokenPath})`;
}
```

**Update `packages/design-system/src/tokens/index.ts`:** Add `export * from './colors.js';`

**Tests to create at `packages/design-system/src/tokens/__tests__/colors.test.ts`:**

```ts
import { describe, it, expect } from 'vitest';
import { palette, flattenColorTokens, colorTokenToCssVar } from '../colors.js';

describe('color tokens', () => {
  it('exports palette with all base colors', () => {
    expect(palette.white).toBe('#ffffff');
    expect(palette.purple30).toBe('#6750a4');
  });

  it('flattenColorTokens flattens nested structure', () => {
    const result = flattenColorTokens({ base: { primary: '#000' } });
    expect(result['base-primary']).toBe('#000');
  });

  it('colorTokenToCssVar produces correct CSS variable string', () => {
    expect(colorTokenToCssVar('primary')).toBe('var(--oe-color-primary)');
    expect(colorTokenToCssVar('on-surface')).toBe('var(--oe-color-on-surface)');
  });
});
```

**Acceptance:**

- `pnpm --filter @open-edu/design-system test` passes
- Types are correct: `palette` is const/readonly
- `flattenColorTokens` handles both flat and nested objects

---

### DS-003: Create Spacing Tokens

**Context:** Current spacing is a `SpacingTokens` interface in `packages/runtime/src/themes/types.ts`. Carbon uses a 2-4-8 spacing scale. We need to match the current OpenEdu values exactly while making them reusable.

**File:** `packages/design-system/src/tokens/spacing.ts`

```ts
export const spacingScale = {
  '2xs': '2px',
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  '2xl': '32px',
  '3xl': '40px',
  '4xl': '48px',
  '5xl': '64px',
} as const;

export type SpacingKey = keyof typeof spacingScale;
export type SpacingTokens = Record<SpacingKey, string>;

export function spacingTokenToCssVar(token: SpacingKey): string {
  return `var(--oe-space-${token})`;
}
```

**Update `packages/design-system/src/tokens/index.ts`:** Add `export * from './spacing.js';`

**Tests at `packages/design-system/src/tokens/__tests__/spacing.test.ts`:**

```ts
import { describe, it, expect } from 'vitest';
import { spacingScale, spacingTokenToCssVar } from '../spacing.js';

describe('spacing tokens', () => {
  it('exports standard spacing scale', () => {
    expect(spacingScale.xs).toBe('4px');
    expect(spacingScale.sm).toBe('8px');
    expect(spacingScale.md).toBe('12px');
    expect(spacingScale.lg).toBe('16px');
    expect(spacingScale.xl).toBe('24px');
  });

  it('spacingTokenToCssVar produces correct CSS variable string', () => {
    expect(spacingTokenToCssVar('md')).toBe('var(--oe-space-md)');
  });
});
```

---

### DS-004: Create Typography Tokens

**Context:** Current typography uses 9 semantic roles in `packages/runtime/src/themes/types.ts`. Carbon uses a 13-step type scale with two sets (productive + expressive). We'll create a unified token set that matches existing OpenEdu roles.

**File:** `packages/design-system/src/tokens/typography.ts`

```ts
export interface TypographyToken {
  fontFamily: string;
  fontSize: string;
  fontWeight: string | number;
  lineHeight: string | number;
  letterSpacing?: string;
}

export type TypographyRole =
  | 'display'
  | 'headlineLg'
  | 'headlineMd'
  | 'title'
  | 'bodyLg'
  | 'bodyMd'
  | 'label'
  | 'caption'
  | 'mono';

export type TypographyTokens = Record<TypographyRole, TypographyToken>;

export const defaultTypography: TypographyTokens = {
  display: {
    fontFamily: 'Inter',
    fontSize: '48px',
    fontWeight: '700',
    lineHeight: '1.1',
    letterSpacing: '-0.02em',
  },
  headlineLg: {
    fontFamily: 'Inter',
    fontSize: '30px',
    fontWeight: '600',
    lineHeight: '1.3',
    letterSpacing: '-0.01em',
  },
  headlineMd: {
    fontFamily: 'Inter',
    fontSize: '24px',
    fontWeight: '600',
    lineHeight: '1.3',
  },
  title: {
    fontFamily: 'Inter',
    fontSize: '24px',
    fontWeight: '600',
    lineHeight: '1.3',
  },
  bodyLg: {
    fontFamily: 'Source Serif 4',
    fontSize: '18px',
    fontWeight: '400',
    lineHeight: '1.7',
  },
  bodyMd: {
    fontFamily: 'Inter',
    fontSize: '14px',
    fontWeight: '400',
    lineHeight: '1.5',
  },
  label: {
    fontFamily: 'Inter',
    fontSize: '12px',
    fontWeight: '600',
    lineHeight: '1.0',
    letterSpacing: '0.05em',
  },
  caption: {
    fontFamily: 'Inter',
    fontSize: '14px',
    fontWeight: '400',
    lineHeight: '1.5',
  },
  mono: {
    fontFamily: 'JetBrains Mono',
    fontSize: '13px',
    fontWeight: '400',
    lineHeight: '1.6',
  },
};

export function typographyTokenToCssVar(
  role: TypographyRole,
  property: keyof TypographyToken,
): string {
  return `var(--oe-font-${role}-${property})`;
}
```

**Update `packages/design-system/src/tokens/index.ts`**

**Tests at `packages/design-system/src/tokens/__tests__/typography.test.ts`:**

```ts
import { describe, it, expect } from 'vitest';
import { defaultTypography, typographyTokenToCssVar } from '../typography.js';

describe('typography tokens', () => {
  it('exports all 9 typography roles', () => {
    const roles = [
      'display',
      'headlineLg',
      'headlineMd',
      'title',
      'bodyLg',
      'bodyMd',
      'label',
      'caption',
      'mono',
    ];
    for (const role of roles) {
      expect(defaultTypography[role]).toBeDefined();
      expect(defaultTypography[role].fontFamily).toBeDefined();
      expect(defaultTypography[role].fontSize).toBeDefined();
    }
  });

  it('typographyTokenToCssVar produces correct CSS variable string', () => {
    expect(typographyTokenToCssVar('bodyMd', 'fontFamily')).toBe('var(--oe-font-bodyMd-family)');
  });
});
```

---

### DS-005: Create Remaining Token Files

**Context:** Token categories beyond color/spacing/typography — radius, elevation, motion, breakpoints, z-index.

**Create these files matching existing theme values:**

**`packages/design-system/src/tokens/radius.ts`:**

```ts
export const radiusScale = {
  sm: '0.125rem',
  DEFAULT: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  full: '9999px',
} as const;

export type RadiusKey = keyof typeof radiusScale;
```

**`packages/design-system/src/tokens/elevation.ts`:**

```ts
export interface ElevationToken {
  boxShadow: string;
}

export const elevationScale: Record<string, ElevationToken> = {
  flat: { boxShadow: 'none' },
  raised: { boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  overlay: { boxShadow: '0 4px 16px rgba(0,0,0,0.15)' },
  modal: { boxShadow: '0 8px 32px rgba(0,0,0,0.2)' },
  sticky: { boxShadow: '0 2px 8px rgba(0,0,0,0.12)' },
};
```

**`packages/design-system/src/tokens/motion.ts`:**

```ts
export const motionTokens = {
  durationFast: '100ms',
  durationNormal: '200ms',
  durationSlow: '400ms',
  easingEaseInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easingEaseOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easingEaseIn: 'cubic-bezier(0.4, 0, 1, 1)',
} as const;
```

**`packages/design-system/src/tokens/breakpoints.ts`:**

```ts
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;
```

**`packages/design-system/src/tokens/z-index.ts`:**

```ts
export const zIndexScale = {
  dropdown: 50,
  sticky: 100,
  modal: 200,
  popover: 300,
  tooltip: 400,
  toast: 500,
} as const;
```

**Update each into `packages/design-system/src/tokens/index.ts`**

**Tests:** Each file gets a basic test validating exports exist and match expected types.

---

### DS-006: Wire Tokens into Theme System

**Context:** Currently `packages/runtime/src/themes/lumina-scholastica.ts` and friends have hardcoded hex values. They should import from `@open-edu/design-system/tokens`. The `flattenTheme()` in `theme.tsx` should also move to design-system.

**Files to modify:**

- `packages/design-system/src/tokens/index.ts` — add flatten utility
- `packages/design-system/src/tokens/theme.ts` — new: flatten + CSS var generation
- `packages/runtime/src/themes/lumina-scholastica.ts` — import tokens
- `packages/runtime/src/themes/high-focus.ts` — import tokens
- `packages/runtime/src/themes/nocturnal.ts` — import tokens
- `packages/runtime/src/themes/sylvan-workspace.ts` — import tokens
- `packages/runtime/src/theme.tsx` — use design-system utility

**Step 1: Create `packages/design-system/src/theme/flatten.ts`** (moved from runtime's `theme.tsx`):

```ts
import type { ThemeDefinition } from './types.js';

export function flattenTheme(theme: ThemeDefinition): Record<string, string> {
  const vars: Record<string, string> = {};

  for (const [key, value] of Object.entries(theme.colors)) {
    vars[`--oe-color-${key}`] = value;
  }

  for (const [role, token] of Object.entries(theme.typography)) {
    vars[`--oe-font-${role}-family`] = token.fontFamily;
    vars[`--oe-font-${role}-size`] = token.fontSize;
    vars[`--oe-font-${role}-weight`] = String(token.fontWeight);
    vars[`--oe-font-${role}-lineHeight`] = String(token.lineHeight);
    if (token.letterSpacing) {
      vars[`--oe-font-${role}-letterSpacing`] = token.letterSpacing;
    }
  }

  for (const [key, value] of Object.entries(theme.spacing)) {
    if (value !== undefined) {
      vars[`--oe-space-${key}`] = value;
    }
  }

  for (const [key, value] of Object.entries(theme.radii)) {
    vars[`--oe-radius-${key}`] = value;
  }

  vars['--oe-color-bg'] = theme.colors['background'] ?? theme.colors['surface'] ?? '';
  vars['--oe-color-fg'] = theme.colors['on-background'] ?? theme.colors['on-surface'] ?? '';
  vars['--oe-color-border'] = theme.colors['outline'] ?? '';
  vars['--oe-color-success'] = theme.colors['secondary'] ?? '#16a34a';
  vars['--oe-font-sans'] = theme.typography.bodyMd.fontFamily;
  vars['--oe-radius'] = theme.radii.DEFAULT;
  vars['--oe-spacing'] = theme.spacing.md;
  vars['color'] = theme.colors['on-background'] ?? theme.colors['on-surface'] ?? '';

  return vars;
}
```

**Step 2: Create `packages/design-system/src/theme/types.ts`** (moved from runtime):

```ts
export type ThemeId = 'high-focus' | 'lumina-scholastica' | 'nocturnal' | 'sylvan-workspace';

export type ColorTokens = Record<string, string>;

export interface TypographyToken {
  fontFamily: string;
  fontSize: string;
  fontWeight: string | number;
  lineHeight: string | number;
  letterSpacing?: string;
}

export interface TypographyTokens {
  display: TypographyToken;
  headlineLg: TypographyToken;
  headlineMd: TypographyToken;
  title: TypographyToken;
  bodyLg: TypographyToken;
  bodyMd: TypographyToken;
  label: TypographyToken;
  caption: TypographyToken;
  mono: TypographyToken;
}

export interface SpacingTokens {
  base: string;
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  gutter: string;
  marginDesktop: string;
  marginMobile: string;
  containerMax: string;
  panelNav?: string;
  panelExplorer?: string;
}

export interface RadiiTokens {
  sm: string;
  DEFAULT: string;
  md: string;
  lg: string;
  xl: string;
  full: string;
}

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  description?: string;
  colors: ColorTokens;
  typography: TypographyTokens;
  spacing: SpacingTokens;
  radii: RadiiTokens;
  metadata?: {
    author?: string;
    version?: string;
  };
}
```

**Step 3: Update `packages/design-system/src/index.ts`:**

```ts
export * from './tokens/index.js';
export * from './theme/types.js';
export { flattenTheme } from './theme/flatten.js';
```

**Step 4: Update theme definitions** — Replace hardcoded hex values with palette references.

- `packages/runtime` imports `ThemeDefinition` type and `flattenTheme` from `@open-edu/design-system`
- Theme definition files now import `palette` from `@open-edu/design-system/tokens`
- Values stay exactly the same — just source from palette instead of hardcoded

Example change in `lumina-scholastica.ts`:

```ts
// Before:
export const luminaScholastica: ThemeDefinition = {
  colors: {
    surface: '#fdf7ff',
    // ...
  },
};

// After:
import { palette } from '@open-edu/design-system';
export const luminaScholastica: ThemeDefinition = {
  colors: {
    surface: palette.purple99,
    // ...
  },
};
```

**Step 5: Update `packages/runtime/src/theme.tsx`:**

```ts
// Change this import:
import { flattenTheme } from '../design-system/src/theme/flatten.js';
// Or simply re-export from design-system
```

**Alternative approach for runtime:** Keep `theme.tsx` importing from `@open-edu/design-system` instead of local code.

**Acceptance:**

- `pnpm build` passes
- `pnpm test` passes (theme definitions haven't changed values)
- `pnpm typecheck` passes
- All existing tests for theme definitions still pass

---

### DS-007: Wire Tokens into Tailwind Configs

**Context:** Both `apps/learner/tailwind.config.ts` and `apps/dev-server/tailwind.config.js` hardcode 55+ color mappings, font families, spacing, and radii. These should import from `@open-edu/design-system/tokens`.

**Files to modify:**

- `apps/learner/tailwind.config.ts`
- `apps/dev-server/tailwind.config.js`

**For `apps/learner/tailwind.config.ts`:**
The colors, fontFamily, fontSize, spacing, borderRadius sections all map `--oe-*` CSS vars. These are already correct semantically — we just need them to be generated from the token definitions.

Create `packages/design-system/src/tokens/tailwind.ts` that exports pre-built tailwind theme extensions:

```ts
import type { Config } from 'tailwindcss';

// Export theme extensions that can be spread into tailwind config
export const tailwindColorExtensions: Record<string, string> = {
  surface: 'var(--oe-color-surface)',
  'surface-dim': 'var(--oe-color-surface-dim)',
  // ... all 55+ color mappings (copy from existing tailwind config)
};

export const tailwindFontFamilyExtensions: Record<string, string> = {
  display: 'var(--oe-font-display-family)',
  'display-lg': 'var(--oe-font-display-family)',
  'headline-lg': 'var(--oe-font-headlineLg-family)',
  'headline-md': 'var(--oe-font-headlineMd-family)',
  title: 'var(--oe-font-title-family)',
  'body-lg': 'var(--oe-font-bodyLg-family)',
  'body-md': 'var(--oe-font-bodyMd-family)',
  'body-reading': 'var(--oe-font-bodyLg-family)',
  label: 'var(--oe-font-label-family)',
  'label-caps': 'var(--oe-font-label-family)',
  caption: 'var(--oe-font-caption-family)',
  mono: 'var(--oe-font-mono-family)',
};

export const tailwindFontSizeExtensions: Record<string, [string, Record<string, string>]> = {
  'display-lg': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
  h1: ['1.875rem', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '600' }],
  h2: ['1.5rem', { lineHeight: '1.3', fontWeight: '600' }],
  'headline-lg': ['2rem', { lineHeight: '1.25', letterSpacing: '-0.01em', fontWeight: '600' }],
  'body-reading': ['1.125rem', { lineHeight: '1.7', fontWeight: '400' }],
  'body-ui': ['0.875rem', { lineHeight: '1.5', fontWeight: '400' }],
  'label-caps': ['0.75rem', { lineHeight: '1', letterSpacing: '0.05em', fontWeight: '600' }],
  mono: ['0.8125rem', { lineHeight: '1.6', fontWeight: '400' }],
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
};

export const tailwindRadiusExtensions: Record<string, string> = {
  DEFAULT: 'var(--oe-radius-DEFAULT)',
  sm: 'var(--oe-radius-sm)',
  md: 'var(--oe-radius-md)',
  lg: 'var(--oe-radius-lg)',
  xl: 'var(--oe-radius-xl)',
  full: 'var(--oe-radius-full)',
};
```

Then in tailwind configs:

```ts
import { tailwindColorExtensions, tailwindFontFamilyExtensions, ... } from '@open-edu/design-system/tokens/tailwind';

const config: Config = {
  theme: {
    extend: {
      colors: tailwindColorExtensions,
      fontFamily: tailwindFontFamilyExtensions,
      fontSize: tailwindFontSizeExtensions,
      spacing: tailwindSpacingExtensions,
      borderRadius: tailwindRadiusExtensions,
    },
  },
};
```

**Acceptance:**

- Both learner and dev-server tailwind configs import from design-system
- `pnpm build` passes for both apps
- No visual changes (CSS var names stay the same)
- `pnpm --filter @open-edu/learner exec tailwindcss -c tailwind.config.ts -o /dev/null` succeeds

---

## Epic 2: Theme Engine Refinement

| Story  | Description                                                  | Depends On     |
| ------ | ------------------------------------------------------------ | -------------- |
| TH-001 | Add Zen and Forest themes                                    | DS-006         |
| TH-002 | Export flattenTheme from design-system                       | DS-006         |
| TH-003 | ThemeSelector — refactor to use design-system Popover + Card | DS-006, PR-008 |

---

### TH-001: Add Zen and Forest themes

**Context:** The plan calls for 6 themes total. Currently 4 exist. Add Zen (minimalist light) and Forest (nature-inspired light).

**Files to create:**

- `packages/runtime/src/themes/zen.ts`
- `packages/runtime/src/themes/forest.ts`

**Files to modify:**

- `packages/runtime/src/themes/index.ts` — register new themes
- `packages/runtime/src/themes/types.ts` — add `'zen' | 'forest'` to ThemeId (or if moved to design-system, update there)

**`packages/runtime/src/themes/zen.ts`:**

```ts
import type { ThemeDefinition } from '@open-edu/design-system';

export const zen: ThemeDefinition = {
  id: 'zen',
  name: 'Zen',
  description: 'Minimalist light theme with reduced visual noise.',
  colors: {
    surface: '#fafaf9',
    'surface-dim': '#e5e5e4',
    'surface-bright': '#ffffff',
    'surface-container-lowest': '#ffffff',
    'surface-container-low': '#f5f5f4',
    'surface-container': '#efefee',
    'surface-container-high': '#e5e5e4',
    'surface-container-highest': '#d9d9d8',
    'on-surface': '#1c1917',
    'on-surface-variant': '#444240',
    'inverse-surface': '#292524',
    'inverse-on-surface': '#fafaf9',
    outline: '#72706e',
    'outline-variant': '#c4c2c0',
    'surface-tint': '#57534e',
    primary: '#57534e',
    'on-primary': '#ffffff',
    'primary-container': '#dbd7d2',
    'on-primary-container': '#1c1917',
    'inverse-primary': '#b7b3ae',
    secondary: '#6e6a66',
    'on-secondary': '#ffffff',
    'secondary-container': '#f1ede8',
    'on-secondary-container': '#24211e',
    tertiary: '#6b6b6b',
    'on-tertiary': '#ffffff',
    'tertiary-container': '#d6d6d6',
    'on-tertiary-container': '#242424',
    error: '#dc2626',
    'on-error': '#ffffff',
    'error-container': '#fee2e2',
    'on-error-container': '#7f1d1d',
    'primary-fixed': '#f0ece7',
    'primary-fixed-dim': '#dbd7d2',
    'on-primary-fixed': '#1c1917',
    'on-primary-fixed-variant': '#3e3b38',
    'secondary-fixed': '#f1ede8',
    'secondary-fixed-dim': '#d5d1cc',
    'on-secondary-fixed': '#1c1917',
    'on-secondary-fixed-variant': '#24211e',
    'tertiary-fixed': '#e3e3e3',
    'tertiary-fixed-dim': '#c7c7c7',
    'on-tertiary-fixed': '#1c1c1c',
    'on-tertiary-fixed-variant': '#242424',
    background: '#fafaf9',
    'on-background': '#1c1917',
    'surface-variant': '#e5e5e4',
  },
  typography: {
    display: {
      fontFamily: 'Inter',
      fontSize: '44px',
      fontWeight: '300',
      lineHeight: '1.1',
      letterSpacing: '-0.02em',
    },
    headlineLg: {
      fontFamily: 'Inter',
      fontSize: '28px',
      fontWeight: '400',
      lineHeight: '1.3',
      letterSpacing: '-0.01em',
    },
    headlineMd: { fontFamily: 'Inter', fontSize: '22px', fontWeight: '400', lineHeight: '1.3' },
    title: { fontFamily: 'Inter', fontSize: '20px', fontWeight: '500', lineHeight: '1.3' },
    bodyLg: { fontFamily: 'Inter', fontSize: '17px', fontWeight: '300', lineHeight: '1.7' },
    bodyMd: { fontFamily: 'Inter', fontSize: '14px', fontWeight: '400', lineHeight: '1.5' },
    label: {
      fontFamily: 'Inter',
      fontSize: '11px',
      fontWeight: '500',
      lineHeight: '1.0',
      letterSpacing: '0.04em',
    },
    caption: { fontFamily: 'Inter', fontSize: '13px', fontWeight: '300', lineHeight: '1.5' },
    mono: { fontFamily: 'JetBrains Mono', fontSize: '13px', fontWeight: '400', lineHeight: '1.6' },
  },
  spacing: {
    base: '8px',
    xs: '4px',
    sm: '12px',
    md: '24px',
    lg: '40px',
    xl: '64px',
    gutter: '24px',
    marginDesktop: '48px',
    marginMobile: '16px',
    containerMax: '720px',
    panelNav: '240px',
    panelExplorer: '300px',
  },
  radii: { sm: '0', DEFAULT: '0', md: '0', lg: '0', xl: '0', full: '9999px' },
};
```

**`packages/runtime/src/themes/forest.ts`:**

```ts
import type { ThemeDefinition } from '@open-edu/design-system';

export const forest: ThemeDefinition = {
  id: 'forest',
  name: 'Forest',
  description: 'Warm nature-inspired theme with earthy greens and browns.',
  colors: {
    surface: '#f6f7f3',
    'surface-dim': '#d9dbd4',
    'surface-bright': '#f6f7f3',
    'surface-container-lowest': '#ffffff',
    'surface-container-low': '#f0f1ec',
    'surface-container': '#eaece5',
    'surface-container-high': '#e4e6df',
    'surface-container-highest': '#daddd5',
    'on-surface': '#1a1c1a',
    'on-surface-variant': '#444a42',
    'inverse-surface': '#2e312c',
    'inverse-on-surface': '#f0f1ec',
    outline: '#747a70',
    'outline-variant': '#c3c9bd',
    'surface-tint': '#50634f',
    primary: '#2d4a2c',
    'on-primary': '#ffffff',
    'primary-container': '#50634f',
    'on-primary-container': '#d4e8cf',
    'inverse-primary': '#b8ccb3',
    secondary: '#536253',
    'on-secondary': '#ffffff',
    'secondary-container': '#d6e5d4',
    'on-secondary-container': '#222d21',
    tertiary: '#6b5b4a',
    'on-tertiary': '#ffffff',
    'tertiary-container': '#d6c5b3',
    'on-tertiary-container': '#3a2e21',
    error: '#8b3a3a',
    'on-error': '#ffffff',
    'error-container': '#f4d4d4',
    'on-error-container': '#5c2020',
    'primary-fixed': '#d4e8cf',
    'primary-fixed-dim': '#b8ccb3',
    'on-primary-fixed': '#142013',
    'on-primary-fixed-variant': '#2d4a2c',
    'secondary-fixed': '#d6e5d4',
    'secondary-fixed-dim': '#bac9b8',
    'on-secondary-fixed': '#111b11',
    'on-secondary-fixed-variant': '#3a4a39',
    'tertiary-fixed': '#e8d8c8',
    'tertiary-fixed-dim': '#d6c5b3',
    'on-tertiary-fixed': '#2a1f14',
    'on-tertiary-fixed-variant': '#4d3e2f',
    background: '#f6f7f3',
    'on-background': '#1a1c1a',
    'surface-variant': '#daddd5',
  },
  typography: {
    display: {
      fontFamily: 'Source Serif 4',
      fontSize: '44px',
      fontWeight: '700',
      lineHeight: '1.15',
      letterSpacing: '-0.01em',
    },
    headlineLg: {
      fontFamily: 'Source Serif 4',
      fontSize: '28px',
      fontWeight: '600',
      lineHeight: '1.3',
    },
    headlineMd: {
      fontFamily: 'Source Serif 4',
      fontSize: '24px',
      fontWeight: '600',
      lineHeight: '1.3',
    },
    title: { fontFamily: 'Hanken Grotesk', fontSize: '22px', fontWeight: '600', lineHeight: '1.3' },
    bodyLg: {
      fontFamily: 'Source Serif 4',
      fontSize: '18px',
      fontWeight: '400',
      lineHeight: '1.7',
    },
    bodyMd: {
      fontFamily: 'Hanken Grotesk',
      fontSize: '14px',
      fontWeight: '400',
      lineHeight: '1.5',
    },
    label: {
      fontFamily: 'Hanken Grotesk',
      fontSize: '12px',
      fontWeight: '600',
      lineHeight: '1.0',
      letterSpacing: '0.04em',
    },
    caption: {
      fontFamily: 'Hanken Grotesk',
      fontSize: '14px',
      fontWeight: '400',
      lineHeight: '1.5',
    },
    mono: { fontFamily: 'JetBrains Mono', fontSize: '13px', fontWeight: '400', lineHeight: '1.6' },
  },
  spacing: {
    base: '8px',
    xs: '4px',
    sm: '12px',
    md: '24px',
    lg: '40px',
    xl: '64px',
    gutter: '24px',
    marginDesktop: '56px',
    marginMobile: '16px',
    containerMax: '800px',
    panelNav: '260px',
    panelExplorer: '320px',
  },
  radii: {
    sm: '0.25rem',
    DEFAULT: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.5rem',
    full: '9999px',
  },
};
```

**Update `packages/runtime/src/themes/index.ts`:**

```ts
import { luminaScholastica } from './lumina-scholastica.js';
import { highFocus } from './high-focus.js';
import { nocturnal } from './nocturnal.js';
import { sylvanWorkspace } from './sylvan-workspace.js';
import { zen } from './zen.js';
import { forest } from './forest.js';
import type { ThemeId, ThemeDefinition } from '@open-edu/design-system';

export type { ThemeId, ThemeDefinition };

const themeMap: Record<ThemeId, ThemeDefinition> = {
  'lumina-scholastica': luminaScholastica,
  'high-focus': highFocus,
  nocturnal: nocturnal,
  'sylvan-workspace': sylvanWorkspace,
  zen: zen,
  forest: forest,
};

export const themeIds: ThemeId[] = Object.keys(themeMap) as ThemeId[];
export const defaultThemeId: ThemeId = 'lumina-scholastica';
export const DEFAULT_THEME = themeMap[defaultThemeId];

export function getTheme(id: ThemeId): ThemeDefinition {
  return themeMap[id] ?? DEFAULT_THEME;
}

export const themeRegistry = themeMap;
```

**Update `packages/design-system/src/theme/types.ts` ThemeId:**

```ts
export type ThemeId =
  | 'high-focus'
  | 'lumina-scholastica'
  | 'nocturnal'
  | 'sylvan-workspace'
  | 'zen'
  | 'forest';
```

**Update `packages/runtime/src/themes/types.ts`** — re-export from design-system to maintain backward compat:

```ts
export type {
  ThemeId,
  ThemeDefinition,
  ColorTokens,
  TypographyToken,
  TypographyTokens,
  SpacingTokens,
  RadiiTokens,
} from '@open-edu/design-system';
```

**Tests at `packages/runtime/src/themes/__tests__/theme-definitions.test.ts`:** Update existing tests to cover 6 themes. Each theme must:

- Have all required color keys
- Have all 9 typography roles
- Have all spacing keys
- Have all radii keys

**Acceptance:**

- `pnpm test` passes
- `pnpm typecheck` passes
- ThemeSelector shows 6 themes (visually verify on learner or dev-server)
- All themes render without console errors

---

### TH-002: Export flattenTheme from design-system

**Context:** `flattenTheme` currently lives in `packages/runtime/src/theme.tsx`. It should be exported from `@open-edu/design-system` so all packages can use it.

**File to create:** `packages/design-system/src/theme/flatten.ts` (detailed in DS-006)
**Files to modify:**

- `packages/design-system/src/index.ts` — add export
- `packages/runtime/src/theme.tsx` — import from design-system

**`packages/runtime/src/theme.tsx` update:**

```ts
import { flattenTheme } from '@open-edu/design-system';
// Remove the local flattenTheme function
```

**Acceptance:**

- `pnpm build` passes
- `pnpm test` passes
- Runtime theme provider works identically

---

### TH-003: ThemeSelector Refactor

**Context:** `packages/runtime/src/components/ThemeSelector.tsx` uses 100% inline styles. It should use design-system primitives (Popover, Card, etc.) once those exist in Phase 6.

**Deferred to after PR-008 (Popover primitive). See Phase 6.**

---

## Epic 3: Primitive Components

| Story  | Description                                           | Depends On    |
| ------ | ----------------------------------------------------- | ------------- |
| PR-001 | Move Button to design-system                          | DS-001        |
| PR-002 | Move Card to design-system                            | DS-001        |
| PR-003 | Move Badge to design-system                           | DS-001        |
| PR-004 | Move Input to design-system                           | DS-001        |
| PR-005 | Move Dialog to design-system                          | DS-001        |
| PR-006 | Move Select to design-system                          | DS-001        |
| PR-007 | Move Progress, Tabs, Switch, Tooltip to design-system | DS-001        |
| PR-008 | Build Textarea, RadioGroup, Accordion, Popover        | PR-001        |
| PR-009 | Build DropdownMenu, Drawer, Breadcrumb, Tag           | PR-001        |
| PR-010 | Build Skeleton, Spinner, EmptyState, Notification     | PR-001        |
| PR-011 | Deprecate ThemedButton                                | PR-001        |
| PR-012 | Update learner imports to use design-system           | PR-001–PR-010 |

---

### PR-001: Move Button to design-system

**Source file:** `apps/learner/src/components/ui/button.tsx`
**Target:** `packages/design-system/src/primitives/button.tsx`

**Implementation:**

Create `packages/design-system/src/primitives/button.tsx`:

```tsx
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium text-foreground ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={buttonVariants({ variant, size, className })} ref={ref} {...props} />;
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
```

**Update `packages/design-system/src/index.ts`:**

```ts
export { Button, buttonVariants } from './primitives/button.js';
export type { ButtonProps } from './primitives/button.js';
```

**Create test at `packages/design-system/src/primitives/__tests__/button.test.tsx`:**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '../button.jsx';

describe('Button', () => {
  it('renders with default variant', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('renders with variant classes', () => {
    render(<Button variant="destructive">Delete</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-destructive');
  });

  it('renders with size classes', () => {
    render(<Button size="sm">Small</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('h-9');
  });

  it('forwards ref', () => {
    const ref = { current: null };
    render(<Button ref={ref}>Ref</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('sets displayName', () => {
    expect(Button.displayName).toBe('Button');
  });
});
```

**Backward compat:** Update `apps/learner/src/components/ui/button.tsx` to re-export:

```ts
export { Button, buttonVariants } from '@open-edu/design-system';
export type { ButtonProps } from '@open-edu/design-system';
```

**Update all imports** across the monorepo that directly import from `@/components/ui/button` — update to `@open-edu/design-system`. Use `grep` to find all files importing Button.

**Files to update:** Check `apps/learner/src/` for all `from '@/components/ui/button'` imports.

**Tests:** Ensure `pnpm test` passes. Update any test that mocks/imports Button directly.

**Acceptance:**

- Button works identically in learner app
- `pnpm build` passes
- `pnpm test` passes
- No imports broken

---

### PR-002: Move Card to design-system

**Source:** `apps/learner/src/components/ui/card.tsx`
**Target:** `packages/design-system/src/primitives/card.tsx`

Same pattern as PR-001. Copy the 6 subcomponents (Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter). Add Radix Slot where appropriate. Add tests.

**Test:** Validate all 6 subcomponents render and forward refs.

---

### PR-003: Move Badge to design-system

**Source:** `apps/learner/src/components/ui/badge.tsx`
**Target:** `packages/design-system/src/primitives/badge.tsx`

Same pattern. cva variants: default, secondary, destructive, outline.

---

### PR-004: Move Input to design-system

**Source:** `apps/learner/src/components/ui/input.tsx`
**Target:** `packages/design-system/src/primitives/input.tsx`

---

### PR-005: Move Dialog to design-system

**Source:** `apps/learner/src/components/ui/dialog.tsx`
**Target:** `packages/design-system/src/primitives/dialog.tsx`

This uses `@radix-ui/react-dialog`. Add as dependency to `packages/design-system/package.json`.

---

### PR-006: Move Select to design-system

**Source:** `apps/learner/src/components/ui/select.tsx`
**Target:** `packages/design-system/src/primitives/select.tsx`

Uses `@radix-ui/react-select`. Add as dependency.

---

### PR-007: Move Progress, Tabs, Switch, Tooltip to design-system

**Source path:** `apps/learner/src/components/ui/{progress,tabs,switch,tooltip}.tsx`
**Target path:** `packages/design-system/src/primitives/{progress,tabs,switch,tooltip}.tsx`

Each uses a Radix primitive. Add deps:

- `@radix-ui/react-progress`
- `@radix-ui/react-tabs`
- `@radix-ui/react-switch`
- `@radix-ui/react-tooltip`

Merge **Progress** (learner/ui) with **ProgressBar** (runtime/layout). Create a single `Progress` in design-system that supports both use cases:

```tsx
export interface ProgressProps {
  value: number;
  max: number;
  showLabel?: boolean;
  label?: string;
  size?: 'sm' | 'md';
}
```

---

### PR-008: Build Textarea, RadioGroup, Accordion, Popover

**Context:** These are the 4 highest-priority missing primitives. Follow the shadcn pattern used by existing components.

**`packages/design-system/src/primitives/textarea.tsx`:**

```tsx
import * as React from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = 'Textarea';

export { Textarea };
```

**`packages/design-system/src/primitives/radio-group.tsx`:**
Uses `@radix-ui/react-radio-group`. Follow shadcn pattern.

```tsx
import * as React from 'react';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { Circle } from 'lucide-react';

const RadioGroup = React.forwardRef<...>(...);
RadioGroup.displayName = 'RadioGroup';
const RadioGroupItem = React.forwardRef<...>(...);
RadioGroupItem.displayName = 'RadioGroupItem';

export { RadioGroup, RadioGroupItem };
```

**`packages/design-system/src/primitives/accordion.tsx`:**
Uses `@radix-ui/react-accordion`. Follow shadcn pattern with `ChevronDown` icon.

**`packages/design-system/src/primitives/popover.tsx`:**
Uses `@radix-ui/react-popover`. Follow shadcn pattern.

**For all:** Add deps to `packages/design-system/package.json`, add tests, add to `src/index.ts`.

---

### PR-009: Build DropdownMenu, Drawer, Breadcrumb, Tag

**`packages/design-system/src/primitives/dropdown-menu.tsx`:**
Uses `@radix-ui/react-dropdown-menu`. Follow shadcn pattern.

**`packages/design-system/src/primitives/drawer.tsx`:**
Uses `vaul` for drawer. Follow shadcn pattern.

**`packages/design-system/src/primitives/breadcrumb.tsx`:**

```tsx
import * as React from 'react';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

const Breadcrumb = React.forwardRef<HTMLElement, BreadcrumbProps>(({ items, className }, ref) => (
  <nav ref={ref} aria-label="Breadcrumb" className={className}>
    <ol className="flex items-center gap-1">
      {items.map((item, idx) => (
        <li key={idx} className="flex items-center gap-1 text-sm text-muted-foreground">
          {idx > 0 && <ChevronRight className="h-4 w-4" />}
          {item.href ? (
            <a href={item.href} className="text-primary hover:underline">
              {item.label}
            </a>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
        </li>
      ))}
    </ol>
  </nav>
));
Breadcrumb.displayName = 'Breadcrumb';

export { Breadcrumb };
```

**`packages/design-system/src/primitives/tag.tsx`:**

```tsx
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';

const tagVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        default: 'bg-primary/10 text-primary',
        secondary: 'bg-secondary/10 text-secondary-foreground',
        success: 'bg-success/10 text-success-foreground',
        warning: 'bg-warning/10 text-warning-foreground',
        danger: 'bg-destructive/10 text-destructive-foreground',
        outline: 'border border-border text-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface TagProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof tagVariants> {
  onRemove?: () => void;
}

const Tag = React.forwardRef<HTMLSpanElement, TagProps>(
  ({ className, variant, children, onRemove, ...props }, ref) => (
    <span ref={ref} className={tagVariants({ variant, className })} {...props}>
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 rounded-full hover:bg-foreground/10 p-0.5"
          aria-label="Remove"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  ),
);
Tag.displayName = 'Tag';

export { Tag, tagVariants };
```

---

### PR-010: Build Skeleton, Spinner, EmptyState, Notification

**Skeleton:** `@radix-ui/react-slot` for asChild support.

```tsx
const Skeleton = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={`animate-pulse rounded-md bg-muted ${className ?? ''}`} {...props} />
  ),
);
```

**Spinner:** Simple SVG spinner.

```tsx
const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ size = 'md', className }, ref) => (
    <div
      ref={ref}
      className={`animate-spin text-muted-foreground ${sizeClasses[size]} ${className ?? ''}`}
    >
      <svg viewBox="0 0 24 24" fill="none">
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
          className="opacity-25"
        />
        <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      </svg>
    </div>
  ),
);
```

**EmptyState:**

```tsx
export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}
```

**Notification:** Use `sonner` library for toast notifications.

---

### PR-011: Deprecate ThemedButton

**Context:** `packages/widgets/src/themed-button.tsx` duplicates Button.

**Action:**

1. Update `packages/widgets/src/themed-button.tsx` to re-export from design-system:

```ts
export { Button as ThemedButton } from '@open-edu/design-system';
```

2. Add deprecation comment: `@deprecated Use Button from @open-edu/design-system instead`
3. Update all imports in widget builtins that use ThemedButton
4. Keep file in place (don't delete) until all consumers migrate

---

### PR-012: Update Learner Imports

**Context:** After all primitives move to design-system, `apps/learner/src/components/ui/` should only re-export. Update all `apps/learner/src/` files that import from `@/components/ui/*` to import from `@open-edu/design-system` directly.

**Files to update:** Use `rg "from '@/components/ui/"` to find all imports.

**Acceptance:**

- No files import from `@/components/ui/` directly (except re-export files)
- `pnpm test` passes
- `pnpm dev` works in learner app
- No dead code

---

## Epic 4: Navigation Components

| Story  | Description                                           | Depends On     |
| ------ | ----------------------------------------------------- | -------------- |
| NV-001 | Move SideNav, TopAppBar, CourseTree to design-system  | PR-001, PR-009 |
| NV-002 | Build AppLayout, ThreePanelLayout, CourseViewerLayout | NV-001         |
| NV-003 | Build SettingsLayout, DashboardLayout, SplitView      | NV-001         |
| NV-004 | Build Command Palette + Search                        | PR-001, PR-009 |

---

### NV-001: Move Navigation to design-system

**Files to move:**

- `packages/runtime/src/layout/SideNav.tsx` → `packages/design-system/src/patterns/SideNav.tsx`
- `packages/runtime/src/layout/TopAppBar.tsx` → `packages/design-system/src/patterns/TopAppBar.tsx`
- `packages/runtime/src/layout/CourseTree.tsx` → `packages/design-system/src/patterns/CourseTree.tsx`

**For each component:**

1. Convert inline styles to Tailwind utility classes (Pattern A)
2. Use primitives from design-system (Button, Breadcrumb, etc.)
3. Add proper test files
4. Runtime re-exports from design-system

**SideNav conversion example:**

```tsx
// Before: 100% inline CSSProperties objects
// After: Tailwind classes
export function SideNav({ courseTitle, children, onResumeLesson }: SideNavProps): JSX.Element {
  return (
    <aside
      className="w-[var(--oe-space-panel-nav)] h-screen flex flex-col bg-surface-container border-r border-outline-variant font-body-md overflow-hidden"
      data-testid="side-nav"
      aria-label="Course navigation"
    >
      <div className="px-4 pb-3 pt-5 border-b border-outline-variant">
        <h1 className="text-lg font-bold m-0 text-fg">OpenEdu</h1>
        <p className="text-xs text-on-surface-variant m-0 mt-0.5">Interactive learning platform</p>
      </div>
      ...
    </aside>
  );
}
```

**Acceptance:**

- Nav components render identically (compare before/after screenshots)
- All a11y attributes preserved (aria-current, aria-label, aria-expanded)
- Tests in design-system pass

---

### NV-002: Build AppLayout, ThreePanelLayout, CourseViewerLayout

**`packages/design-system/src/patterns/AppLayout.tsx`:**

```tsx
export interface AppLayoutProps {
  topBar?: ReactNode;
  sidebar?: ReactNode;
  children: ReactNode;
}

export function AppLayout({ topBar, sidebar, children }: AppLayoutProps): JSX.Element {
  return (
    <div className="flex flex-col h-screen">
      {topBar && <div className="flex-shrink-0">{topBar}</div>}
      <div className="flex flex-1 overflow-hidden">
        {sidebar && <div className="flex-shrink-0">{sidebar}</div>}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
```

**`packages/design-system/src/patterns/ThreePanelLayout.tsx`:**

```tsx
export interface ThreePanelLayoutProps {
  leftNav?: ReactNode;
  content: ReactNode;
  rightPanel?: ReactNode;
}

export function ThreePanelLayout({
  leftNav,
  content,
  rightPanel,
}: ThreePanelLayoutProps): JSX.Element {
  return (
    <div className="flex h-full">
      {leftNav && <div className="flex-shrink-0">{leftNav}</div>}
      <div className="flex-1 min-w-0">{content}</div>
      {rightPanel && <div className="flex-shrink-0">{rightPanel}</div>}
    </div>
  );
}
```

**`packages/design-system/src/patterns/CourseViewerLayout.tsx`:**
Wraps ThreePanelLayout with SideNav (left), content (center), AITutorPanel (right).

---

### NV-003: Build SettingsLayout, DashboardLayout, SplitView

Standard layout patterns. Each wraps content in a consistent shell.

---

### NV-004: Build Command Palette + Search

**Command Palette:** Use `cmdk` (`@radix-ui/react-command`).

```tsx
import { Command } from 'cmdk';

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps): JSX.Element {
  return (
    <Command.Dialog open={open} onOpenChange={onOpenChange} label="Global command palette">
      <Command.Input placeholder="Search commands..." />
      <Command.List>
        <Command.Empty>No results found.</Command.Empty>
        <Command.Group heading="Navigation">
          <Command.Item>Home</Command.Item>
          <Command.Item>Catalog</Command.Item>
          <Command.Item>Settings</Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
```

---

## Epic 5: Educational Components

| Story  | Description                                                      | Depends On |
| ------ | ---------------------------------------------------------------- | ---------- |
| ED-001 | Move BundleOverview to design-system                             | PR-001     |
| ED-002 | Move CompletionScreen, CourseCard to design-system               | PR-001     |
| ED-003 | Move CourseOutline, ProgressBadge, SkillSummary to design-system | PR-001     |
| ED-004 | Build Lesson, Module, ConceptCard, DefinitionBlock               | ED-001     |

---

### ED-001: Move BundleOverview to design-system

**Source:** `packages/runtime/src/components/BundleOverview.tsx`
**Target:** `packages/design-system/src/learning/BundleOverview.tsx`

This component already uses Tailwind pattern B. Convert to pattern A (shadcn-style) — use `cn()`, use design-system primitives (Badge, Button, Progress).

**Props remain the same** — they're OpenEdu-specific types.

**Test:** Copy existing test from runtime.

---

### ED-002: Move CompletionScreen, CourseCard

**CompletionScreen:** Convert hardcoded confetti colors to tokens. Add `prefers-reduced-motion` check. Replace emoji with themed icons.

**CourseCard:** Already uses Tailwind. Move to design-system, use Card, Badge, Progress primitives.

---

### ED-003: Move CourseOutline, ProgressBadge, SkillSummary

Simple components — moved directly with styling pattern upgrade.

---

### ED-004: Build new educational components

**Lesson:** Content wrapper around MarkdownRenderer.
**Module:** Module card with lesson list + progress.
**ConceptCard:** Highlight card for key concepts.
**DefinitionBlock:** Term + definition display.

---

## Epic 6: AI Components

| Story  | Description                                       | Depends On     |
| ------ | ------------------------------------------------- | -------------- |
| AI-001 | Move AICallout to design-system                   | PR-001         |
| AI-002 | Move AITutorPanel to design-system                | PR-001, PR-008 |
| AI-003 | Build AIChat, TutorMessage, ThinkingIndicator     | AI-002         |
| AI-004 | Build Citation, ReferenceCard, SuggestedQuestions | AI-002         |

---

### AI-001: Move AICallout

**Source:** `packages/runtime/src/components/AICallout.tsx`
**Target:** `packages/design-system/src/ai/AICallout.tsx`

Convert inline styles to Tailwind. Use design-system Card/Badge.

---

### AI-002: Move AITutorPanel

**Source:** `packages/runtime/src/layout/AITutorPanel.tsx`
**Target:** `packages/design-system/src/ai/AITutorPanel.tsx`

Convert inline styles to Tailwind. Use design-system primitives (Button, Tabs, Textarea).

---

### AI-003: Build AIChat, TutorMessage, ThinkingIndicator

**AIChat:** Full chat interface with message list, input, and suggestions.
**TutorMessage:** Message bubble with bot avatar.
**ThinkingIndicator:** Animated dots.

---

### AI-004: Build Citation, ReferenceCard, SuggestedQuestions

Small AI-specific components.

---

## Epic 7: Accessibility Pass

| Story  | Description                          | Depends On |
| ------ | ------------------------------------ | ---------- |
| AC-001 | Add axe-core tests to all components | All above  |
| AC-002 | Fix identified a11y gaps             | AC-001     |
| AC-003 | Add prefers-reduced-motion support   | AC-002     |
| AC-004 | Fix ThemeSelector accessibility      | PR-008     |

---

### AC-001: Add axe-core tests

Create a shared test utility `packages/design-system/src/test-utils/a11y.tsx`:

```tsx
import { render } from '@testing-library/react';
import axe from 'axe-core';

export async function checkAccessibility(ui: React.ReactElement): Promise<void> {
  const { container } = render(ui);
  const results = await axe.run(container);
  expect(results.violations).toHaveLength(0);
}
```

Add to every primitive's test file:

```tsx
it('has no accessibility violations', async () => {
  await checkAccessibility(<Button>Test</Button>);
});
```

---

### AC-002: Fix a11y gaps

Apply fixes for all 9 gaps identified in audit:

1. Color contrast audit — verify all theme colors against WCAG 2.1 AA
2. Reduced motion — add `@media (prefers-reduced-motion: no-preference)` wrappers
3. Keyboard tests — verify each component's keyboard navigation
4. ThemeSelector — full a11y rewrite using Radix Popover + proper ARIA
5. TopAppBar panel — use Radix Dialog or proper focus management
6. Axe-core integration — add to CI
7. Screen reader docs — add to component docs
8. High contrast — test and fix
9. Confetti — respect `prefers-reduced-motion`

---

### AC-003: prefers-reduced-motion

Add to `packages/design-system/src/tokens/motion.ts` helper:

```tsx
export const motionSafe = (animations: string) => `
  @media (prefers-reduced-motion: no-preference) {
    ${animations}
  }
`;
```

Update CompletionScreen confetti, all transition/animation classes.

---

## Epic 8: Documentation

| Story  | Description                         | Depends On    |
| ------ | ----------------------------------- | ------------- |
| DC-001 | Document all primitives             | Epic 3        |
| DC-002 | Document all patterns               | Epic 4        |
| DC-003 | Document all learning components    | Epic 5        |
| DC-004 | Document all AI components          | Epic 6        |
| DC-005 | Integrate docs into Docusaurus site | DC-001–DC-004 |

---

### DC-001: Document all primitives

For each primitive in `packages/design-system/src/primitives/`, create a `.md` file in `apps/docs/docs/components/primitives/`.

Template:

````markdown
# ComponentName

**Purpose:** One-sentence description.

## Import

```tsx
import { ComponentName } from '@open-edu/design-system';
```
````

## Props

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| ...  | ...  | ...     | ...         |

## Variants

- **default:** ...
- **secondary:** ...

## Accessibility

- **Keyboard:** Tab, Enter, Escape
- **ARIA:** role, aria-label
- **Screen reader:** ...

## Examples

```tsx
<ComponentName ... />
```

## Do / Don't

- ✅ ...
- ❌ ...

```

---

### DC-005: Integrate into Docusaurus

Update `apps/docs/sidebars.ts` to add a "Design System" section with sub-sections for primitives, patterns, learning, and AI components.

---

## Verification Checklist (Every Story)

Before marking a story done:

- [ ] `pnpm build` passes (no errors)
- [ ] `pnpm test` passes (all tests, including new ones)
- [ ] `pnpm lint` passes (no warnings on new code)
- [ ] `pnpm typecheck` passes (TypeScript strict)
- [ ] `pnpm format:check` passes (prettier)
- [ ] New components have Vitest tests
- [ ] New components have proper `displayName`
- [ ] New components use Tailwind via `cn()` utility
- [ ] New components use design-system tokens (no hardcoded values)
- [ ] New components forward refs
- [ ] Accessibility: basic keyboard nav works
- [ ] No dead code, debug logs, or temporary edits
```
