import { describe, it, expect } from 'vitest';
import { luminaScholastica } from '../lumina-scholastica';
import { nocturnal } from '../nocturnal';
import { zen } from '../zen';
import type { ThemeDefinition } from '../types';

const themes: Record<string, ThemeDefinition> = {
  'lumina-scholastica': luminaScholastica,
  nocturnal: nocturnal,
  zen: zen,
};

const requiredColorKeys = [
  'surface',
  'surface-dim',
  'surface-bright',
  'surface-container-lowest',
  'surface-container-low',
  'surface-container',
  'surface-container-high',
  'surface-container-highest',
  'on-surface',
  'on-surface-variant',
  'inverse-surface',
  'inverse-on-surface',
  'outline',
  'outline-variant',
  'surface-tint',
  'primary',
  'on-primary',
  'primary-container',
  'on-primary-container',
  'inverse-primary',
  'secondary',
  'on-secondary',
  'secondary-container',
  'on-secondary-container',
  'tertiary',
  'on-tertiary',
  'tertiary-container',
  'on-tertiary-container',
  'error',
  'on-error',
  'error-container',
  'on-error-container',
  'primary-fixed',
  'primary-fixed-dim',
  'on-primary-fixed',
  'on-primary-fixed-variant',
  'secondary-fixed',
  'secondary-fixed-dim',
  'on-secondary-fixed',
  'on-secondary-fixed-variant',
  'tertiary-fixed',
  'tertiary-fixed-dim',
  'on-tertiary-fixed',
  'on-tertiary-fixed-variant',
  'background',
  'on-background',
  'surface-variant',
  'bg',
  'fg',
  'border',
  'success',
  'success-container',
  'on-success',
  'on-success-container',
  'accent',
  'primary-light',
];

const hexRegex = /^#[0-9a-fA-F]{6}$/;

const typographySetKeys: Array<keyof ThemeDefinition['typography']> = ['productive', 'expressive'];

const spacingKeys: Array<keyof ThemeDefinition['spacing']> = [
  'base',
  'xs',
  'sm',
  'md',
  'lg',
  'xl',
  'gutter',
  'marginDesktop',
  'marginMobile',
  'containerMax',
  'readingWidth',
  'panelNav',
  'paragraphSpacing',
];

const radiiKeys: Array<keyof ThemeDefinition['radii']> = [
  'sm',
  'DEFAULT',
  'md',
  'lg',
  'xl',
  'full',
];

describe('theme definitions', () => {
  it('lumina-scholastica uses v2 warm palette', () => {
    const theme = luminaScholastica;
    expect(theme.colors['surface']).toBe('#fcfaf8');
    expect(theme.colors['primary']).toBe('#5d4a8a');
    expect(theme.colors['tertiary']).toBe('#b8862d');
    expect(theme.colors['on-surface']).toBe('#1f1c18');
    expect(theme.colors['on-surface-variant']).toBe('#48443f');
    expect(theme.colors['outline']).toBe('#76706b');
    expect(theme.colors['outline-variant']).toBe('#ccc6c0');
  });
  Object.entries(themes).forEach(([name, theme]) => {
    describe(name, () => {
      it('has all required color tokens', () => {
        for (const key of requiredColorKeys) {
          expect(theme.colors).toHaveProperty(key);
          expect(theme.colors[key]).toBeDefined();
          expect(theme.colors[key]).not.toBe('');
        }
      });

      it('has valid hex color values', () => {
        for (const key of requiredColorKeys) {
          const val = theme.colors[key];
          if (val) {
            expect(val).toMatch(hexRegex);
          }
        }
      });

      it('has no extra color keys beyond the required set', () => {
        expect(Object.keys(theme.colors).length).toBe(requiredColorKeys.length);
      });

      it('has both productive and expressive typography sets', () => {
        for (const setName of typographySetKeys) {
          const typographySet = theme.typography[setName];
          expect(typographySet).toBeDefined();
          for (const role of [
            'display',
            'heading',
            'subheading',
            'body',
            'label',
            'caption',
            'code',
          ] as const) {
            const token = typographySet[role];
            expect(token).toBeDefined();
            expect(token.fontFamily).toBeDefined();
            expect(token.fontSize).toBeDefined();
            expect(token.fontWeight).toBeDefined();
            expect(token.lineHeight).toBeDefined();
          }
        }
      });

      it('has all required spacing tokens', () => {
        for (const key of spacingKeys) {
          expect(theme.spacing).toHaveProperty(key);
          expect(theme.spacing[key]).toBeDefined();
        }
      });

      it('has all required radii tokens', () => {
        for (const key of radiiKeys) {
          expect(theme.radii).toHaveProperty(key);
          expect(theme.radii[key]).toBeDefined();
        }
      });

      it('has a valid id, name, and description', () => {
        expect(theme.id).toBe(name);
        expect(typeof theme.name).toBe('string');
        expect(theme.name.length).toBeGreaterThan(0);
        expect(typeof theme.description).toBe('string');
        expect(theme.description?.length).toBeGreaterThan(0);
      });
    });
  });
});
