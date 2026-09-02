---
sidebar_position: 12
---

# Dev Server (`@open-edu/dev-server`)

The `@open-edu/dev-server` package powers the [**OpenEdu Course Creator Studio**](./course-creator-studio). It is a Vite-based development environment with hot reload, runtime mounting, and a single unified Studio shell. There is no mode toggle — the file editors and inspector panels live inside the Studio (Files tab and Preview DevTools drawer).

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
- **Runtime mounting** — Automatically loads and renders any educational package
- **Unified Studio shell** — Home · Library · Outline | Files · Preview · Share (see [Course Creator Studio](./course-creator-studio))
- **Preview DevTools drawer** — Telemetry / Logs / Rewards / A11y / Bundle inspectors in a collapsed bottom drawer on the Preview page

## Bundle Support

Bundle authoring and preview are **not supported** in the Studio today: opening a bundle shows an unsupported empty state. The **Bundle** inspector tab renders only when bundle data is actually present. Multi-module bundles remain a learner-app and CLI concern.

## Inspector Panels

The inspectors live in the Preview **DevTools drawer** (bottom, collapsed by default) rather than a fixed right rail:

### Accessibility Inspector

Displays axe-core violation reports for the current page, including impact level, description, and element selector.

### Telemetry Inspector

Shows a live stream of telemetry events — node opens, completions, quiz answers, widget interactions, and bundle module events — for the current Preview visit. Each event shows its type, timestamp, and payload.

### Logs Inspector

Shows the process-wide log sink output in real time.

### Rewards Inspector

Displays reward configuration for the loaded package and tracks reward receipt status as events trigger.

### Bundle Inspector

When bundle data is present, a **Bundle** tab lists modules with their IDs, dependency chains, and current status (`locked` / `unlocked` / `in_progress` / `completed`).

## How It Works

The dev server wraps the `@open-edu/runtime` embed adapter in a Vite application. When a package directory is provided, it loads the package via `loadPackage()`, sets up a `WorkflowEngine` and `RewardBroker`, and renders the runtime inside the Studio shell.

The inspector panels read from the same contexts — `AxesValidator` for a11y, `TelemetrySession.events$` for telemetry, the memory log sink for logs, and `RewardBroker` status for rewards.

The Studio adds a `StudioAPI` façade (`apps/dev-server/src/studio/studioApi.ts`) over Vite middleware (`/api/package/*` for files, tree, outline, validate, assets, and `.oep` export; `/api/studio/*` for AI generation, the course library, and units). A browser variant (`BrowserStudioApi`) maps the same surface onto the OPFS workspace. See [Course Creator Studio](./course-creator-studio) for the product view.

### Tailwind CSS

The dev-server **does not** run PostCSS. It imports a pre-generated CSS file (`src/tailwind.css`) that contains all Tailwind utility classes mapped to `--oe-*` CSS variables. When you add or change Tailwind classes in runtime components, regenerate this file:

```bash
pnpm --filter @open-edu/dev-server exec tailwindcss -c tailwind.config.js -i src/index.css -o src/tailwind.css
```

The dev-server's `tailwind.config.js` maps the same `--oe-*` theme tokens as the learner app's `tailwind.config.ts` — colors, spacing, border radii, and font families.
