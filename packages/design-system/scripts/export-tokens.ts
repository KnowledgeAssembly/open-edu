import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { argv } from 'process';
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function isTypographyComposite(v: unknown): v is Record<string, string> {
  return typeof v === 'object' && v !== null && 'fontFamily' in v && 'fontSize' in v;
}

function isShadowObject(v: unknown): v is { boxShadow: string } {
  return (
    typeof v === 'object' &&
    v !== null &&
    !Array.isArray(v) &&
    'boxShadow' in v &&
    Object.keys(v).length === 1
  );
}

function isPlainGroup(v: unknown): boolean {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function toPenpotTokens(
  category: string,
  tokens: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(tokens)) {
    if (isShadowObject(value)) {
      result[key] = { $type: 'shadow', $value: value.boxShadow };
    } else if (isTypographyComposite(value)) {
      const composite: Record<string, string> = {};
      for (const [k, v] of Object.entries(value)) {
        composite[k] = String(v);
      }
      result[key] = { $type: 'typography', $value: composite };
    } else if (isPlainGroup(value)) {
      result[key] = toPenpotTokens(category, value as Record<string, unknown>);
    } else {
      const type = inferW3CType(category, key, String(value));
      result[key] = { $type: type, $value: String(value) };
    }
  }
  return result;
}

type CategoryTypeRule = string | { default: string; overrides?: Record<string, string> };

function inferW3CType(category: string, key: string, value: string): string {
  const categoryTypes: Record<string, CategoryTypeRule> = {
    color: 'color',
    spacing: 'dimension',
    radius: 'dimension',
    sizing: 'dimension',
    borderWidth: 'dimension',
    icons: 'dimension',
    layout: 'dimension',
    opacity: 'number',
    elevation: 'shadow',
    motion: {
      default: 'duration',
      overrides: {
        easingEaseInOut: 'cubicBezier',
        easingEaseOut: 'cubicBezier',
        easingEaseIn: 'cubicBezier',
      },
    },
    focus: {
      default: 'dimension',
      overrides: {
        'ring-color': 'color',
        'ring-style': 'strokeStyle',
      },
    },
  };

  const catRule = categoryTypes[category];
  if (!catRule) return 'custom';
  if (typeof catRule === 'string') return catRule;
  if (catRule.overrides?.[key]) return catRule.overrides[key];
  return catRule.default;
}

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

const args = argv.slice(2);
const format = args.includes('--penpot') ? 'penpot' : args.includes('--figma') ? 'figma' : 'all';

if (format === 'figma' || format === 'all') {
  const figmaPath = resolve(__dirname, '../dist/tokens.json');
  writeFileSync(figmaPath, JSON.stringify(figmaTokens, null, 2));
  console.log(`Tokens (Figma) exported to ${figmaPath}`);
}

if (format === 'penpot' || format === 'all') {
  const penpotTokens: Record<string, unknown> = {};
  for (const [cat, vals] of Object.entries(figmaTokens)) {
    penpotTokens[cat] = toPenpotTokens(cat, vals as Record<string, unknown>);
  }
  const penpotPath = resolve(__dirname, '../dist/tokens-penpot.json');
  writeFileSync(penpotPath, JSON.stringify(penpotTokens, null, 2));
  console.log(`Tokens (Penpot/W3C) exported to ${penpotPath}`);
}
