# Rewards & Pipili Integration Design

**Date:** 2026-07-29
**Status:** Draft

## Summary

Two changes to the rewards notification and Pipili character system:

1. **Rewards & cards appear inside Pipili as chat messages** — badge and card unlock notifications are removed from the toast overlay system and appear as celebratory chat messages from Pipili. Pipili shows a gentle FAB indicator (pulse + unread badge) instead of auto-opening.

2. **Pipili icon replaces robot emoji** — the `🤖` emoji used as AI avatar in `TutorMessage` and `AITutorPanel` is replaced with the `<Pipili>` component. Two new moods (`nodding`, `surprised`) are added to the design system for reward-triggered animations.

## Motivation

- Unify the learner's relationship with Pipili as the primary feedback channel
- Remove the disconnected toast overlay system in favor of in-context chat messages
- Give Pipili a consistent visual identity (no robot emoji) with mood-driven animations

## Architecture

### Before (current)

```
RewardBroker/CardBroker callbacks
  → CourseRuntime sets toast state
    → BadgeToast / KnowledgeCardUnlockedToast render as fixed overlay
```

### After (target)

```
RewardBroker/CardBroker callbacks
  → CompanionProvider.addRewardMessage()
    → UIMessage pushed into chat stream (role: assistant, reward card content)
    → pendingReward = true (drives FAB indicator)
    → PipiliChat renders reward message inline with Pipili avatar
    → Pipili FAB shows pulse ring + unread badge
```

### Component wiring

```
CourseRuntime
  ├─ onReceipt(badge) → companionRef.addRewardMessage({ type: 'badge', ... })
  └─ onCardUnlocked(card) → companionRef.addRewardMessage({ type: 'card', ... })

CompanionProvider
  ├─ pendingReward: boolean (state)
  ├─ addRewardMessage(reward) → push formatted UIMessage
  └─ clearPendingReward() → called when panel opens (panelState !== 'closed')

Pipili (FAB)
  └─ pendingReward=true → wave animation + glow ring + unread badge
  └─ pendingReward=false → normal idle/page-based mood

PipiliChat
  └─ renders reward messages as card-rich chat bubbles with Pipili avatar (surprised mood)

TutorMessage / AITutorPanel
  └─ AI avatar: <Pipili mood="idle" size="sm" /> replaces '🤖' emoji
```

## Data Flow

```
1. WorkflowEngine emits node_complete / workflow_complete
2. TelemetrySession.emit() → events$ observable
3. RewardBroker / CardBroker evaluate conditions
   ├─ Badge earned → onReceipt({ status: 'delivered', actionType: 'badge.award', ... })
   └─ Card unlocked → onCardUnlocked(card) / onCardLeveledUp(card, level)
4. CourseRuntime callbacks call:
   ├─ companion.addRewardMessage({ type: 'badge', name, icon })
   └─ companion.addRewardMessage({ type: 'card', title, type, level })
5. CompanionProvider:
   ├─ Pushes UIMessage into messages[] with reward card content
   └─ Sets pendingReward = true
6. Pipili FAB: detects pendingReward → pulse ring + unread indicator
7. When user opens Pipili panel: pendingReward cleared to false
8. PipiliChat: renders reward message with Pipili avatar in surprised mood
```

## Files to Change

### New

| File   | Purpose      |
| ------ | ------------ |
| (none) | No new files |

### Modified

| File                                               | Change                                                                         |
| -------------------------------------------------- | ------------------------------------------------------------------------------ |
| `apps/learner/src/ai/CompanionProvider.tsx`        | Add `pendingReward` state, `addRewardMessage()` method, `clearPendingReward()` |
| `apps/learner/src/CourseRuntime.tsx`               | Remove toast state and rendering; wire callbacks into CompanionProvider        |
| `apps/learner/src/components/Pipili.tsx`           | Add `pendingReward` prop → pulse ring + animated wave                          |
| `apps/learner/src/ai/PipiliChat.tsx`               | Render reward card messages inline                                             |
| `packages/design-system/src/primitives/pipili.tsx` | Add `"nodding"` and `"surprised"` moods                                        |
| `packages/design-system/src/ai/TutorMessage.tsx`   | Replace `'🤖'` with `<Pipili>`                                                 |
| `packages/design-system/src/ai/AITutorPanel.tsx`   | Replace `'🤖'` with `<Pipili>`                                                 |
| `packages/design-system/src/index.css`             | Add `@keyframes pipili-nod`, `@keyframes pipili-surprised`                     |
| `packages/design-system/src/tokens/tailwind.ts`    | Register new animation keyframes                                               |

### Removed

| File                                                             | Reason                                   |
| ---------------------------------------------------------------- | ---------------------------------------- |
| `apps/learner/src/BadgeToast.tsx`                                | Toast replaced by chat messages          |
| `packages/runtime/src/components/KnowledgeCardUnlockedToast.tsx` | Toast replaced by chat messages          |
| `packages/runtime/src/index.ts`                                  | Remove KnowledgeCardUnlockedToast export |

## Pipili Moods

### New Moods

| Mood        | Animation                               | Duration | Loop     | Use                            |
| ----------- | --------------------------------------- | -------- | -------- | ------------------------------ |
| `nodding`   | `pipili-nod`: translateY(0 → -2px → 0)  | 1.5s     | infinite | FAB when pendingReward=true    |
| `surprised` | `pipili-surprised`: scale(1 → 1.15 → 1) | 0.6s     | one-shot | Chat avatar for reward message |

