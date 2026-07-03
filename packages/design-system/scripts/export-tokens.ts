import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { palette } from '../src/tokens/colors';
import { defaultTypography } from '../src/tokens/typography';
import { spacingScale } from '../src/tokens/spacing';
import { radiusScale } from '../src/tokens/radius';
import { elevationScale } from '../src/tokens/elevation';
import { motionTokens } from '../src/tokens/motion';
import { sizingScale } from '../src/tokens/sizing';
import { opacityScale } from '../src/tokens/opacity';
import { borderWidthScale } from '../src/tokens/borders';
import { focusTokens } from '../src/tokens/focus';
import { iconSizeScale } from '../src/tokens/icons';
import { layoutTokens } from '../src/tokens/layout';

const figmaTokens = {
  color: palette,
  typography: defaultTypography,
  spacing: spacingScale,
  radius: radiusScale,
  elevation: elevationScale,
  motion: motionTokens,
  sizing: sizingScale,
  opacity: opacityScale,
  borderWidth: borderWidthScale,
  focus: focusTokens,
  icons: iconSizeScale,
  layout: layoutTokens,
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const outputPath = resolve(__dirname, '../dist/tokens.json');
writeFileSync(outputPath, JSON.stringify(figmaTokens, null, 2));
console.log(`Tokens exported to ${outputPath}`);
