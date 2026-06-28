# Toaster

**Purpose:** Renders a toast notification system for user feedback.

## Import

```tsx
import { Toaster } from '@open-edu/design-system';
```

## Props

| Prop      | Type     | Default | Description            |
| --------- | -------- | ------- | ---------------------- |
| className | `string` | —       | Additional CSS classes |

Also accepts all Sonner `Toaster` props (`position`, `richColors`, `closeButton`, etc.).

## Accessibility

- **Keyboard:** Focusable toast with action buttons
- **ARIA:** Uses `role="status"` or `role="alert"` for live region announcements
- **Screen reader:** Announces toast content via live region

## Examples

```tsx
<Toaster />
<Toaster position="top-right" closeButton />
```
