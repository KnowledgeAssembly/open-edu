# Input

**Purpose:** A styled text input field.

## Import

```tsx
import { Input } from '@open-edu/design-system';
```

## Props

| Prop      | Type     | Default | Description            |
| --------- | -------- | ------- | ---------------------- |
| type      | `string` | —       | HTML input type        |
| className | `string` | —       | Additional CSS classes |

Also accepts all native `InputHTMLAttributes<HTMLInputElement>`.

## Accessibility

- **Keyboard:** Tab to focus, type to enter text
- **ARIA:** Native `<input>` with implicit textbox role
- **Screen reader:** Reads associated label or placeholder

## Examples

```tsx
<Input placeholder="Enter text" />
<Input type="email" placeholder="Email" />
<Input disabled value="Disabled" />
```
