# Rewards & Cards Authoring

Open-Edu rewards and cards are optional files that recognize learner progress.

## Files

- `rewards.json` — triggers that award badges (or fire webhooks/scripts).
- `cards.json` — collectible card definitions with unlock conditions.

## rewards.json structure

```json
{
  "triggers": [
    {
      "onEvent": "step_completed",
      "rewards": [
        {
          "action": "badge.award",
          "badge": "first-step",
          "condition": { "type": "chain", "completedNodeIds": ["nodes/intro.md"] }
        }
      ]
    }
  ]
}
```

**Important:** `condition` belongs on the **reward/action**, not on the trigger.

## Reward actions

| Action        | Required field | Description                                          |
| ------------- | -------------- | ---------------------------------------------------- |
| `badge.award` | `badge`        | Award a named badge (e.g. `"first-step"`)            |
| `webhook`     | `url`          | POST the event payload to an HTTPS endpoint          |
| `script`      | `exec`         | Run a shell command (requires `--allow-shell-hooks`) |

## Condition types and scope

Conditions are evaluated against the broker's context. The module broker is fed per-node signals (`scores`, `skills`, `completedNodes`); the bundle broker is fed `completedModules` only.

| Condition         | Module scope | Bundle scope | Notes                                           |
| ----------------- | ------------ | ------------ | ----------------------------------------------- |
| `score`           | ✅           | ⚠️           | needs `scores` in context (module-only)         |
| `skill`           | ✅           | ⚠️           | needs `skills` in context (module-only)         |
| `chain`           | ✅           | ⚠️           | needs `completedNodes` in context (module-only) |
| `and` / `or`      | ✅           | ✅           | children must stay within the same scope        |
| `moduleCompleted` | ❌           | ✅           | bundle broker only                              |
| `bundleCompleted` | ❌           | ✅           | fires when ALL modules complete                 |

⚠️ A `score`/`skill`/`chain` condition in a bundle-scoped file is schema-valid but resolves to `false`, because the bundle broker never receives module-local signals.

## Placement decision tree

1. Reward tied to a step/exercise/score inside one module → **module-level** file in that module.
2. Reward tied to finishing a whole module → **bundle-level**, `condition: { "type": "moduleCompleted", "moduleId": "<module-id>" }`.
3. Reward tied to finishing all modules → **bundle-level**, `condition: { "type": "bundleCompleted" }`.

## Cards

```json
{
  "cards": [
    {
      "id": "bundle-finisher",
      "title": "Bundle Finisher",
      "category": "Milestones",
      "type": "achievement",
      "summary": "Completed every module in the bundle.",
      "level": 1,
      "maximumLevel": 1,
      "unlock": { "type": "bundleCompleted" }
    }
  ]
}
```

Required card fields: `id`, `title`, `category`, `type` (`knowledge` | `skill` | `achievement` | `exploration` | `mentor`), `summary`, `unlock`. `level` (default 1) must not exceed `maximumLevel` (default 1). `nextLevel` is optional and reuses the same condition types as `unlock`.

## Global card-ID uniqueness

Card IDs must be unique across the **entire bundle** (all module cards + bundle cards). Saved progress is keyed by bare `card.id`. Use a `module-` or `bundle-` prefix.

## Validation

```bash
node scripts/validate-rewards-cards.mjs ./my-package
node scripts/validate-rewards-cards.mjs ./my-bundle --scope bundle
```
