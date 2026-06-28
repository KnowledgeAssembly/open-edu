import type { Config } from 'tailwindcss';
import {
  tailwindColorExtensions,
  tailwindFontFamilyExtensions,
  tailwindFontSizeExtensions,
  tailwindSpacingExtensions,
  tailwindRadiusExtensions,
} from '@open-edu/design-system/tokens';

const config: Config = {
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
  plugins: [require('tailwindcss-animate')],
};

export default config;
