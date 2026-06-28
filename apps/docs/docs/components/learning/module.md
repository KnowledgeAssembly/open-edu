# Module

**Purpose:** Displays an expandable module section with a list of lessons and progress tracking.

## Import

```tsx
import { Module } from '@open-edu/design-system';
```

## Props

| Prop               | Type                         | Default          | Description                             |
| ------------------ | ---------------------------- | ---------------- | --------------------------------------- |
| `title`            | `string`                     | —                | Module title                            |
| `lessons`          | `ModuleLesson[]`             | —                | Array of lessons in this module         |
| `totalLessons`     | `number`                     | `lessons.length` | Total lesson count for progress display |
| `completedLessons` | `number`                     | `0`              | Number of completed lessons             |
| `onLessonClick`    | `(lessonId: string) => void` | `undefined`      | Callback when a lesson is clicked       |
| `className`        | `string`                     | `undefined`      | Additional CSS class                    |

### ModuleLesson

| Prop       | Type      | Description                               |
| ---------- | --------- | ----------------------------------------- |
| `id`       | `string`  | Lesson identifier                         |
| `title`    | `string`  | Lesson display title                      |
| `isActive` | `boolean` | Whether this is the current active lesson |

## Accessibility

- Module header is a `<button>` with `aria-expanded` reflecting collapsible state.
- Active lesson has `aria-current="page"`.
- Lesson list is a `<ul>` with `<li>` items for proper list semantics.

## Examples

```tsx
<Module
  title="Getting Started"
  lessons={[
    { id: 'intro', title: 'Introduction', isActive: true },
    { id: 'setup', title: 'Setup Guide' },
  ]}
  completedLessons={1}
  totalLessons={5}
  onLessonClick={(id) => console.log('navigate to', id)}
/>
```
