---
sidebar_position: 10
---

# Reward Broker (`@open-edu/rewards`)

The reward broker consumes learning events and executes configured reward actions — badges, webhooks, or scripts — keeping incentives separate from content.

## RewardBroker

```typescript
import { RewardBroker } from '@open-edu/rewards';

const broker = new RewardBroker({
  rewards: {
    triggers: [
      {
        onEvent: 'node_complete',
        rewards: [{ action: 'badge.award', badge: 'quiz-master' }],
      },
    ],
  },
  source: telemetrySession.events$,
  onReceipt: (receipt) => {
    console.log(receipt.status, receipt.actionType);
  },
});

broker.start();
// ... later
broker.stop();
```

## Reward Actions

| Action        | Description                                                  |
| ------------- | ------------------------------------------------------------ |
| `badge.award` | Award a named badge to the learner                           |
| `webhook`     | Send a POST request with event payload to a URL              |
| `script`      | Execute a shell script (requires `--allow-shell-hooks` flag) |

### Badge Action

```typescript
{
  action: 'badge.award',
  badge: 'course-complete',       // Badge identifier (max 256 chars)
  condition: { /* optional */ },
}
```

### Webhook Action

```typescript
{
  action: 'webhook',
  url: 'https://example.com/hooks/reward',  // HTTPS endpoint
  condition: { /* optional */ },
}
```

### Script Action

```typescript
{
  action: 'script',
  exec: 'echo "Learner completed the course" >> /var/log/rewards.log',
  condition: { /* optional */ },
}
```

#### Bundle Conditions

For multi-module bundles, the rewards schema supports two additional event types:

| Event             | Description                                  |
| ----------------- | -------------------------------------------- |
| `moduleCompleted` | A single module within a bundle is completed |
| `bundleCompleted` | All modules in the bundle are completed      |

```typescript
{
  onEvent: 'module_complete',
  rewards: [
    {
      action: 'badge.award',
      badge: 'basics-master',
      condition: { type: 'moduleCompleted', moduleId: 'addition_basics' },
    },
  ],
}
```

```typescript
{
  onEvent: 'bundle_complete',
  rewards: [{ action: 'badge.award', badge: 'level-b-math-complete' }],
}
```

## Conditional Rules

Rewards can include a `condition` that gates their execution. The condition belongs on the **reward action**, not the trigger:

```typescript
{
  onEvent: 'node_complete',
  rewards: [
    {
      action: 'badge.award',
      badge: 'high-scorer',
      condition: { type: 'score', nodeId: 'nodes/quiz.json', minScore: 80 },
    },
  ],
}
```

Supported condition types:

| Type              | Description                                       |
| ----------------- | ------------------------------------------------- |
| `score`           | Minimum score on a specific node                  |
| `skill`           | Minimum mastery level for a skill                 |
| `chain`           | Set of completed node IDs (all must be completed) |
| `and`             | All sub-conditions must be met                    |
| `or`              | Any sub-condition must be met                     |
| `moduleCompleted` | A module is completed (bundle broker)             |
| `bundleCompleted` | All modules in the bundle are completed           |

## Verification & Replay

```typescript
import { verifyReceipt, replayRewards } from '@open-edu/rewards';

// Confirm a receipt matches the telemetry that triggered it
const valid = verifyReceipt(receipt, telemetryEvents);

// Re-dispatch rewards from telemetry (skips duplicates)
const result = await replayRewards(telemetryEvents, broker);
// result.delivered, result.skipped, result.failed
```

## Card Broker (CardBroker)

The `CardBroker` evaluates card unlock and level-up conditions against telemetry events, driving the Living Knowledge Cards recognition engine.

```typescript
import { CardBroker } from '@open-edu/rewards';
import type { CardDefinition } from '@open-edu/schemas';

const cards: CardDefinition[] = [
  {
    id: 'living-things',
    title: 'Living Things',
    category: 'Biology',
    type: 'knowledge',
    summary: 'Learn what makes something alive.',
    level: 1,
    maximumLevel: 2,
    unlock: { type: 'chain', completedNodeIds: ['nodes/guided-practice.json'] },
    nextLevel: { type: 'score', nodeId: 'nodes/mastery-check.json', minScore: 80 },
  },
];

const broker = new CardBroker({
  cards,
  source: telemetrySession.events$,
  initialLevels: { 'living-things': 1 }, // restore from localStorage
  onCardUnlocked: (card) => console.log(`Unlocked: ${card.title}`),
  onCardLeveledUp: (card, newLevel) => console.log(`Level ${newLevel}: ${card.title}`),
});

broker.start();
```

### Updating Context

The broker's context must be kept in sync with learner progress:

```typescript
broker.updateContext({
  scores: { 'nodes/mastery-check.json': 90 },
  completedNodes: ['nodes/guided-practice.json', 'nodes/mastery-check.json'],
});
```

