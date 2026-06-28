# Switch

**Purpose:** A toggle switch for binary on/off states.

## Import

```tsx
import { Switch } from '@open-edu/design-system';
```

## Props

| Prop      | Type     | Default | Description            |
| --------- | -------- | ------- | ---------------------- |
| className | `string` | —       | Additional CSS classes |

Also accepts all Radix Switch primitive props.

## Accessibility

- **Keyboard:** Tab to focus, Enter/Space to toggle
- **ARIA:** `role="switch"` with `aria-checked` state
- **Screen reader:** Announce "on/off" state

## Examples

```tsx
<Switch />
<Switch defaultChecked />
<Switch disabled />
```
