import { z } from 'zod';

export const AnimationBackendEnum = z
  .enum(['lottie', 'svg', 'css', 'canvas', 'webgpu'])
  .default('lottie');

export const AnimationEffectEnum = z.enum([
  // Entrance
  'fade',
  'slide',
  'zoom',
  'pop',
  'appear',
  // Emphasis
  'highlight',
  'pulse',
  'shake',
  'glow',
  'focus',
  // Educational
  'flow',
  'grow',
  'trace',
  'draw',
  'orbit',
  'rotate',
  'assemble',
  'disassemble',
  'transform',
  'connect',
  'compare',
  'morph',
  // AI Companion & Celebration
  'wave',
  'think',
  'celebrate',
  'hint',
  'confetti',
  'sparkle',
  'badge',
  'success',
]);

export const AnimationTriggerEnum = z
  .enum([
    'load',
    'visible',
    'click',
    'hover',
    'step',
    'answer-correct',
    'answer-wrong',
    'lesson-complete',
    'custom',
  ])
  .default('visible');

export const AnimationReducedMotionEnum = z
  .enum(['instant', 'fade', 'static-steps', 'static-pose'])
  .default('instant');

export const AnimationEffectConfigSchema = z.object({
  step: z.number().optional(),
  target: z.string().describe('Target element ID or dotLottie layer key'),
  effect: AnimationEffectEnum,
  duration: z.union([z.enum(['instant', 'fast', 'normal', 'slow']), z.number()]).optional(),
  delay: z.number().optional(),
  easing: z.string().optional(),
  repeat: z
    .union([z.enum(['once', 'loop', 'pingpong']), z.object({ count: z.number() })])
    .optional(),
  direction: z.enum(['forward', 'reverse', 'alternate']).optional(),
});

export const AnimationConfigSchema = z.object({
  backend: AnimationBackendEnum,
  src: z.string().optional().describe('Path to .lottie or .svg asset'),
  loop: z.boolean().optional(),
  speed: z.number().optional(),
  segments: z.tuple([z.number(), z.number()]).optional(),
  trigger: AnimationTriggerEnum,
  reducedMotion: AnimationReducedMotionEnum,
  effects: z.array(AnimationEffectConfigSchema).optional(),
});

export type AnimationBackend = z.infer<typeof AnimationBackendEnum>;
export type AnimationEffect = z.infer<typeof AnimationEffectEnum>;
export type AnimationTrigger = z.infer<typeof AnimationTriggerEnum>;
export type AnimationReducedMotion = z.infer<typeof AnimationReducedMotionEnum>;
export type AnimationEffectConfig = z.infer<typeof AnimationEffectConfigSchema>;
export type AnimationConfig = z.infer<typeof AnimationConfigSchema>;
export type AnimationConfigInput = z.input<typeof AnimationConfigSchema>;
export type AnimationEffectConfigInput = z.input<typeof AnimationEffectConfigSchema>;
