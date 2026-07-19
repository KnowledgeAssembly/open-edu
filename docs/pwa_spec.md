# OpenEdu PWA Implementation Specification

## Phase 0 — Offline-First Learner Platform

**Status:** Approved Architecture
**Version:** 2.0
**Technology Stack:** React + Vite + vite-plugin-pwa
**Priority:** Critical Foundation

---

# 1. Purpose

This specification defines the Progressive Web App (PWA) architecture for OpenEdu.

The PWA serves as the primary application platform during Phase 0 and Phase 1 and must provide:

- Offline-first learning
- Installable app experience
- Cross-platform support
- Low-bandwidth operation
- School-friendly deployment
- Future compatibility with Capacitor and Tauri

The OpenEdu PWA should function as a complete learning application rather than a traditional website.

---

# 2. Strategic Goals

The OpenEdu PWA must enable a learner to:

1. Open OpenEdu.
2. Install it on their device.
3. Download a course.
4. Disconnect from the internet.
5. Continue learning offline.
6. Save progress locally.
7. Resume learning later.

without requiring a native mobile or desktop application.

---

# 3. Scope

## Included

- PWA infrastructure
- Offline course consumption
- Offline progress storage
- Offline search
- Installability
- Update management
- Course downloads
- Accessibility support
- Internationalization integration

---

## Excluded

Phase 0 does NOT include:

- Native Android application
- Native iOS application
- Electron application
- Tauri application
- Push notifications
- Background downloads
- Cloud synchronization
- Real-time collaboration

These belong to future roadmap phases.

---

# 4. Technology Stack

## Core

```text
React
TypeScript
Vite
```

---

## PWA Layer

```text
vite-plugin-pwa
Workbox
```

---

## Storage

### Phase 0

```text
IndexedDB
```

---

### Future

```text
OPFS
```

for large educational assets.

---

## Search

Recommended:

```text
MiniSearch
```

or

```text
FlexSearch
```

with IndexedDB persistence.

---

## State Management

Project choice:

```text
Zustand
```

or equivalent lightweight solution.

---

# 5. Monorepo Structure

```text
apps/
├── learner
├── authoring
└── docs

packages/
├── course-runtime
├── widgets
├── search
├── storage
├── i18n
├── design-system
├── pwa-core
└── shared
```

---

# 6. PWA Core Package

Create:

```text
packages/pwa-core
```

Purpose:

Reusable PWA infrastructure shared by:

- Learner App
- Authoring Studio
- Future Mobile Apps
- Future Desktop Apps

---

## Responsibilities

### Install Management

```text
Install Prompt
Install State
Install Detection
```

---

### Update Management

```text
Version Detection
Update Notification
Cache Refresh
```

---

### Connectivity

```text
Online Detection
Offline Detection
Reconnect Events
```

---

### Storage Utilities

```text
Storage Usage
Quota Monitoring
Cleanup Tools
```

---

# 7. Platform Targets

## Browsers

- Chrome
- Edge
- Firefox
- Safari

---

## Devices

### Mobile

- Android phones
- Android tablets

### Desktop

- Windows
- Linux
- macOS
- ChromeOS

---

# 8. Performance Targets

## First Load

Target:

```text
< 3 seconds
```

---

## Cached Load

Target:

```text
< 1 second
```

---

## Offline Startup

Target:

```text
< 2 seconds
```

---

## Lighthouse

Target:

```text
Performance ≥ 90
Accessibility ≥ 95
Best Practices ≥ 95
PWA ≥ 95
```

---

# 9. PWA Plugin Configuration

Use:

```text
vite-plugin-pwa
```

---

Required configuration:

```ts
VitePWA({
  registerType: 'autoUpdate',
  injectRegister: 'auto',
});
```

---

Requirements:

- Automatic service worker registration
- Automatic update detection
- Manual update confirmation
- Offline support

---

# 10. Web App Manifest

Create:

```text
apps/learner/public/manifest.webmanifest
```

---

Required fields:

```json
{
  "name": "OpenEdu",
  "short_name": "OpenEdu",
  "display": "standalone",
  "orientation": "portrait",
  "start_url": "/",
  "theme_color": "#F5F3EE",
  "background_color": "#F5F3EE"
}
```

---

Requirements:

- 192x192 icon
- 512x512 icon
- Maskable icon
- Standalone mode

---

# 11. Service Worker Architecture

The service worker is responsible only for application infrastructure.

It must NOT become the primary storage layer.

---

## Responsibilities

### Asset Caching

Cache:

```text
JS
CSS
Fonts
Icons
Manifest
```

---

### Runtime Caching

Cache:

```text
API Responses
Metadata
Course Catalog
```

where appropriate.

---

### Offline Routing

Serve cached application shell.

---

# 12. Caching Strategy

## Application Shell

Strategy:

```text
Cache First
```

Assets:

