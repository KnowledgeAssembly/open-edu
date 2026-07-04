# Visual DNA

> _"What makes OpenEdu instantly recognizable?"_

---

## Purpose

This document defines the Visual DNA of OpenEdu — the six elements that create an unmistakable visual identity. Every interface, illustration, and pattern in OpenEdu is assembled from these elements.

Visual DNA sits at **Stage 3** of the Design Pyramid, between Design Language (principles) and Design System (implementation).

---

## The Six Elements

| #   | Element                   | Decision                  | Spec                                                                 |
| --- | ------------------------- | ------------------------- | -------------------------------------------------------------------- |
| 1   | **Geometric Primitive**   | Circle                    | Component: `packages/design-system/src/primitives/geo-primitive.tsx` |
| 2   | **Open Module**           | Orbital Cluster           | §1 of design spec                                                    |
| 3   | **Pipili**                | Quiet Companion           | Component: `packages/design-system/src/primitives/pipili.tsx`        |
| 4   | **Logo**                  | Assembled from Primitives | Component: `packages/design-system/src/primitives/openedu-logo.tsx`  |
| 5   | **Pattern Language**      | Assembly Flow             | §2 of design spec                                                    |
| 6   | **Illustration Language** | Silhouette Assembly       | §3 of design spec                                                    |

**Design spec:** `docs/superpowers/specs/2026-07-03-visual-dna-design.md`

---

## 1. Geometric Primitive — Circle

The foundation of everything. A single circle from which all visual elements are built.

### Why a Circle

- **Simplest closed shape** — one continuous curve, no corners
- **Naturally connectable** — circles touch, overlap, and orbit without hierarchy
- **Scales perfectly** — from 6px dots to full-screen illustrations
- **Animates smoothly** — scale, rotate, fade, pulse
- **Recognizable without color** — form alone carries meaning

### Rules

- Every visual element in OpenEdu is built from circles (or derivatives)
- Circles never carry hierarchical meaning (no "big = important")
- Circles are always calm — no rapid pulsing, no aggressive scaling

---

## 2. Open Module — Orbital Cluster

The fundamental learning unit expressed visually. A central circle (core) surrounded by satellite circles on a dashed orbit.

### Why Orbital Cluster

- **Expresses assembly** — core + satellites = composed from parts
- **Expresses incompleteness** — empty orbit space means "room for more"
- **Scales with context** — 2 satellites for badges, 5 for illustrations
- **Suggests connections** — satellites are linked to the core but could link to other modules

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

### Size Variants

| Variant | Size  | Core | Satellites | Use Case                    |
| ------- | ----- | ---- | ---------- | --------------------------- |
| **sm**  | 80px  | 18px | 2          | Badges, inline indicators   |
| **md**  | 120px | 26px | 3          | Cards, list items           |
| **lg**  | 180px | 38px | 5          | Illustrations, empty states |

### Key Properties

- **Satellites cluster on the right side** — left orbit is always empty
- **Satellite count: 2–6** — never 1 (too sparse), never 7+ (too dense)
- **Dashed orbit** — 4px dash, 3px gap — never solid
- **No satellite overlaps another** or the core

---

## 3. Pipili — Quiet Companion

The companion character. Not a mascot, not an assistant — a quiet presence that communicates through motion and posture.

### Why Pipili

- Named after the town of Pipili in Odisha, India, known for applique craftsmanship
- Represents the philosophy of assembly — many pieces stitched together
- Communicates through **presence**, not speech

### Rules

- Built from the same geometric language (circles + rounded forms)
- Communicates through **posture and orientation**, not facial expressions
- Appears during **uncertainty** (first visit, onboarding, waiting, empty states)
- Stays away during **focused learning** (reading, exams, assessments)
- Growth is shown through **richer relationships and assembled pieces**, not levels or power

### Component

See `packages/design-system/src/primitives/pipili.tsx`

---

## 4. Logo — Assembled from Primitives

The OpenEdu logo is not drawn — it is assembled from the same primitives used everywhere else.

### Why Assembled

- Embodies the core philosophy: "Learning is assembled, not delivered"
- The logo itself is proof that simple pieces create recognizable forms
- Works at any size because primitives scale perfectly

### Rules

- **Assembled, not drawn** — built from circles and rounded forms
- **Open, not enclosed** — suggests expansiveness, not containment
- **Recognizable from form** — works in monochrome, no color dependency
- **Works everywhere** — monochrome, high contrast, light/dark themes, favicon (16px)

### Component

