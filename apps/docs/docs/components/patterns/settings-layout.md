# SettingsLayout

**Purpose:** Two-column settings page layout with optional sidebar navigation and main content area.

## Import

```tsx
import { SettingsLayout } from '@open-edu/design-system';
```

## Props

| Prop       | Type        | Default | Description        |
| ---------- | ----------- | ------- | ------------------ |
| `sidebar`  | `ReactNode` | —       | Sidebar navigation |
| `children` | `ReactNode` | —       | Settings content   |

## Accessibility

- The sidebar is rendered inside a `<nav>` element.
- The content area uses a `<main>` element.

## Examples

```tsx
<SettingsLayout sidebar={<nav>Settings nav</nav>}>
  <div>Account settings</div>
</SettingsLayout>
```