### Mood Mapping

| Trigger                 | Mood                               | Location    |
| ----------------------- | ---------------------------------- | ----------- |
| Reward pending (unread) | `nodding`                          | FAB button  |
| Reward message in chat  | `surprised` (one-shot → `content`) | Chat avatar |
| Normal chat message     | `idle`                             | Chat avatar |
| Streaming response      | `thinking` (existing)              | Chat avatar |
| No pending rewards      | `idle` or page-based               | FAB button  |

### CSS Keyframes

```css
@keyframes pipili-nod {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-2px);
  }
}

@keyframes pipili-surprised {
  0% {
    transform: scale(1);
  }
  40% {
    transform: scale(1.15);
  }
  70% {
    transform: scale(0.95);
  }
  100% {
    transform: scale(1);
  }
}
```

Both keyframes honor `prefers-reduced-motion: reduce` by falling back to static/`content` mood.

## Reward Message Format

Reward messages are rendered as `UIMessage` with `role: 'assistant'`. The content is a structured card component, not plain text:

```
┌──────────────────────────────────────────────┐
│  [Pipili - surprised mood, then content]     │
│                                              │
│  🏆 Achievement Unlocked!                   │
│  ┌────────────────────────────────────────┐  │
│  │  Congratulations! You earned           │  │
│  │  the "Biologist" badge!                │  │
│  │  [View Badge →]                        │  │
│  └────────────────────────────────────────┘  │
│                                      12:34   │
└──────────────────────────────────────────────┘
```

For card unlocks:

```
┌──────────────────────────────────────────────┐
│  [Pipili - surprised mood]                   │
│                                              │
│  🃏 Knowledge Card Unlocked!                 │
│  ┌────────────────────────────────────────┐  │
│  │  [Card type icon]  Living Things       │  │
│  │  Knowledge Card — Level 1              │  │
│  │  You've unlocked this knowledge card.  │  │
│  │  [View Card →]                         │  │
│  └────────────────────────────────────────┘  │
│                                      12:34   │
└──────────────────────────────────────────────┘
```

## FAB Indicator Design

When `pendingReward === true`, the Pipili FAB shows:

1. **Wave animation** — `animated` prop on Pipili primitive (existing `animate-pipili-wave`)
2. **Glow ring** — subtle `GlowPulse` effect around the button (existing component)
3. **Unread badge** — existing red dot with `!` (already implemented)

When the user opens Pipili (panelState !== 'closed'), `pendingReward` resets to `false` and the FAB returns to normal.

## Accessibility

- Pipili moods maintain `role="img"` with descriptive `aria-label`
- Reward messages follow existing `PipiliMessage` a11y patterns (semantic HTML, keyboard navigation)
- `prefers-reduced-motion` respected for all new animations
- Chat message order preserved, reward messages are read by screen readers as part of the chat stream

## Internationalization

- Reward message templates use `t()` from `@open-edu/i18n`
- New i18n keys in `packages/i18n/locales/en/pipili.json`:
  - `pipili.reward.badgeTitle`: "Achievement Unlocked!"
  - `pipili.reward.cardTitle`: "Knowledge Card Unlocked!"
  - `pipili.reward.cardLevelUp`: "Knowledge Card Level Up!"
  - `pipili.reward.badgeMessage`: "Congratulations! You earned the \"{name}\" badge!"
  - `pipili.reward.cardMessage`: "You've unlocked this knowledge card."
  - `pipili.reward.cardLevelUpMessage`: "Your \"{title}\" card reached Level {level}!"
  - `pipili.reward.viewBadge`: "View Badge"
  - `pipili.reward.viewCard`: "View Card"

## Testing

### Unit Tests

- `CompanionProvider.test.tsx` — `addRewardMessage()` pushes correct message format, `pendingReward` toggles, clears on panel open
- `Pipili.test.tsx` (FAB) — renders pulse ring when `pendingReward=true`, no ring when false
- `pipili.test.tsx` (primitive) — new moods render correct CSS classes, reduced-motion fallbacks
- `TutorMessage.test.tsx` — renders `<Pipili>` instead of `'🤖'`
- `AITutorPanel.test.tsx` — renders `<Pipili>` instead of `'🤖'`

### Integration Tests

- `CourseRuntime` with mock CompanionProvider — badge/card events call `addRewardMessage`
- PipiliChat renders reward message cards with correct title, CTA, avatar mood

### E2E Tests

- Complete a course node → reward message appears in Pipili chat → FAB shows indicator → open Pipili → indicator clears
- Card unlock on score threshold → card message appears → FAB indicator → open → indicator clears

### Removed Tests

- BadgeToast rendering tests
- KnowledgeCardUnlockedToast rendering tests

## Backward Compatibility

- `RewardBroker` and `CardBroker` are unchanged — only the callback wiring in `CourseRuntime` changes
- Other consumers of the brokers (if any) are unaffected
- `KnowledgeCardUnlockedToast` export removed from runtime package index — this is a minor breaking change for any external consumers of that specific component

## Out of Scope

- Auto-opening Pipili panel on reward (user chose gentle indicator)
- Rewards history tab or separate panel (user chose chat messages only)
- Changes to `CompletionScreen` badge display (stays as is)
- Changes to `CollectionBinderPage` card display (stays as is)
- New Pipili moods beyond `nodding` and `surprised`
