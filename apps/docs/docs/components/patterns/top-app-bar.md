# TopAppBar

**Purpose:** Sticky top app bar with breadcrumbs, accessibility controls, user avatar, and course progress.

## Import

```tsx
import { TopAppBar } from '@open-edu/design-system';
```

## Props

| Prop                   | Type                         | Default | Description                                |
| ---------------------- | ---------------------------- | ------- | ------------------------------------------ |
| `breadcrumbs`          | `TopAppBarBreadcrumb[]`      | —       | Breadcrumb trail items                     |
| `showA11yControls`     | `boolean`                    | —       | Shows accessibility settings panel         |
| `userAvatar`           | `string`                     | —       | URL for user avatar image                  |
| `onReadingRulerChange` | `(enabled: boolean) => void` | —       | Callback when reading ruler toggled        |
| `isCourseView`         | `boolean`                    | —       | Switches to course view (title + progress) |
| `courseTitle`          | `string`                     | —       | Course title in course view                |
| `progressCurrent`      | `number`                     | —       | Current lesson number for progress bar     |
| `progressTotal`        | `number`                     | —       | Total lessons for progress bar             |

`TopAppBarBreadcrumb` = `{ label: string; href?: string }`

## Accessibility

- The `<header>` element wraps the entire bar.
- Accessibility controls panel has `role="region"` and `aria-label="Accessibility controls"`.
- Font size adjustment buttons have `aria-label="Increase/Decrease font size"`.
- Progress bar uses `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`.

## Examples

```tsx
<TopAppBar
  breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Courses' }]}
  showA11yControls
  userAvatar="/avatar.png"
/>
```

```tsx
<TopAppBar isCourseView courseTitle="JavaScript Basics" progressCurrent={3} progressTotal={10} />
```
