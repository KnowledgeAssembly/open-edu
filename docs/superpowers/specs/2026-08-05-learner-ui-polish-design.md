# Learner UI Polish Design

**Date:** 2026-08-05  
**Status:** Approved  
**Scope:** `apps/learner` plus targeted design-system changes for AppSidebar hover and CourseCard title badge

## Summary

Four learner-app UI fixes:

1. Hide the Pipili FAB when the right sidebar is open on every view.
2. Keep AI companion suggested questions available after first use, placed above the chat composer next to Retry.
3. Default the left nav to collapsed; on desktop hover, temporarily slide it open; on touch, keep the existing toggle.
4. Render catalog bundle entries with the same `CourseCard` as single courses (plus a “Bundle” title badge), and remove orbit (`OpenModule`) icons from catalog cards.

## Motivation

- The FAB overlaps the open Pipili/notepad sidebar on non-course views.
- Suggested prompts disappear after the first message, so learners lose a useful re-entry path.
- An always-open left rail reduces content space; hover expand keeps icons available without pinning the rail open.
- Bundle cards look and read differently from course cards (description, chrome, orbit indicators); catalog should feel consistent.

## Decisions (locked)

| Topic                | Decision                                                                                     |
| -------------------- | -------------------------------------------------------------------------------------------- |
| Catalog card content | Same details as single-course `CourseCard`; add “Bundle” badge next to title; no description |
| Left nav hover       | Temporary expand on hover; collapse again on mouse leave                                     |
| Left nav touch       | Existing collapse/expand toggle only; hover expand is desktop / fine-pointer only            |
| Suggested questions  | Always available after use; composer strip above input, beside Retry                         |
| FAB visibility       | Hidden whenever right sidebar `panelState !== 'closed'`, all views                           |

## Architecture

### 1. Pipili FAB vs right sidebar

**Today:** `CompanionFloatingUI` in `apps/learner/src/AppShell.tsx` sets:

```ts
visible={isCourseView ? !isOpen : true}
```

So the FAB stays visible on non-course pages while `CourseRightSidebar` is open.

**Target:**

```ts
visible={!isOpen}
```

`isOpen` continues to mean `panelState !== 'closed'`. Click-to-toggle, unread, and reward indicators are unchanged.

**Files:** `apps/learner/src/AppShell.tsx`, related AppShell / Pipili tests.

### 2. Suggested questions persistence + placement

**Today:**

- `CourseRightSidebar` and `CompanionPanel` pass suggestions only when message history is empty.
- `PipiliChat` renders `SuggestedQuestions` inside the message scroll area and further gates on empty history / not streaming.

**Target:**

- Always pass the four suggested questions and select handler from sidebar/panel parents.
- In `PipiliChat`, move `SuggestedQuestions` into the composer control region **above** the textarea.
- Share that region with Retry (and Stop while streaming).
- Hide suggestions while streaming to avoid double-send; show them again when idle.
- Do **not** gate on `messages.length === 0`.

**Layout:**

```
[ message list ]

[ Retry | Stop ]          ← existing control row when applicable
[ Suggested questions ]

[ Ask a question… textarea ] [ Send ]
```

**Files:** `apps/learner/src/ai/PipiliChat.tsx`, `apps/learner/src/CourseRightSidebar.tsx`, `apps/learner/src/ai/CompanionPanel.tsx`, PipiliChat / sidebar tests.

### 3. Left nav default collapsed + hover expand

**Today:**

- Course shell: `sidebarCollapsed = useState(false)` (open by default).
- Non-course `AppSidebar`: no `defaultCollapsed` → open (`defaultCollapsed = false`).
- Collapse is toggle-only.

**Target:**

1. Default collapsed in both shells (`true` / `defaultCollapsed`).
2. In `AppSidebar` (`packages/design-system/src/patterns/AppSidebar.tsx`):
   - When pinned collapsed and fine-pointer desktop: `mouseenter` temporarily expands (labels/width); `mouseleave` returns to collapsed.
   - Temporary hover expansion must **not** call `onCollapseChange` or flip pinned collapsed state.
   - Disable hover expand when `(hover: hover) and (pointer: fine)` is false (touch / coarse pointer).
3. Existing footer toggle remains the pinned open/close control (required for touch).

**Effective open state:** `!collapsed || hoverExpanded` (hover only when pinned collapsed and fine pointer).

**Files:** `packages/design-system/src/patterns/AppSidebar.tsx` (+ tests), `apps/learner/src/AppShell.tsx` (+ tests).

### 4. Catalog: CourseCard for bundles, remove orbit icons

**Today:**

- Bundles: `BundleCard` + description + Bundle badge, wrapped in `BundleCardWithModule` (`OpenModule`).
- Courses: `CourseCard` wrapped in `CourseCardWithModule` (`OpenModule`).

**Target:**

1. Catalog bundle rows use `CourseCard` with the same visual fields as single courses. Map at the call site:
   - `manifest`: `{ id, title, version, author: bundle.manifest.author ?? '', entry: '', tags?, image? }` (or equivalent BundleSummary fields)
   - `nodeCount`: `bundle.totalNodeCount` (same role as lesson count on course cards)
   - `badgeCount` / `earnedBadgeCount`: use available bundle badge data when present, otherwise `0`
   - `progress`: derive a course-like snapshot from `bundleProgress` when started (visited/completed modules → progress bar), else `null`
   - `onStart`: existing `onStartBundle`
2. Extend `CourseCard` with optional `badgeLabel?: string` (preferred over free-form ReactNode for i18n). Bundles pass the translated “Bundle” string; single courses omit it. Render the badge inline next to the title.
3. No description on catalog cards (`CourseCard` already has none).
4. Stop wrapping catalog cards in `CourseCardWithModule` / `BundleCardWithModule` (removes orbit icons). Keep installed badge, reset, and delete overlays as today.
5. Leave `BundleCard` / `*WithModule` components in the design system for other callers/stories; catalog no longer depends on them for the main grid.

**Files:** `packages/design-system/src/learning/CourseCard.tsx` (+ tests), `apps/learner/src/CatalogPage.tsx` (+ tests). Possibly i18n key for “Bundle” if not already present.

## Testing

| Area                | Coverage                                                                                                                                           |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| FAB                 | Hidden when sidebar open; visible when closed (course and non-course)                                                                              |
| Suggested questions | Visible with empty and non-empty history; clickable after use; hidden while streaming                                                              |
| AppSidebar          | Defaults collapsed; hover expands then collapses on leave; toggle pins; no hover expand on coarse pointer                                          |
| Catalog             | Bundles render `course-card` with Bundle title badge; no description; no OpenModule; single-course content unchanged aside from missing orbit icon |

## Out of scope

- Deleting `BundleCard` / `CourseCardWithModule` / `BundleCardWithModule` from the design system
- Redesigning CourseCard chrome beyond optional title badge and catalog wiring
- Changing Pipili chat backend / suggestion copy
- Mobile drawer navigation patterns beyond keeping the existing toggle

## Implementation order

1. FAB visibility (smallest, isolated)
2. Suggested questions persistence + placement
3. Left nav default + hover
4. Catalog CourseCard unification + remove orbit wrappers
