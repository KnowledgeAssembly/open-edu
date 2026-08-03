# OpenEdu Animation Specification (OAS) v0.1

## Status

Draft (Updated: Widget & AI Companion dotLottie Specification)

---

# 1. Goals

The OpenEdu Animation Specification (OAS) defines a portable, declarative, decoupled animation model for OpenEdu learning packages and runtime subsystems.

The specification enables:

* Rich educational animations embedded in widget configurations
* AI Learning Companion (Pipili) state animations (idle, thinking, celebrating, hint progression)
* Preferred **dotLottie (`.lottie`)** high-efficiency binary packaging
* Offline-first execution
* Cross-platform rendering (Web, PWA, Android, iOS, Desktop)
* First-class accessibility (Screen reader live regions, `prefers-reduced-motion`)
* Schema-validated AI-generated animation presets
* Multiple rendering backends (dotLottie, SVG, CSS, Canvas, WebGPU)

Animations are authored once as JSON schema configurations or dotLottie assets and rendered consistently across content widgets and the AI Companion.

---

# 2. Design Principles

## 2.1 Decoupled Core Subsystem (Widgets + AI Companion)

The animation engine is architected as a reusable core runtime subsystem in `@open-edu/runtime` and `@open-edu/design-system`. It is consumed equally by:
1. **Content Widgets**: Diagram steps, process flows, interactive exercises.
2. **AI Companion (Pipili)**: Character states, emotional reactions, thinking indicators.
3. **Rewards & Milestones**: Confetti bursts, badge unlock animations.

## 2.2 dotLottie (`.lottie`) Preference

OpenEdu standardizes on **dotLottie (`.lottie`)** as the primary vector animation format over uncompressed legacy Lottie JSON. dotLottie provides up to 80% compression savings, supports multi-theme CSS variable injection (`--oe-color-*`), and packages audio sync natively.

## 2.3 Semantic over Technical

Authors describe educational intent rather than implementation details.

Good (JSON Schema):
```json
{
  "effect": "flow",
  "direction": "forward"
}
```

Bad (Raw CSS / Bezier Curves):
```css
transform: translateX(20px);
animation-timing-function: cubic-bezier(...)
```

---

## 2.4 Renderer Independent

Lesson content and companion state never depend on raw engine APIs (CSS keyframes, SVG DOM manipulation, Canvas 2D contexts, or WebGPU shaders directly). The renderer chooses the optimal implementation.

---

## 2.5 Progressive Enhancement

Renderers MUST gracefully degrade based on system capabilities and performance constraints:

1. **Preferred**: Full interactive dotLottie / SVG draw animation
2. **Fallback**: Subtle CSS Fade / Highlight
3. **Reduced Motion**: Instant reveal, static mascot pose, or static step badges

---

## 2.6 Offline First

Every animation asset (.lottie, .svg, .json) MUST execute locally without an internet connection and be packaged inside `.oep` course archives or app bundles.

---

## 2.7 Accessibility First

Renderers MUST support:
* System `prefers-reduced-motion` settings
* Screen reader live region announcements (`@open-edu/accessibility`) upon step completion
* Full keyboard navigation (Focus Management)
* Animation playback controls (Play, Pause, Resume, Speed)

---

# 3. Decoupled Architecture

```
                       ┌─────────────────────────┐
                       │   OAS Zod Schemas       │
                       │   (@open-edu/schemas)   │
                       └────────────┬────────────┘
                                    │
                                    ▼
                       ┌─────────────────────────┐
                       │  OAS Animation Engine   │
                       │  (@open-edu/runtime)    │
                       └────────────┬────────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         │                          │                          │
         ▼                          ▼                          ▼
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│ Content Widgets  │      │  AI Companion    │      │ Reward Broker    │
│ (@open-edu/      │      │  (Pipili Mascot) │      │ (@open-edu/      │
│  widgets)        │      │  (@open-edu/     │      │  rewards)        │
│                  │      │   ai-companion)  │      │                  │
└────────┬─────────┘      └────────┬─────────┘      └────────┬─────────┘
         │                         │                         │
  ┌──────┴─────────────────────────┼─────────────────────────┴──────┐
  │                                │                                │
  ▼                                ▼                                ▼
dotLottie Engine               SVG Engine                      CSS Engine
(.lottie binary)             (Vector Paths)                 (Tokens & Motion)
```

---

# 4. Animation Categories

## 4.1 AI Companion & Mascot (Pipili)
* **Purpose**: Emotional connection, hint progression, thinking states
* **Examples**: Idle wave, thinking pulse, celebration jump, hint reveal
* **Preferred Backend**: dotLottie (`.lottie`)

## 4.2 Decorative & Rewards
* **Purpose**: Visual delight, milestone encouragement
* **Examples**: Reward bursts, confetti, badge unlocks, XP gain
* **Preferred Backend**: dotLottie (`.lottie`), CSS

