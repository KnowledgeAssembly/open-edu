---
sidebar_position: 12
---

# Dev Server (`@open-edu/dev-server`)

The dev server is a Vite-based development environment with hot reload, runtime mounting, and three built-in inspector panels for debugging accessibility, telemetry, and rewards.

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
- **Inspector panels** — Debug accessibility, telemetry, and rewards in real time

## Inspector Panels

### Accessibility Inspector

Displays axe-core violation reports for the current page, including impact level, description, and element selector. Helps identify and fix accessibility issues during development.

### Telemetry Inspector

Shows a live stream of telemetry events as they fire — node opens, completions, quiz answers, and widget interactions. Each event shows its type, timestamp, and payload.

### Rewards Inspector

Displays reward configuration for the loaded package and tracks reward receipt status as events trigger. Shows which conditions were evaluated and whether rewards were delivered, skipped, or failed.

## How It Works

The dev server wraps the `@open-edu/runtime` embed adapter in a Vite application with the inspector panels overlaid. When a package directory is provided, it loads the package via `loadPackage()`, sets up a `WorkflowEngine` and `RewardBroker`, and renders the runtime inside a `LayoutShell` with the sidebar.

The inspector panels read from the same contexts — `AxesValidator` for a11y, `TelemetrySession.events$` for telemetry, and `RewardBroker` status for rewards.

### Tailwind CSS

The dev-server **does not** run PostCSS. It imports a pre-generated CSS file (`src/tailwind.css`) that contains all Tailwind utility classes mapped to `--oe-*` CSS variables. When you add or change Tailwind classes in runtime components, regenerate this file:

```bash
pnpm --filter @open-edu/dev-server exec tailwindcss -c tailwind.config.js -i src/index.css -o src/tailwind.css
```

The dev-server's `tailwind.config.js` maps the same `--oe-*` theme tokens as the learner app's `tailwind.config.ts` — colors, spacing, border radii, and font families.
