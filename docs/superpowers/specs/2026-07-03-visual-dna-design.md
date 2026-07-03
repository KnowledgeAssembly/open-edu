# Visual DNA Design Spec — Open Module, Pattern Language, Illustration Language

> **Status:** Approved
> **Date:** 2026-07-03
> **Stage:** 3 — Visual DNA (Finalized)
> **Depends on:** Geometric Primitive (circle), Pipili, Logo

---

## Purpose

This spec defines the three remaining Visual DNA elements for OpenEdu:

1. **Open Module** — How a single learning module appears visually
2. **Pattern Language** — How repeated modules create textures, backgrounds, and decorative elements
3. **Illustration Language** — How people appear in OpenEdu illustrations

All three elements share the same geometric primitive (circle) and express the core philosophy: assembly, openness, and calm.

---

## Design Principles Applied

| Principle | Application |
|-----------|-------------|
| **Assembly over hierarchy** | Modules are assembled from primitives, not drawn as monolithic shapes |
| **Never complete** | The Open Module always has empty orbit space — room for more connections |
| **Silence is part of the interface** | Patterns are calm textures, not busy decorations |
| **Consistency builds confidence** | All three elements use the same circle primitive and color palette |
| **Accessibility is beautiful** | Figures use proportion, not facial features, for recognition |

---

## 1. Open Module — Orbital Cluster

### Concept

A central circle (core) surrounded by satellite circles on a dashed orbit path. The satellites are clustered on one side, leaving intentional empty space on the orbit. This emptiness is the defining feature — it says "this module is not full, there is room for more."

### Anatomy

```
        ┌─ satellite (primary-light, 70% opacity)
        │
   ●────┼──── ● ──── ◌ ──── ◌ ──── ◌ ──── ◌ ──── (empty orbit)
   │    │
   │    └─ satellite (primary-light, 70% opacity)
   │
   └── core (primary, 100%)
   
   ◌ ─── dashed orbit ring (primary, 18% opacity, 1.5px stroke)
```

### Specifications

| Property | Value |
|----------|-------|
| **Core shape** | Circle (`border-radius: 50%`) |
| **Satellite shape** | Circle (`border-radius: 50%`) |
| **Orbit shape** | Circle (`border-radius: 50%`, dashed stroke) |
| **Core color** | `var(--oe-color-primary)` |
| **Satellite color** | `var(--oe-color-primary-light)` at 70% opacity |
| **Orbit color** | `var(--oe-color-primary)` at 18% opacity |
| **Orbit stroke** | 1.5px dashed |
| **Orbit dash pattern** | 4px dash, 3px gap |

### Size Variants

| Variant | Total Size | Core | Orbit Ø | Satellite Ø | Satellite Count | Use Case |
|---------|-----------|------|---------|-------------|----------------|----------|
| **sm** | 80 × 80px | 18px | 56px | 9px | 2 | Badges, inline indicators |
| **md** | 120 × 120px | 26px | 84px | 12px | 3 | Cards, list items |
| **lg** | 180 × 180px | 38px | 128px | 16px | 5 | Illustrations, empty states |

### Satellite Placement Rules

1. Satellites cluster on the **right side** of the orbit (top-right to bottom-right)
2. The **left side** of the orbit remains empty (40–60% of orbit circumference)
3. Satellites are evenly spaced within their cluster
4. No satellite overlaps another satellite or the core
5. Satellite count is always **2–6** (never 1, never 7+)

### States

| State | Visual Change |
|-------|---------------|
| **Default** | Standard opacity (70% satellites) |
| **Hover** | Satellites pulse to 85% opacity (CSS transition: 200ms ease) |
| **Active/Selected** | Core gets a 2px ring offset in `--oe-color-primary` |
| **Incomplete** | 2 satellites only, orbit clearly has empty space |
| **Complete** | 5–6 satellites, but orbit still has visible gaps |

### Implementation Notes

- The orbital cluster is an SVG or CSS-only component
- The dashed orbit is a single `<circle>` with `stroke-dasharray`
- Satellites are positioned absolutely relative to the center
- Use `transform: translate(-50%, -50%)` from top-left corner for centering
- The component should accept `size: 'sm' | 'md' | 'lg'` and `satellites: number` props

---

## 2. Pattern Language — Assembly Flow

### Concept

A single flowing dashed path connecting circle nodes of varying sizes. The path curves gently — never straight — suggesting exploration and journey. Nodes vary in size and opacity to create visual depth. The pattern scales from dense backgrounds to minimal section dividers.

### Anatomy

