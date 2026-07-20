---
sidebar_position: 15
---

# PWA Core

The **pwa-core** package (`@open-edu/pwa-core`) provides platform-level PWA infrastructure: install prompts, update detection, connectivity monitoring, and storage quota queries. It is designed to be consumed by any Open-Edu app (learner, authoring studio, future mobile/desktop apps).

## Quick Start

```ts
import {
  getInstallState,
  promptInstall,
  registerUpdateListener,
  getOnlineStatus,
  onOnlineStatusChange,
  getStorageUsage,
} from '@open-edu/pwa-core';

// Check if app is installable
const { isInstallable, isInstalled, platform } = getInstallState();

// Prompt user to install
const { outcome } = await promptInstall();

// Listen for updates
const unsubscribe = await registerUpdateListener((state) => {
  if (state.updateAvailable) {
    console.log('New version available');
  }
});

// Monitor connectivity
const isOnline = getOnlineStatus();
const unsub = onOnlineStatusChange((online) => {
  console.log(online ? 'Back online' : 'Gone offline');
});

// Check storage usage
const { usage, quota, percentage } = await getStorageUsage();
```

## API Reference

### Install Management

#### `getInstallState(): InstallState`

Returns the current install state.

```ts
interface InstallState {
  isInstallable: boolean; // beforeinstallprompt received
  isInstalled: boolean; // running in standalone/fullscreen mode
  platform: 'android' | 'ios' | 'desktop' | 'unknown';
}
```

#### `promptInstall(): Promise<{ outcome: 'accepted' | 'dismissed' }>`

Triggers the browser's native install prompt. Returns the user's choice.

### Update Management

#### `registerUpdateListener(callback): Promise<() => void>`

Listens for service worker updates. Calls `callback` with `UpdateState` when a new version is detected. Returns an unsubscribe function.

```ts
interface UpdateState {
  updateAvailable: boolean;
  registration: ServiceWorkerRegistration | null;
}
```

#### `getUpdateState(): UpdateState`

Returns the current update state (polling alternative to listener).

#### `skipWaiting(): Promise<void>`

Tells the waiting service worker to activate immediately.

### Connectivity

#### `getOnlineStatus(): boolean`

Returns `navigator.onLine`.

#### `onOnlineStatusChange(callback): () => void`

Listens for online/offline events. Returns an unsubscribe function.

### Storage

#### `getStorageUsage(): Promise<StorageUsage>`

Returns storage quota information via the Storage Manager API.

```ts
interface StorageUsage {
  usage: number; // bytes used
  quota: number; // bytes available
  percentage: number; // usage / quota (0-1)
}
```

## Architecture

`@open-edu/pwa-core` is framework-agnostic — it exports plain functions, not React components. App-specific wrappers (hooks, UI components) live in the consuming app:

| Concern                  | pwa-core (this package)    | App layer (learner)                                   |
| ------------------------ | -------------------------- | ----------------------------------------------------- |
| Install prompt detection | `getInstallState()`        | `useInstallPrompt` hook + `InstallPrompt` component   |
| Update detection         | `registerUpdateListener()` | `useUpdatePrompt` hook + `UpdatePrompt` component     |
| Online status            | `getOnlineStatus()`        | `useOnlineStatus` hook + `OfflineBanner` component    |
| Storage quota            | `getStorageUsage()`        | `useStorageUsage` hook + `StorageUsageCard` component |

## Dependencies

None — framework-agnostic, zero runtime dependencies.

## Tests

```bash
pnpm --filter @open-edu/pwa-core test
```
