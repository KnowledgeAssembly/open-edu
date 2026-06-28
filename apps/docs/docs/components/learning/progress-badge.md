# ProgressBadge

**Purpose:** Displays a status badge indicating course progress: Not started, In progress, or Complete.

## Import

```tsx
import { ProgressBadge } from '@open-edu/design-system';
```

## Props

| Prop              | Type      | Default | Description                            |
| ----------------- | --------- | ------- | -------------------------------------- |
| `percentComplete` | `number`  | —       | Percentage of course completed (0–100) |
| `isCompleted`     | `boolean` | —       | Whether the course is fully completed  |

## Accessibility

- Uses the semantic `<Badge>` component for proper role and styling.
- Text content clearly indicates the state ("Not started", "In progress", "Complete").

## Examples

```tsx
<ProgressBadge percentComplete={0} isCompleted={false} />
<ProgressBadge percentComplete={50} isCompleted={false} />
<ProgressBadge percentComplete={100} isCompleted />
```
