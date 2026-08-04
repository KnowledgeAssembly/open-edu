import { describe, it, expect } from 'vitest';
import { AnimationBackendEnum, AnimationEffectEnum, AnimationConfigSchema } from './animation';

describe('AnimationBackendEnum', () => {
  it('should default to svg when omitted', () => {
    const result = AnimationBackendEnum.safeParse(undefined);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe('svg');
  });

  it('should accept all backends', () => {
    for (const backend of ['lottie', 'svg', 'css', 'canvas', 'webgpu']) {
      expect(AnimationBackendEnum.safeParse(backend).success).toBe(true);
    }
  });

  it('should reject unknown backends', () => {
    expect(AnimationBackendEnum.safeParse('flash').success).toBe(false);
  });
});

describe('AnimationEffectEnum', () => {
  it('should accept AI companion effects', () => {
    for (const effect of ['wave', 'think', 'celebrate', 'hint']) {
      expect(AnimationEffectEnum.safeParse(effect).success).toBe(true);
    }
  });

  it('should reject unknown effects', () => {
    expect(AnimationEffectEnum.safeParse('sparkles').success).toBe(false);
  });
});

describe('AnimationConfigSchema', () => {
  it('should apply defaults for backend, trigger, and reducedMotion', () => {
    const result = AnimationConfigSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.backend).toBe('svg');
      expect(result.data.trigger).toBe('visible');
      expect(result.data.reducedMotion).toBe('instant');
    }
  });

  it('should parse a full dotLottie config', () => {
    const config = {
      backend: 'lottie',
      src: 'assets/animations/pipili-wave.lottie',
      loop: true,
      speed: 1.5,
      segments: [0, 60],
      trigger: 'visible',
      reducedMotion: 'static-pose',
    };
    const result = AnimationConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.loop).toBe(true);
      expect(result.data.speed).toBe(1.5);
      expect(result.data.segments).toEqual([0, 60]);
    }
  });

  it('should parse an SVG config with effects using repeat variants', () => {
    const config = {
      backend: 'svg',
      src: 'assets/diagrams/heart.svg',
      effects: [
        { target: '#right-ventricle', effect: 'draw', repeat: { count: 3 } },
        { target: '#aorta-flow', effect: 'flow', repeat: 'loop' },
        { target: '#left-ventricle', effect: 'pulse', repeat: 'pingpong', direction: 'alternate' },
      ],
    };
    const result = AnimationConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.effects).toHaveLength(3);
      expect(result.data.effects?.[0]?.repeat).toEqual({ count: 3 });
      expect(result.data.effects?.[1]?.repeat).toBe('loop');
    }
  });

  it('should parse a config with all AI companion effects', () => {
    const config = {
      backend: 'lottie',
      src: 'assets/animations/pipili-moods.lottie',
      effects: [
        { target: 'body', effect: 'wave', step: 1 },
        { target: 'body', effect: 'think', step: 2 },
        { target: 'body', effect: 'celebrate', step: 3 },
        { target: 'body', effect: 'hint', step: 4 },
      ],
    };
    const result = AnimationConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.effects).toHaveLength(4);
    }
  });

  it('should reject an invalid trigger', () => {
    const result = AnimationConfigSchema.safeParse({ trigger: 'on-start' });
    expect(result.success).toBe(false);
  });

  it('should reject an invalid effect', () => {
    const result = AnimationConfigSchema.safeParse({
      effects: [{ target: 'x', effect: 'sparkles' }],
    });
    expect(result.success).toBe(false);
  });

  it('should reject an invalid reducedMotion value', () => {
    const result = AnimationConfigSchema.safeParse({ reducedMotion: 'none' });
    expect(result.success).toBe(false);
  });

  it('should accept numeric and semantic durations', () => {
    const config = {
      effects: [
        { target: 'a', effect: 'fade', duration: 250 },
        { target: 'b', effect: 'slide', duration: 'slow' },
      ],
    };
    expect(AnimationConfigSchema.safeParse(config).success).toBe(true);
  });
});
