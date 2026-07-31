# Bundle Authoring

A **bundle** is a multi-module course. Use a bundle when content naturally splits into sequential or prerequisite-linked modules (e.g. level-based math).

## When to use a bundle vs a single package

- Single package: one lesson sequence, one workflow, no cross-module dependency.
- Bundle: 2+ modules with explicit `dependsOn` ordering, shared completion semantics, or cross-module rewards.

## Directory layout

```
my-bundle/
├── bundle.json
├── rewards.json        # optional — bundle-level rewards
├── cards.json          # optional — bundle-level cards
└── modules/
    ├── module-a/
    │   ├── package.json
    │   ├── workflow.json
    │   └── ...
    └── module-b/
```

## bundle.json contract

```json
{
  "id": "my-bundle",
  "title": "My Bundle",
  "description": "...",
  "version": "1.0.0",
  "modules": [
    { "id": "module-a", "title": "Module A", "dependsOn": [] },
    { "id": "module-b", "title": "Module B", "dependsOn": ["module-a"] }
  ],
  "rewards": "./rewards.json",
  "cards": "./cards.json"
}
```

- `dependsOn` values must reference module ids present in `modules`.
- `rewards`/`cards` are optional relative paths inside the bundle directory.
- **Never** place module-level rewards/cards at the bundle root, and never place bundle-level rewards/cards inside a module. See rewards-cards-authoring.md.

## Validation

```bash
edu validate ./my-bundle          # validates bundle.json + each module
node scripts/validate-rewards-cards.mjs ./my-bundle --scope bundle
```