## 4.3 Educational
* **Purpose**: Teach concepts, illustrate step-by-step processes
* **Examples**: Photosynthesis, water cycle, blood circulation, geometric transforms
* **Preferred Backend**: SVG, Canvas

## 4.4 Interactive
* **Purpose**: Respond to real-time learner input and simulation controls
* **Examples**: Sorting algorithms, circuit simulations, physics collision, chemistry bonds
* **Preferred Backend**: Canvas, WebGPU

---

# 5. Widget & Companion JSON Specification

## 5.1 Content Widget Example

```json
{
  "type": "exercise",
  "title": "The Water Cycle",
  "widget": "science.process-diagram",
  "config": {
    "title": "The Water Cycle",
    "stepByStep": true,
    "interactive": true,
    "animation": {
      "backend": "lottie",
      "src": "assets/animations/water-cycle.lottie",
      "trigger": "visible",
      "reducedMotion": "static-steps",
      "effects": [
        { "step": 1, "target": "evaporation", "effect": "flow" },
        { "step": 2, "target": "condensation", "effect": "pulse" }
      ]
    }
  }
}
```

## 5.2 AI Companion (Pipili) State Example

```json
{
  "companionId": "pipili",
  "state": "thinking",
  "animation": {
    "backend": "lottie",
    "src": "assets/pipili/pipili-thinking.lottie",
    "loop": true,
    "speed": 1.0,
    "reducedMotion": "static-pose"
  }
}
```

---

# 6. Zod Schema Definition (`@open-edu/schemas`)

```typescript
import { z } from 'zod';

export const AnimationBackendEnum = z.enum(['lottie', 'svg', 'css', 'canvas', 'webgpu']).default('lottie');

export const AnimationEffectEnum = z.enum([
  // Entrance
  'fade', 'slide', 'zoom', 'pop', 'appear',
  // Emphasis
  'highlight', 'pulse', 'shake', 'glow', 'focus',
  // Educational
  'flow', 'grow', 'trace', 'draw', 'orbit', 'rotate',
  'assemble', 'disassemble', 'transform', 'connect', 'compare', 'morph',
  // AI Companion & Celebration
  'wave', 'think', 'celebrate', 'hint', 'confetti', 'sparkle', 'badge', 'success'
]);

export const AnimationConfigSchema = z.object({
  backend: AnimationBackendEnum,
  src: z.string().optional().describe('Path to .lottie or .svg asset'),
  trigger: z.enum(['load', 'visible', 'click', 'hover', 'step', 'answer-correct', 'answer-wrong', 'lesson-complete', 'custom']).default('visible'),
  reducedMotion: z.enum(['instant', 'fade', 'static-steps', 'static-pose']).default('instant'),
  effects: z.array(z.object({
    step: z.number().optional(),
    target: z.string().describe('Target element ID or dotLottie layer key'),
    effect: AnimationEffectEnum,
    duration: z.union([z.enum(['instant', 'fast', 'normal', 'slow']), z.number()]).optional(),
    delay: z.number().optional(),
    easing: z.string().optional(),
    repeat: z.union([z.enum(['once', 'loop', 'pingpong']), z.object({ count: z.number() })]).optional(),
    direction: z.enum(['forward', 'reverse', 'alternate']).optional()
  })).optional()
});
```

---

# 7. Preferred dotLottie Specification

OpenEdu standardizes on **dotLottie** (`.lottie`):

```json
"animation": {
  "backend": "lottie",
  "src": "assets/animations/pipili-wave.lottie",
  "loop": true,
  "speed": 1.0,
  "segments": [0, 60]
}
```

**dotLottie Features**:
* **High Compression**: Up to 80% smaller than raw Lottie `.json`.
* **Multi-State Packaging**: Single `.lottie` archive can contain multiple animation states (e.g. `idle`, `thinking`, `happy`).
* **Theme Variable Injection**: Maps `--oe-color-*` CSS tokens directly to dotLottie vector fills and strokes.

---

# 8. SVG Support

```json
"animation": {
  "backend": "svg",
  "src": "assets/diagrams/heart.svg",
  "effects": [
    { "target": "#right-ventricle", "effect": "draw" },
    { "target": "#aorta-flow", "effect": "flow" }
  ]
}
```

---

# 9. Accessibility & Screen Readers

Renderers MUST strictly obey accessibility preferences:

1. **System Reduced Motion (`prefers-reduced-motion: reduce`)**:
   - `orbit` → `fade`
   - `flow` → `highlight`
   - `pipili-thinking.lottie` → `pipili-static-thinking.png`
2. **Screen Reader Integration (`@open-edu/accessibility`)**:
   - Step reveals emit live region progress notifications (e.g., *"Pipili provided hint 1: Think about evaporation"*).

---

# 10. Guiding Philosophy

OpenEdu animations communicate educational meaning and foster emotional engagement without performance bloat.

By building a **decoupled dotLottie and SVG animation engine**, OpenEdu powers both interactive content widgets and the Pipili AI Learning Companion with a unified, accessible, offline-first animation runtime.