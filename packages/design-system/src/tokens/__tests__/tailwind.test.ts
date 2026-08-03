import { describe, it, expect } from 'vitest';
import {
  tailwindElevationExtensions,
  tailwindColorExtensions,
  tailwindFontFamilyExtensions,
  tailwindSpacingExtensions,
  tailwindRadiusExtensions,
} from '../tailwind.js';

describe('tailwind token extensions', () => {
  it('exports elevation extensions with all 5 levels', () => {
    expect(tailwindElevationExtensions).toHaveProperty('elevation-flat');
    expect(tailwindElevationExtensions).toHaveProperty('elevation-raised');
    expect(tailwindElevationExtensions).toHaveProperty('elevation-overlay');
    expect(tailwindElevationExtensions).toHaveProperty('elevation-modal');
    expect(tailwindElevationExtensions).toHaveProperty('elevation-sticky');
  });

  it('elevation extensions reference CSS vars', () => {
    expect(tailwindElevationExtensions['elevation-flat']).toBe('var(--oe-elevation-flat)');
    expect(tailwindElevationExtensions['elevation-raised']).toBe('var(--oe-elevation-raised)');
    expect(tailwindElevationExtensions['elevation-overlay']).toBe('var(--oe-elevation-overlay)');
    expect(tailwindElevationExtensions['elevation-modal']).toBe('var(--oe-elevation-modal)');
    expect(tailwindElevationExtensions['elevation-sticky']).toBe('var(--oe-elevation-sticky)');
  });

  it('exports color extensions', () => {
    expect(tailwindColorExtensions).toHaveProperty('primary');
    expect(tailwindColorExtensions['primary']).toBe(
      'rgb(var(--oe-color-primary-rgb) / <alpha-value>)',
    );
    expect(tailwindColorExtensions['success-container']).toBe(
      'rgb(var(--oe-color-success-container-rgb) / <alpha-value>)',
    );
  });

  it('exports font family extensions', () => {
    expect(tailwindFontFamilyExtensions).toHaveProperty('body-reading');
  });

  it('exports spacing extensions', () => {
    expect(tailwindSpacingExtensions).toHaveProperty('md');
  });

  it('exports radius extensions', () => {
    expect(tailwindRadiusExtensions).toHaveProperty('DEFAULT');
  });
});