```
● ─ ─ ─ ─ ● ─ ─ ─ ─ ─ ● ─ ─ ─ ● ─ ─ ─ ─ ─ ─ ●
small     medium    large    medium     small
(accent)  (primary) (primary) (accent)  (faint)
```

### Specifications

| Property | Value |
|----------|-------|
| **Path type** | SVG `<path>` with cubic bezier curves |
| **Path stroke** | 1.5px, `var(--oe-color-primary)` at 15% opacity |
| **Path dash** | 8px dash, 5px gap |
| **Node shape** | Circle |
| **Node base color** | `var(--oe-color-primary)` |
| **Node accent color** | `var(--oe-color-accent)` |

### Node Size Scale

| Size | Diameter | Opacity | Use |
|------|----------|---------|-----|
| **faint** | 6px | 12% | Background texture nodes |
| **light** | 10px | 25% | Secondary depth nodes |
| **default** | 12px | 50% | Standard path nodes |
| **accent** | 14px | 50% | Emphasis nodes (uses accent color) |
| **large** | 16px | 60% | Hero/focal nodes |

### Density Variants

| Variant | Nodes per 300px | Path complexity | Use Case |
|---------|----------------|-----------------|----------|
| **Dense** | 7–9 | Multi-curve, tight S-shapes | Background textures, hero sections |
| **Medium** | 4–5 | Gentle curves | Card decorations, sidebar patterns |
| **Minimal** | 2–3 | Single curve | Section dividers, inline accents |

### Path Behavior

1. Paths always move **left to right** (reading direction)
2. Paths never cross themselves
3. Curves are **cubic beziers** — smooth, organic, never angular
4. The path enters from the left edge and exits toward the right
5. Vertical variation is constrained to ±30% of the container height

### Color Assignment

- **60% of nodes** use `primary` color
- **30% of nodes** use `accent` color
- **10% of nodes** use `primary-light` color
- Opacity decreases toward the path edges (fade in/out)

### Animation

When used for **loading states**:
- Path stroke animates via `stroke-dashoffset` (flowing effect, 3s loop)
- Nodes fade in sequentially along the path (staggered 150ms)
- Animation respects `prefers-reduced-motion`

When used as **static decoration**:
- No animation
- Path and nodes are static SVG

### Implementation Notes

- Render as inline SVG for performance
- Accept `density: 'dense' | 'medium' | 'minimal'` prop
- Accept `animated: boolean` prop (default false)
- Use `viewBox` for responsive scaling
- Generate path data procedurally or use a small set of hand-crafted paths

---

## 3. Illustration Language — Silhouette Assembly

### Concept

Human figures built from two translucent shapes: a circle head and a rounded torso. Diversity is expressed through **proportion variation** — different heights, widths, and head-to-body ratios. No faces, no limbs, no facial features. Posture and proportion carry the meaning. The translucency creates depth where shapes overlap.

### Anatomy

```
      ●          ← head (circle, 70% opacity)
     ╱ ╲
    ╱   ╲        ← torso (rounded rect, 25% opacity)
   ╱     ╲
   ‾‾‾‾‾‾‾
```

### Specifications

| Property | Value |
|----------|-------|
| **Head shape** | Circle (`border-radius: 50%`) |
| **Torso shape** | Rounded rectangle (`border-radius: 50% 50% 30% 30%`) |
| **Head opacity** | 70% |
| **Torso opacity** | 25% |
| **Overlap** | Head overlaps torso top by 4px (negative margin) |
| **No limbs** | Figures never have arms, legs, or hands |
| **No faces** | Figures never have eyes, mouth, or expressions |

### Proportion System

Five base proportions define the diversity system. Each figure uses one proportion + one color palette.

| Proportion | Head Ø | Torso W | Torso H | Silhouette |
|------------|--------|---------|---------|------------|
| **tall** | 22px | 28px | 40px | Narrow, tall — suggests height |
| **med** | 20px | 26px | 34px | Balanced, default |
| **short** | 18px | 24px | 28px | Compact, suggests child/smaller frame |
| **wide** | 22px | 34px | 32px | Broad, suggests wider build |
| **narrow** | 16px | 20px | 36px | Slim, suggests lean build |

### Color Palettes (5 diversity palettes)

| Palette | Head Color | Torso Color | CSS Variable |
|---------|-----------|-------------|--------------|
| **c1** | `rgba(109,40,217,0.7)` | `rgba(109,40,217,0.25)` | `--oe-color-primary` |
| **c2** | `rgba(6,182,212,0.7)` | `rgba(6,182,212,0.25)` | `--oe-color-accent` |
| **c3** | `rgba(180,83,9,0.7)` | `rgba(180,83,9,0.25)` | warm amber |
| **c4** | `rgba(139,92,246,0.7)` | `rgba(139,92,246,0.25)` | `--oe-color-primary-light` |
| **c5** | `rgba(5,150,105,0.7)` | `rgba(5,150,105,0.25)` | `--oe-color-success` |

