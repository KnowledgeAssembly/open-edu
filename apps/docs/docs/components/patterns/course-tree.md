# CourseTree

**Purpose:** Expandable accordion tree of course modules and lessons for navigation.

## Import

```tsx
import { CourseTree } from '@open-edu/design-system';
```

## Props

| Prop            | Type                         | Default | Description                       |
| --------------- | ---------------------------- | ------- | --------------------------------- |
| `modules`       | `CourseTreeModule[]`         | —       | Array of modules with lessons     |
| `onLessonClick` | `(lessonId: string) => void` | —       | Callback when a lesson is clicked |

### CourseTreeModule

| Prop       | Type                                                  | Default | Description                  |
| ---------- | ----------------------------------------------------- | ------- | ---------------------------- |
| `title`    | `string`                                              | —       | Module title                 |
| `lessons`  | `{ id: string; title: string; isActive?: boolean }[]` | —       | Array of lessons             |
| `isLocked` | `boolean`                                             | —       | Whether the module is locked |

## Accessibility

- The `<nav>` element has `aria-label="Course modules"`.
- Module toggle buttons have `aria-expanded`.
- Active lesson buttons have `aria-current="page"`.
- Locked module icons have `aria-label="Locked"`.

## Examples

```tsx
<CourseTree
  modules={[
    {
      title: 'Module 1: Basics',
      lessons: [
        { id: 'intro', title: 'Introduction', isActive: true },
        { id: 'setup', title: 'Setup Guide' },
      ],
    },
    {
      title: 'Module 2: Advanced',
      lessons: [{ id: 'deep-dive', title: 'Deep Dive' }],
      isLocked: true,
    },
  ]}
  onLessonClick={(id) => console.log('navigate to', id)}
/>
```
