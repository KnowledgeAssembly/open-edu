---
type: Domain Guide
title: Learner App
description: Canonical guide to the learner application screens, runtime composition, AI companion integration, SVG-backed widget surfaces, and break reminder flow in apps/learner.
tags: [openwiki, domain, learner, app]
---

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
- AI companion surfaces embedded in course pages
- break reminder flow with a dedicated break page
- Progressive Web App with offline-first support (service worker, IndexedDB storage, install prompt, update detection, offline banner, storage management)

`AppShell.tsx` is the central router/controller. `App.tsx` reconstructs bundle data from the virtual generated dataset and passes it into the shell. The shell also wires in the AI companion panel, the text-selection toolbar, the double-tap word lookup handler, and the break reminder banner/page navigation.

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

`SettingsPage.tsx` connects the learner app to the runtime theme preference system. The selected theme is persisted through `useThemePreference`. The settings page also includes a `LanguageSwitcher` component from `@open-edu/i18n` for locale selection, and all section headings use translated strings via `useTranslation()`.

### AI companion and word lookup

The learner app embeds the AI companion through `apps/learner/src/ai/`. `AIProviderImpl.ts` sends prompts to a backend LLM proxy instead of talking directly to a model provider from the browser. It reads the proxy URL from `VITE_LLM_PROXY_URL` when available and otherwise falls back to `/api/llm/chat`. The same app also consumes widget surfaces that can include SVG explorer content from `packages/widgets`.

The AI companion services are provided by `@open-edu/ai-companion`; the service architecture and search/dictionary layering are documented in the [AI Companion domain doc](ai-companion.md).

The same AI companion feature set now includes two page-level interaction surfaces:

- `TextSelectionToolbar` for selected text
- `WordTapHandler` for double-tap word lookup in course content

`WordTapHandler.tsx` looks up dictionary entries and suggestions, and it can hand off to the AI companion panel with a prompt like “Tell me more about …”. The handler is intentionally double-tap based so regular text selection remains usable alongside the popover experience.

### Break reminder flow

`BreakNagBar.tsx` renders a break reminder banner using the new `AppBanner` primitive from `packages/design-system`. The banner supports the `break` variant and presents actions to take a break or ignore the reminder.

`AppShell.tsx` routes `/break` to `BreakPage` and shows the break nag bar in the course shell when the timer indicates a reminder should be shown. The back-to-learning action dismisses the reminder timer state when the user returns to learning.

### PWA and offline support

The learner app is a full Progressive Web App. The PWA infrastructure spans two packages:

- `@open-edu/pwa-core` — framework-agnostic primitives (install, update, connectivity, storage info)
- `@open-edu/storage` — IndexedDB persistence with 6 typed stores (courses, progress, badges, cards, search-indexes, preferences)

React hooks in the learner app bridge these to the UI:

- `useInstallPrompt` — detects installability and triggers browser install prompt → `InstallPrompt` component on catalog page
- `useUpdatePrompt` — monitors service worker updates → `UpdatePrompt` notification in `AppShell`
- `useOnlineStatus` — wraps connectivity detection → `OfflineBanner` in `AppShell`
- `useStorageUsage` — queries storage quota → `StorageUsageCard` and `DownloadedCourseList` on settings page

The service worker is generated by `vite-plugin-pwa` with Workbox runtime caching (CacheFirst for assets, NetworkFirst for API, StaleWhileRevalidate for metadata). All persistence migrated from localStorage to IndexedDB.

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
- `apps/learner/src/pages/StorageSettingsPage.tsx`
- `apps/learner/src/components/InstallPrompt.tsx`
- `apps/learner/src/components/OfflineBanner.tsx`
- `apps/learner/src/components/DownloadedCourseList.tsx`
- `apps/learner/src/hooks/useInstallPrompt.ts`
- `apps/learner/src/hooks/useUpdatePrompt.ts`
- `apps/learner/src/ai/AIProviderImpl.ts`
- `apps/learner/src/ai/WordTapHandler.tsx`
- `apps/learner/src/BreakNagBar.tsx`
- `packages/design-system/src/primitives/app-banner.tsx`
- `packages/pwa-core/src/index.ts`
- `packages/storage/src/index.ts`

## What to watch out for

- Bundle module navigation and plain course navigation are not the same path.
- Course runtime state is coupled to local storage, telemetry, reward delivery, and card unlocks.
- Many learner screens depend on runtime and design-system exports; changing those exports can affect the app widely.
- The break reminder banner depends on the `AppBanner` primitive, so changing that primitive can affect the course shell and break page.