### Card Progress API

| Method                    | Description                                        |
| ------------------------- | -------------------------------------------------- |
| `getCardLevel(cardId)`    | Returns current level (0 if not unlocked)          |
| `getUnlockedCards()`      | Returns `Map<string, number>` of unlocked card IDs |
| `setCardLevel(cardId, n)` | Manually set/clear a card's level (clamped to max) |
| `updateContext(snapshot)` | Merge partial progress into the evaluation context |

### Cards JSON Format

Cards are defined in `cards.json` using the same object-wrapper format as rewards:

```json
{
  "cards": [
    {
      "id": "living-things",
      "title": "Living Things",
      "category": "Biology",
      "type": "knowledge",
      "summary": "Learn what makes something alive.",
      "level": 1,
      "maximumLevel": 2,
      "unlock": { "type": "chain", "completedNodeIds": ["nodes/guided-practice.json"] },
      "nextLevel": { "type": "score", "nodeId": "nodes/mastery-check.json", "minScore": 80 }
    }
  ]
}
```

### Card Fields

| Field                 | Type              | Required | Description                              |
| --------------------- | ----------------- | -------- | ---------------------------------------- |
| `id`                  | `string`          | yes      | Unique card identifier                   |
| `title`               | `string`          | yes      | Display name                             |
| `category`            | `string`          | yes      | Category grouping (e.g. "Biology")       |
| `type`                | `CardType`        | yes      | Enum: knowledge, skill, achievement, ... |
| `summary`             | `string`          | yes      | Short description                        |
| `unlock`              | `RewardCondition` | yes      | Condition that unlocks the card          |
| `slug`                | `string`          | no       | URL-friendly identifier                  |
| `subtitle`            | `string`          | no       | Secondary heading                        |
| `detailedExplanation` | `string`          | no       | Long-form description                    |
| `tags`                | `string[]`        | no       | Keywords for filtering                   |
| `difficulty`          | `CardDifficulty`  | no       | Enum: easy, medium, hard                 |
| `level`               | `number` (1-5)    | no       | Starting level (default 1)               |
| `maximumLevel`        | `number` (1-5)    | no       | Max level (default 1, must be >= level)  |
| `nextLevel`           | `RewardCondition` | no       | Condition to advance to next level       |
| `relatedLessons`      | `string[]`        | no       | Related node paths                       |
| `relatedQuizzes`      | `string[]`        | no       | Related quiz node paths                  |

### Unlock/Level-Up Conditions

Cards reuse the same `RewardCondition` types as rewards:

| Type    | Description                           |
| ------- | ------------------------------------- |
| `score` | Minimum score on a specific node      |
| `chain` | All specified nodes must be completed |
| `and`   | All sub-conditions must be met        |
| `or`    | Any sub-condition must be met         |

## Bundle-Level Rewards and Cards

Multi-module bundles can carry their own rewards and cards in addition to per-module files. Bundle-level files live at the **bundle root** (`<bundle>/rewards.json` and `<bundle>/cards.json`) and are referenced from `bundle.json`:

```json
{
  "id": "level-b-math",
  "title": "Level B Math",
  "version": "1.0.0",
  "modules": [
    { "id": "addition_basics", "title": "Addition Basics", "dependsOn": [] },
    { "id": "addition_carry", "title": "Addition with Carry", "dependsOn": ["addition_basics"] }
  ],
  "rewards": "./rewards.json",
  "cards": "./cards.json"
}
```

The runtime wires a bundle-scoped `RewardBroker`/`CardBroker` that listens for `bundle_complete` (fired when **all** modules complete) and `module_complete` events on the bundle session.

### Condition scope

Conditions are evaluated against the broker's context. The broker can only see signals within its scope:

| Level  | Broker sees                                   | Allowed conditions                                                                                                                             |
| ------ | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Module | step/exercise/score signals within the module | `stepCompleted`, `exerciseCompleted`, `score`, `chain`, `activityCompleted`, `moduleUnlocked`, `moduleFailed`, `attempts`, `answeredCorrectly` |
| Bundle | completed modules + cross-module signals      | `bundleCompleted`, `moduleCompleted`, `skill`, `and`, `or`, `bundleCondition`                                                                  |

A bundle-scoped file must not reference module-local signals, and a module-scoped file must not reference bundle-level signals — conditions the broker cannot evaluate simply resolve to `false`.

### Global card-ID uniqueness

Card IDs are unique across the **entire bundle** (all module cards + bundle cards). Saved card progress is keyed by bare `card.id`, so duplicates would corrupt progress. Prefix IDs with `module-` or `bundle-`.

## Error Types

| Error                      | Description                                      |
| -------------------------- | ------------------------------------------------ |
| `RewardError`              | Base error type                                  |
| `RewardExecutionError`     | Action handler failed at runtime                 |
| `RewardConfigurationError` | Invalid reward configuration (schema validation) |
