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
          "spec": {
            "badgeId": "first-step",
            "title": "First Step",
            "description": "You took your first step."
          },
          "condition": { "type": "stepCompleted", "stepId": "intro" }
        }
      ]
    }
  ]
}
```

**Important:** `condition` belongs on the **reward/action**, not on the trigger.

## Condition types and scope

| Condition           | Module scope | Bundle scope | Notes                                                           |
| ------------------- | ------------ | ------------ | --------------------------------------------------------------- |
| `stepCompleted`     | ✅           | ❌           | module-local                                                    |
| `exerciseCompleted` | ✅           | ❌           | module-local                                                    |
| `activityCompleted` | ✅           | ❌           | module-local                                                    |
| `score`             | ✅           | ❌           | module-local                                                    |
| `chain`             | ✅           | ❌           | module-local                                                    |
| `attempts`          | ✅           | ❌           | module-local                                                    |
| `answeredCorrectly` | ✅           | ❌           | module-local                                                    |
| `moduleUnlocked`    | ✅           | ❌           | module-local                                                    |
| `moduleFailed`      | ✅           | ❌           | module-local                                                    |
| `moduleCompleted`   | ❌           | ✅           | bundle broker only                                              |
| `bundleCompleted`   | ❌           | ✅           | fires when ALL modules complete                                 |
| `skill`             | ❌           | ✅           | cross-module                                                    |
| `and` / `or`        | ⚠️           | ✅           | children must stay within the same scope                        |
| `bundleCondition`   | ❌           | ✅           | single-module condition evaluated against the completing module |

## Placement decision tree

1. Reward tied to a step/exercise/score inside one module → **module-level** file in that module.
2. Reward tied to finishing a whole module → **module-level**, `condition: { "type": "moduleCompleted" }` in that module's rewards (module brokers support this today).
3. Reward tied to finishing all modules or cross-module milestones → **bundle-level**, `bundleCompleted`/`moduleCompleted`/`skill`.

## Global card-ID uniqueness

Card IDs must be unique across the **entire bundle** (all module cards + bundle cards). Saved progress is keyed by bare `card.id`. Use a `module-` or `bundle-` prefix.

## Validation

```bash
node scripts/validate-rewards-cards.mjs ./my-package
node scripts/validate-rewards-cards.mjs ./my-bundle --scope bundle
```
