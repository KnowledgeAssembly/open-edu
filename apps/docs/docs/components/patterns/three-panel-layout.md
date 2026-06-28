# ThreePanelLayout

**Purpose:** Three-column layout with optional left navigation, required content center, and optional right panel.

## Import

```tsx
import { ThreePanelLayout } from '@open-edu/design-system';
```

## Props

| Prop         | Type        | Default | Description                     |
| ------------ | ----------- | ------- | ------------------------------- |
| `leftNav`    | `ReactNode` | —       | Left navigation panel           |
| `content`    | `ReactNode` | —       | **Required.** Main content area |
| `rightPanel` | `ReactNode` | —       | Right side panel                |

## Accessibility

- Uses a flex layout with semantic slotting for navigation and content.

## Examples

```tsx
<ThreePanelLayout
  leftNav={<SideNav />}
  content={<div>Course content</div>}
  rightPanel={<aside>Notes</aside>}
/>
```