See `packages/design-system/src/primitives/openedu-logo.tsx`

---

## 5. Pattern Language — Assembly Flow

How repeated modules create visual textures, backgrounds, and decorative elements.

### Why Assembly Flow

- **Single flowing path** — clean, minimal, works at any scale
- **Circle nodes** — same primitive, repeated with variation
- **Dashed connections** — suggest links yet to be made
- **Left-to-right flow** — matches reading direction

### Anatomy

```
● ─ ─ ─ ─ ● ─ ─ ─ ─ ─ ● ─ ─ ─ ● ─ ─ ─ ─ ─ ─ ●
small     medium    large    medium     small
(accent)  (primary) (primary) (accent)  (faint)
```

### Density Variants

| Variant     | Nodes/300px | Use Case                           |
| ----------- | ----------- | ---------------------------------- |
| **Dense**   | 7–9         | Background textures, hero sections |
| **Medium**  | 4–5         | Card decorations, sidebar patterns |
| **Minimal** | 2–3         | Section dividers, inline accents   |

### Rules

- Paths always flow **left to right**
- Paths **never cross themselves**
- Curves are **cubic beziers** — smooth, organic, never angular
- 60% primary nodes, 30% accent nodes, 10% light nodes
- Opacity fades toward path edges

---

## 6. Illustration Language — Silhouette Assembly

How people appear in OpenEdu illustrations. Built from circles, expressing diversity through proportion.

### Why Silhouette Assembly

- **Dignity** — no facial features reduces caricature risk
- **Diversity** — proportion variation suggests different body types abstractly
- **Consistency** — same primitives as everything else
- **Motion-ready** — simple shapes animate cleanly

### Anatomy

```
      ●          ← head (circle, 70% opacity)
     ╱ ╲
    ╱   ╲        ← torso (rounded rect, 25% opacity)
   ╱     ╲
   ‾‾‾‾‾‾‾
```

### Proportion System (5 variants)

| Proportion | Head | Torso   | Silhouette   |
| ---------- | ---- | ------- | ------------ |
| **tall**   | 22px | 28×40px | Narrow, tall |
| **med**    | 20px | 26×34px | Balanced     |
| **short**  | 18px | 24×28px | Compact      |
| **wide**   | 22px | 34×32px | Broad        |
| **narrow** | 16px | 20×36px | Slim         |

### Color Palettes (5 diversity palettes)

| Palette | Color        | CSS Variable               |
| ------- | ------------ | -------------------------- |
| c1      | Purple       | `--oe-color-primary`       |
| c2      | Teal         | `--oe-color-accent`        |
| c3      | Amber        | warm tone                  |
| c4      | Light Purple | `--oe-color-primary-light` |
| c5      | Green        | `--oe-color-success`       |

### Composition Rules

- **Groups of 3–7** — never alone, never a crowd
- **At least 3 proportions** per scene
- **At least 3 colors** per scene
- **Overlap is allowed** — translucent overlap creates depth
- **No hierarchy** — all figures equal unless intentional focal point

---

## Integration Map

All six elements share the circle primitive:

```
                    Circle (Geometric Primitive)
                   /    |    \       \        \
                  /     |     \       \        \
         Open Module  Pipili  Logo  Assembly   Silhouette
         (orbital)   (companion) (assembled)  Flow    Assembly
                                  (primitives) (repeated) (human)
```

---

## Token References

| Token                      | Used By                                                    |
| -------------------------- | ---------------------------------------------------------- |
| `--oe-color-primary`       | Open Module core, Assembly Flow nodes, Silhouette c1, Logo |
| `--oe-color-primary-light` | Open Module satellites, Silhouette c4                      |
| `--oe-color-accent`        | Assembly Flow accent nodes, Silhouette c2                  |
| `--oe-color-success`       | Silhouette c5                                              |

---

## Verification Checklist

Before implementing any new UI, verify:

- [ ] Is it built from circles or circle derivatives?
- [ ] Does it express assembly (composed from parts)?
- [ ] Does it suggest openness (room for more)?
- [ ] Is it calm (no aggressive motion, no visual noise)?
- [ ] Does it create beauty through repetition?
- [ ] Is it accessible (recognition from form, not color alone)?

---

## References

- Design spec: `docs/superpowers/specs/2026-07-03-visual-dna-design.md`
- Design status: `openedu-way/DESIGN_STATUS.md`
- Design process: `openedu-way/DESIGN_PROCESS.md`
- Philosophy: `openedu-way/01-philosophy/`
- Design language: `openedu-way/02-design-language/`
