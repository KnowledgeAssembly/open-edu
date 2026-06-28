import {
  tailwindColorExtensions,
  tailwindFontFamilyExtensions,
  tailwindFontSizeExtensions,
  tailwindSpacingExtensions,
  tailwindRadiusExtensions,
} from '@open-edu/design-system/tokens';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}', '../../packages/runtime/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: tailwindColorExtensions,
      fontFamily: tailwindFontFamilyExtensions,
      fontSize: tailwindFontSizeExtensions,
      spacing: tailwindSpacingExtensions,
      borderRadius: tailwindRadiusExtensions,
    },
  },
  plugins: [],
};
