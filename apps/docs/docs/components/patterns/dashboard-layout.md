# DashboardLayout

**Purpose:** Full-screen dashboard layout with optional header, sidebar, and scrollable content area.

## Import

```tsx
import { DashboardLayout } from '@open-edu/design-system';
```

## Props

| Prop       | Type        | Default | Description            |
| ---------- | ----------- | ------- | ---------------------- |
| `header`   | `ReactNode` | —       | Top header bar         |
| `sidebar`  | `ReactNode` | —       | Side navigation panel  |
| `children` | `ReactNode` | —       | Main dashboard content |

## Accessibility

- The header is rendered at the top of a flex column.
- The sidebar and content area are in a flex row beneath the header.

## Examples

```tsx
<DashboardLayout header={<header>Dashboard header</header>} sidebar={<nav>Dashboard nav</nav>}>
  <div>Dashboard widgets and stats</div>
</DashboardLayout>
```
