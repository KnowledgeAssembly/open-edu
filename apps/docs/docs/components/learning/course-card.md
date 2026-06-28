# CourseCard

**Purpose:** Displays a course summary card with title, author, lesson count, badge progress, and a start/continue/review action button.

## Import

```tsx
import { CourseCard } from '@open-edu/design-system';
```

## Props

| Prop               | Type                       | Default | Description                                                  |
| ------------------ | -------------------------- | ------- | ------------------------------------------------------------ |
| `manifest`         | `PackageManifest`          | —       | Package metadata including id, title, version, author, entry |
| `nodeCount`        | `number`                   | —       | Total number of lessons/nodes                                |
| `badgeCount`       | `number`                   | —       | Total badges available                                       |
| `earnedBadgeCount` | `number`                   | —       | Badges earned so far                                         |
| `progress`         | `ProgressSnapshot \| null` | —       | Current progress snapshot or null if not started             |
| `onStart`          | `() => void`               | —       | Callback when action button is clicked                       |

### PackageManifest

| Prop      | Type       | Description        |
| --------- | ---------- | ------------------ |
| `id`      | `string`   | Package identifier |
| `title`   | `string`   | Display title      |
| `version` | `string`   | Semantic version   |
| `author`  | `string`   | Author name        |
| `entry`   | `string`   | Entry point path   |
| `tags`    | `string[]` | Optional tags      |

### ProgressSnapshot

| Prop             | Type                     | Description                  |
| ---------------- | ------------------------ | ---------------------------- |
| `packageId`      | `string`                 | Package identifier           |
| `packageVersion` | `string`                 | Package version              |
| `currentNodeId`  | `string`                 | Current active node          |
| `visitedNodes`   | `string[]`               | Visited node IDs             |
| `scores`         | `Record<string, number>` | Per-node scores              |
| `isCompleted`    | `boolean`                | Whether course is completed  |
| `updatedAt`      | `string`                 | ISO timestamp of last update |

## Accessibility

- Rendered as `<article>` element.
- Button has `aria-label` combining action and course title (e.g., "Start Intro to JavaScript").
- Progress bar uses semantic `<Progress>` component.
- Badge icons are grouped with `role="group"` and `aria-label` describing earned count.
- Decorative gradient and badge icons have `aria-hidden="true"`.

## Examples

```tsx
<CourseCard
  manifest={{
    id: 'intro-js',
    title: 'Intro to JavaScript',
    version: '1.0.0',
    author: 'Jane Doe',
    entry: 'index.json',
  }}
  nodeCount={10}
  badgeCount={3}
  earnedBadgeCount={1}
  progress={null}
  onStart={() => console.log('start')}
/>
```
