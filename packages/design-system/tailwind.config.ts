import type { Config } from 'tailwindcss';
import {
  tailwindColorExtensions,
  tailwindFontFamilyExtensions,
  tailwindFontSizeExtensions,
  tailwindSpacingExtensions,
  tailwindRadiusExtensions,
  tailwindTransitionDurationExtensions,
  tailwindTransitionTimingExtensions,
} from './src/tokens/tailwind';

const config: Config = {
  content: [
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: tailwindColorExtensions,
      fontFamily: tailwindFontFamilyExtensions,
      fontSize: tailwindFontSizeExtensions,
      spacing: { ...tailwindSpacingExtensions, paragraph: 'var(--oe-paragraph-spacing)' },
      borderRadius: tailwindRadiusExtensions,
      transitionDuration: tailwindTransitionDurationExtensions,
      transitionTimingFunction: tailwindTransitionTimingExtensions,
      maxWidth: {
        reading: 'var(--oe-reading-width)',
      },
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