- JS
- CSS
- Fonts
- Icons

---

## API Calls

Strategy:

```text
Network First
```

Fallback to cache.

---

## Metadata

Strategy:

```text
Stale While Revalidate
```

Examples:

- Course listings
- Catalog metadata

---

# 13. Storage Architecture

## Principle

Course content must NOT be stored in Service Worker cache.

Use:

```text
IndexedDB
```

instead.

---

# 14. IndexedDB Storage

Create:

```text
packages/storage
```

---

Stores:

### Course Packages

```ts
interface StoredCourse {
  id: string;
  version: string;
  manifest: object;
  downloadedAt: string;
}
```

---

### Progress

```ts
interface LearningProgress {
  courseId: string;
  lessonId: string;
  completed: boolean;
  score?: number;
  updatedAt: string;
}
```

---

### Search Indexes

```ts
interface SearchIndex {
  locale: string;
  indexData: object;
}
```

---

### User Preferences

```ts
interface UserPreferences {
  locale: string;
  theme: string;
}
```

---

# 15. Course Download System

Users must explicitly download courses.

---

Download package includes:

```text
Lessons
Images
Widgets
Assessments
Metadata
```

---

Future:

```text
Audio
Video
Interactive Simulations
```

---

# 16. Offline Learning

The learner must be able to:

```text
Open Course
Navigate Lessons
Complete Activities
Take Quizzes
Review Content
```

without connectivity.

---

# 17. Offline Progress

Requirements:

### Immediate Save

Every progress event should be persisted immediately.

---

### Crash Recovery

Progress survives:

- Browser restart
- Device restart
- Unexpected shutdown

---

### Offline Operation

No network dependency.

---

# 18. Search Architecture

Search must function fully offline.

---

Search Scope

```text
Courses
Lessons
Glossary
Definitions
Assessments
```

---

Requirements

- Local index
- Locale-aware search
- Incremental updates

---

# 19. Internationalization Integration

The PWA must integrate with OpenEdu i18n infrastructure.

---

Support:

```text
Locale Switching
Localized UI
Localized Search
Localized Formatting
```

---

Requirements

Language changes must work:

```text
Without Reloading
```

---

# 20. Accessibility Requirements

Support:

### Keyboard Navigation

Complete functionality without mouse.

---

### Screen Readers

Proper semantic markup.

---

### Reduced Motion

Respect:

```css
prefers-reduced-motion
```

---

### Focus Management

Visible focus states required.

---

# 21. Storage Management UI

Users must be able to see:

```text
Downloaded Courses
Storage Usage
Available Space
```

---

Users must be able to:

```text
Delete Course
Clear Downloads
Manage Storage
```

---

# 22. Update System

Application updates should never interrupt learning.

---

Flow:

```text
New Version Available
        ↓
User Notification
        ↓
User Accepts Update
        ↓
Refresh Application
```

---

Requirements:

- No forced reloads
- No lost progress
- Graceful upgrades

---

# 23. Security Requirements

## HTTPS

Required.

---

## Local Data

Do not store:

```text
Authentication Secrets
API Tokens
Sensitive Credentials
```

inside course packages.

---

## Future

Support:

```text
Package Signatures
Checksum Validation
```

for trusted educational content.

---

# 24. Analytics

Phase 0:

Optional.

---

Requirements:

If enabled:

- Privacy first
- Offline capable
- Explicit user consent

---

# 25. Future Migration Path

The architecture must support migration to:

---

## Mobile

```text
React
     ↓
Capacitor
     ↓
Android / iOS
```

without rewriting business logic.

---

## Desktop

```text
React
     ↓
Tauri
     ↓
Windows / Linux / macOS
```

without rewriting business logic.

---

# 26. Developer Tooling

Required commands:

```bash
pnpm dev
pnpm build
pnpm preview
```

---

Recommended:

```bash
pnpm pwa:analyze
pnpm offline:test
```

---

# 27. Acceptance Criteria

## Installability

- Installs on Android
- Installs on Desktop

---

## Offline Learning

- Downloaded courses open offline
- Widgets function offline
- Search functions offline

---

## Progress

- Progress saved locally
- Progress survives browser restart

---

## Accessibility

- Keyboard navigation verified
- Screen reader support verified

---

## Internationalization

- Locale switching works
- Localized content supported

---

## Performance

Meets target performance metrics.

---

## Future Compatibility

Ready for:

- Capacitor
- Tauri
- OPFS migration

without architectural changes.

---

# 28. Success Definition

OpenEdu succeeds when a learner with a low-cost Android phone, unreliable internet connection, and no technical knowledge can:

1. Install OpenEdu.
2. Download a course.
3. Learn entirely offline.
4. Save progress automatically.
5. Resume learning at any time.

The PWA should remain the primary OpenEdu application platform until there is proven demand for dedicated mobile or desktop applications.