### Composition Rules

1. **Groups of 3–7 figures** — never alone, never a crowd
2. **Varied proportions in each group** — at least 3 different proportions per scene
3. **Varied palettes in each group** — at least 3 different colors per scene
4. **Grounding** — figures align to a shared baseline or float with consistent spacing
5. **Overlap is allowed** — translucent overlap creates visual depth
6. **No hierarchy** — no figure is larger/more prominent than others (unless intentional for focal point)

### Scene Types

| Scene | Composition | Use |
|-------|-------------|-----|
| **Group portrait** | 3–5 figures side by side | About pages, community sections |
| **Learning moment** | 2–3 figures, one slightly forward | Course intros, achievement screens |
| **Community** | 5–7 figures, varied spacing | Landing pages, social features |
| **Empty state** | 1–2 figures with Assembly Flow pattern | No-data screens, onboarding |

### Animation

Figures are static by default. When animated:
- **Entrance:** Figures fade in and slide up (200ms stagger, 50ms delay between figures)
- **Idle:** Subtle breathing effect on torso opacity (25% → 30% → 25%, 4s loop)
- Animation respects `prefers-reduced-motion` — static when reduced motion is preferred

### Implementation Notes

- Each figure is a flex column: head div + torso div
- Head-to-torso overlap via `margin-bottom: -4px` on head
- Accept `proportion: 'tall' | 'med' | 'short' | 'wide' | 'narrow'` prop
- Accept `palette: 1 | 2 | 3 | 4 | 5` prop
- Scene components compose multiple figures with gap control

---

## Integration with Existing Visual DNA

| Element | Primitive | Relationship |
|---------|-----------|--------------|
| **Geometric Primitive** (circle) | — | The foundation. All three elements use circles. |
| **Open Module** | Circle core + satellite circles | Direct composition of the primitive |
| **Assembly Flow** | Circle nodes on dashed path | Repeated primitives connected by paths |
| **Silhouette Assembly** | Circle head + rounded torso | Primitive adapted for human representation |
| **Pipili** | Built from same proportions | The companion uses the same proportion system |
| **Logo** | Assembled from primitives | Logo uses the same orbital/assembly language |

---

## Token References

These Visual DNA elements reference existing design tokens:

| Token | Used By | Value |
|-------|---------|-------|
| `--oe-color-primary` | Open Module core, Assembly Flow nodes, Silhouette c1 | Theme-dependent |
| `--oe-color-primary-light` | Open Module satellites, Silhouette c4 | Theme-dependent |
| `--oe-color-accent` | Assembly Flow accent nodes, Silhouette c2 | Theme-dependent |
| `--oe-color-success` | Silhouette c5 | Theme-dependent |

---

## Storybook Stories

Each element should have corresponding Storybook stories in `packages/design-system/src/primitives/`:

1. `open-module.stories.tsx` — Orbital cluster at all sizes and satellite counts
2. `assembly-flow.stories.tsx` — Pattern at all density variants, animated and static
3. `silhouette-assembly.stories.tsx` — All proportion × palette combinations, group compositions

---

## Verification Criteria

- [ ] Open Module renders correctly at sm/md/lg sizes
- [ ] Satellite count 2–6 with intentional gaps on orbit
- [ ] Assembly Flow renders at dense/medium/minimal density
- [ ] Assembly Flow animated variant respects `prefers-reduced-motion`
- [ ] Silhouette figures render all 5 proportions
- [ ] Silhouette figures render all 5 color palettes
- [ ] Group compositions follow the 3–7 figure rule
- [ ] All elements pass axe-core accessibility audit
- [ ] All elements render correctly in light and dark themes
- [ ] Storybook stories cover all variants

---

## File References

- Brainstorm HTML: `docs/superpowers/brainstorm/visual-dna/01-open-module.html`
- Brainstorm HTML: `docs/superpowers/brainstorm/visual-dna/02-pattern-language.html`
- Brainstorm HTML: `docs/superpowers/brainstorm/visual-dna/03-illustration-language.html`
- Refined system: `docs/superpowers/brainstorm/visual-dna/04-refined-system.html`
- Design process: `openedu-way/DESIGN_PROCESS.md`
- Design status: `openedu-way/DESIGN_STATUS.md`
