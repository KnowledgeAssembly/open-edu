---
sidebar_position: 12
---

# Dev Server (`@open-edu/dev-server`)

The `@open-edu/dev-server` package powers the [**OpenEdu Course Creator Studio**](./course-creator-studio). It is a Vite-based development environment with hot reload, runtime mounting, and inspector panels for debugging accessibility, telemetry, and rewards. In the Studio these tools live in **Developer mode**; Creator mode (default) hides them behind the teacher-facing authoring UI.

## Quick Start

```bash
# Start the dev server with the default example package
pnpm --filter @open-edu/dev-server dev
```

Or via the CLI:

```bash
edu dev ./my-package
```

## Features

- **Hot reload** — Markdown and JSON changes reflect instantly without full page reload
- **Runtime mounting** — Automatically loads and renders any educational package or bundle
- **Inspector panels** — Debug accessibility, telemetry, rewards, and bundles in real time
- **Creator/Developer modes** — Creator mode (default) is the teacher authoring UI; Developer mode restores the file editors and inspectors below

## Multi-Module Bundle Mode

The dev-server automatically detects bundle projects by checking for `bundle.json` (when no `package.json` is found). In bundle mode:

- A **"Bundle Mode"** badge is shown
- A **module selector dropdown** lets you switch between modules
- A **"Bundle Overview"** button renders the `BundleOverview` component
- Telemetry events are tagged with `bundleId` and `moduleId` for correlation
- Hot reload works across all module files

You can also set the `OPEN_EDU_BUNDLE_DIR` environment variable for explicit bundle detection.

## Inspector Panels

### Accessibility Inspector

Displays axe-core violation reports for the current page, including impact level, description, and element selector. Helps identify and fix accessibility issues during development.

### Telemetry Inspector

Shows a live stream of telemetry events as they fire — node opens, completions, quiz answers, widget interactions, and bundle module events. Each event shows its type, timestamp, and payload.

### Rewards Inspector

Displays reward configuration for the loaded package and tracks reward receipt status as events trigger. Shows which conditions were evaluated and whether rewards were delivered, skipped, or failed.

### Bundle Inspector

When running in bundle mode, a **Bundle** tab lists all modules with their IDs, dependency chains, and current status (`locked` / `unlocked` / `in_progress` / `completed`). Helps debug prerequisite logic and module transitions.

## How It Works

The dev server wraps the `@open-edu/runtime` embed adapter in a Vite application with the inspector panels overlaid. When a package directory is provided, it loads the package via `loadPackage()`, sets up a `WorkflowEngine` and `RewardBroker`, and renders the runtime inside a `LayoutShell` with the sidebar.

The inspector panels read from the same contexts — `AxesValidator` for a11y, `TelemetrySession.events$` for telemetry, and `RewardBroker` status for rewards.

The Studio adds a `StudioAPI` façade (`apps/dev-server/src/studio/studioApi.ts`) over Vite middleware (`/api/package/*` for files, outline, validate, assets, and `.oep` export; `/api/studio/*` for AI generation, the course library, and units). See [Course Creator Studio](./course-creator-studio) for the product view.

### Tailwind CSS

The dev-server **does not** run PostCSS. It imports a pre-generated CSS file (`src/tailwind.css`) that contains all Tailwind utility classes mapped to `--oe-*` CSS variables. When you add or change Tailwind classes in runtime components, regenerate this file:

```bash
pnpm --filter @open-edu/dev-server exec tailwindcss -c tailwind.config.js -i src/index.css -o src/tailwind.css
```

The dev-server's `tailwind.config.js` maps the same `--oe-*` theme tokens as the learner app's `tailwind.config.ts` — colors, spacing, border radii, and font families.
