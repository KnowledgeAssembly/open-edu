# AppLayout

**Purpose:** Top-level application shell with optional top bar and sidebar, and a main content area.

## Import

```tsx
import { AppLayout } from '@open-edu/design-system';
```

## Props

| Prop       | Type        | Default | Description                          |
| ---------- | ----------- | ------- | ------------------------------------ |
| `topBar`   | `ReactNode` | —       | Content rendered in the top bar slot |
| `sidebar`  | `ReactNode` | —       | Content rendered in the sidebar slot |
| `children` | `ReactNode` | —       | Main content area                    |

## Accessibility

- The main content area uses a `<main>` element.
- Semantic slots for header and navigation content.

## Examples

```tsx
<AppLayout topBar={<TopAppBar />} sidebar={<SideNav />}>
  <div>Page content</div>
</AppLayout>
```
