# CompletionScreen

**Purpose:** Displays a congratulatory completion screen with optional badges, stats, skill summary, and recommended courses.

## Import

```tsx
import { CompletionScreen } from '@open-edu/design-system';
```

## Props

| Prop                 | Type                           | Default     | Description                              |
| -------------------- | ------------------------------ | ----------- | ---------------------------------------- |
| `title`              | `string`                       | —           | Name of the completed course             |
| `badges`             | `string[]`                     | `undefined` | List of earned badge names               |
| `onBack`             | `() => void`                   | —           | Callback when Back to Catalog is clicked |
| `className`          | `string`                       | `undefined` | Additional CSS class                     |
| `stats`              | `CompletionStats`              | `undefined` | Optional completion statistics           |
| `recommendedCourses` | `PackageSummary[]`             | `undefined` | Optional list of recommended courses     |
| `onNavigateToCourse` | `(packageDir: string) => void` | `undefined` | Callback when View Course is clicked     |
| `skillSummary`       | `ReactNode`                    | `undefined` | Optional skill summary content           |

### CompletionStats

| Prop                 | Type     | Description                   |
| -------------------- | -------- | ----------------------------- |
| `stepsCompleted`     | `number` | Number of steps completed     |
| `quizzesAnswered`    | `number` | Number of quizzes answered    |
| `reflectionsWritten` | `number` | Number of reflections written |
| `timeSpentMinutes`   | `number` | Total time spent in minutes   |

## Accessibility

- Confetti animation respects `prefers-reduced-motion`.
- Confetti particles have `aria-hidden="true"`.
- Badges render as `<h3>` elements with proper heading hierarchy.
- Stats use semantic `StatCard` sub-components.
- Back button is a focusable `<Button>`.

## Examples

```tsx
<CompletionScreen
  title="JavaScript Basics"
  onBack={() => console.log('back')}
  badges={['Gold', 'Fast Learner']}
  stats={{
    stepsCompleted: 42,
    quizzesAnswered: 10,
    reflectionsWritten: 5,
    timeSpentMinutes: 120,
  }}
/>
```
