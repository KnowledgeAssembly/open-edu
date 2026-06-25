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

| Action | Description |
|---|---|
| `badge.award` | Award a named badge to the learner |
| `webhook` | Send a POST request with event payload to a URL |
| `script` | Execute a shell script (requires `--allow-shell-hooks` flag) |

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

## Conditional Rules

Rewards can include conditions that gate their execution:

```typescript
{
  onEvent: 'node_complete',
  conditions: [
    { type: 'score', nodeId: 'nodes/quiz.json', minScore: 80 },
  ],
  rewards: [{ action: 'badge.award', badge: 'high-scorer' }],
}
```

Supported condition types:

| Type | Description |
|---|---|
| `score` | Minimum score on a specific node |
| `skill` | Minimum mastery level for a skill |
| `chain` | Set of completed node IDs (all must be completed) |
| `and` | All sub-conditions must be met |
| `or` | Any sub-condition must be met |

## Verification & Replay

```typescript
import { verifyReceipt, replayRewards } from '@open-edu/rewards';

// Confirm a receipt matches the telemetry that triggered it
const valid = verifyReceipt(receipt, telemetryEvents);

// Re-dispatch rewards from telemetry (skips duplicates)
const result = await replayRewards(telemetryEvents, broker);
// result.delivered, result.skipped, result.failed
```

## Error Types

| Error | Description |
|---|---|
| `RewardError` | Base error type |
| `RewardExecutionError` | Action handler failed at runtime |
| `RewardConfigurationError` | Invalid reward configuration (schema validation) |
