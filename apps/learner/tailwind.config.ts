import type { Config } from 'tailwindcss';
import {
  tailwindColorExtensions,
  tailwindFontFamilyExtensions,
  tailwindFontSizeExtensions,
  tailwindSpacingExtensions,
  tailwindRadiusExtensions,
} from '@open-edu/design-system/tokens';

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    '../../packages/runtime/src/**/*.{ts,tsx}',
    '../../packages/design-system/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: tailwindColorExtensions,
      fontFamily: tailwindFontFamilyExtensions,
      fontSize: tailwindFontSizeExtensions,
      spacing: tailwindSpacingExtensions,
      borderRadius: tailwindRadiusExtensions,
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
