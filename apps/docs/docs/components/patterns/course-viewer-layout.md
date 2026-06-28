# CourseViewerLayout

**Purpose:** Composite layout combining AppLayout and ThreePanelLayout for the course viewer experience.

## Import

```tsx
import { CourseViewerLayout } from '@open-edu/design-system';
```

## Props

| Prop         | Type        | Default | Description                                  |
| ------------ | ----------- | ------- | -------------------------------------------- |
| `topBar`     | `ReactNode` | —       | Top bar content                              |
| `sideNav`    | `ReactNode` | —       | Side navigation content                      |
| `content`    | `ReactNode` | —       | Main content area                            |
| `rightPanel` | `ReactNode` | —       | Right side panel                             |
| `children`   | `ReactNode` | —       | Fallback content (if `content` not provided) |

## Accessibility

- Wraps the `AppLayout` and `ThreePanelLayout` patterns, inheriting their accessibility semantics.

## Examples

```tsx
<CourseViewerLayout
  topBar={<TopAppBar isCourseView courseTitle="JavaScript" />}
  sideNav={<SideNav />}
  content={<div>Lesson content here</div>}
  rightPanel={<aside>Notes</aside>}
/>
```
