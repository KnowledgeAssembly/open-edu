# Progress

**Purpose:** Displays a progress bar indicating completion status.

## Import

```tsx
import { Progress } from '@open-edu/design-system';
```

## Props

| Prop      | Type           | Default | Description                   |
| --------- | -------------- | ------- | ----------------------------- |
| value     | `number`       | —       | Percentage value (0–100)      |
| current   | `number`       | —       | Current step count            |
| total     | `number`       | —       | Total step count              |
| showLabel | `boolean`      | `false` | Whether to show numeric label |
| label     | `string`       | —       | Custom ARIA label override    |
| size      | `'sm' \| 'md'` | —       | Progress bar height           |
| className | `string`       | —       | Additional CSS classes        |

## Accessibility

- **ARIA:** `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- **Screen reader:** Announces progress via `aria-label`

## Examples

```tsx
<Progress value={50} />
<Progress current={3} total={10} showLabel />
<Progress current={3} total={10} label="Course progress" />
```
