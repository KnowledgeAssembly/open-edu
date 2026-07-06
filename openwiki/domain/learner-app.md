# Learner App

`apps/learner` is the main end-user application in the repository. It composes the runtime, design system, core loaders, workflow logic, and local persistence helpers into a course browsing and learning experience.

## What it contains

The learner app includes these top-level screens and flows:

- home
- course catalog
- active course runtime
- progress dashboard
- settings / theme selection
- bundle overview
- collection binder for Knowledge Cards

`AppShell.tsx` is the central router/controller. `App.tsx` reconstructs bundle data from the virtual generated dataset and passes it into the shell.

## Main user flows

### Catalog and start actions

`CatalogPage.tsx` uses:

- `@open-edu/runtime` course card surfaces
- `@open-edu/design-system` bundle and progress cards
- local progress and badge storage to show continue-learning information

This page is the primary discovery surface for both simple courses and multi-module bundles.

### Course runtime

`CourseRuntime.tsx` is the most important learner file. It wires together:

- `RuntimeProvider` and `LayoutShell`
- `WorkflowEngine` for progression
- `TelemetrySession` for event capture
- `AccessibilityProvider`
- `RewardBroker` for badge delivery
- `CardBroker` for Knowledge Card unlocks/level-ups
- widget registry setup from `@open-edu/widgets`
- local progress, bundle progress, badge, and card storage

This file is the best starting point when changing how a learner enters, advances through, or exits a course.

### Progress dashboard

`ProgressDashboard.tsx` summarizes:

- completed courses
- in-progress courses
- earned badges
- last studied node
- progress percentage

It derives much of this from local storage and package metadata.

### Collection binder

`CollectionBinderPage.tsx` groups Knowledge Cards by category and renders them through runtime card-grid/viewer components. This is the user-facing home for card collection, not a generic UI gallery.

### Settings and theme switching

`SettingsPage.tsx` connects the learner app to the runtime theme preference system. The selected theme is persisted through `useThemePreference`.

## Important implementation details

- The app uses `virtual:edu-data` to receive generated package and bundle catalogs.
- Learner pages are mostly composition layers over runtime/design-system components, not independent UI systems.
- Local persistence is handled by small storage modules for progress, badges, cards, and bundle snapshots.
- Exit-warning behavior exists because a running course needs protection against accidental navigation loss.

## Useful source references

- `apps/learner/src/App.tsx`
- `apps/learner/src/AppShell.tsx`
- `apps/learner/src/CatalogPage.tsx`
- `apps/learner/src/CourseRuntime.tsx`
- `apps/learner/src/ProgressDashboard.tsx`
- `apps/learner/src/CollectionBinderPage.tsx`
- `apps/learner/src/SettingsPage.tsx`

## What to watch out for

- Bundle module navigation and plain course navigation are not the same path.
- Course runtime state is coupled to local storage, telemetry, reward delivery, and card unlocks.
- Many learner screens depend on runtime and design-system exports; changing those exports can affect the app widely.
