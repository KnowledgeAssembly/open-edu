---
sidebar_position: 7
---

# Remote Widget Demo

**Demonstrates loading a widget from a remote URL at runtime via module federation.** The custom node references a `remoteWidget` manifest pointing to a served JavaScript bundle, which is fetched, integrity-checked, and registered on the fly.

:::tip
For new content, prefer community widgets via `widgetRef` with `source: 'registry'`. Community widgets provide stronger isolation (sandboxed iframe), mandatory integrity, version pinning, and host-controlled capabilities. See the [Community Widgets Developer Guide](../widgets/community-widgets) for details.
:::

**Workflow pattern:** Linear → COMPLETED
