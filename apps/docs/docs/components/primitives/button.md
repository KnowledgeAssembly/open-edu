# Button

**Purpose:** Renders a clickable button with multiple variants and sizes.

## Import

```tsx
import { Button } from '@open-edu/design-system';
```

## Props

| Prop      | Type                                                                          | Default     | Description                                         |
| --------- | ----------------------------------------------------------------------------- | ----------- | --------------------------------------------------- |
| variant   | `'default' \| 'secondary' \| 'destructive' \| 'outline' \| 'ghost' \| 'link'` | `'default'` | Visual style variant                                |
| size      | `'default' \| 'sm' \| 'lg' \| 'icon'`                                         | `'default'` | Button size                                         |
| asChild   | `boolean`                                                                     | `false`     | Whether to render as a child element via Radix Slot |
| className | `string`                                                                      | —           | Additional CSS classes                              |

Also accepts all native `ButtonHTMLAttributes`.

## Variants

- **default:** Primary filled background
- **secondary:** Secondary muted background
- **destructive:** Red destructive action
- **outline:** Bordered with transparent background
- **ghost:** No background or border
- **link:** Text-styled link appearance

## Sizes

- **default:** h-10 px-4 py-2
- **sm:** h-9 rounded-md px-3
- **lg:** h-11 rounded-md px-8
- **icon:** h-10 w-10

## Accessibility

- **Keyboard:** Enter/Space to activate
- **ARIA:** Native `<button>` role
- **Screen reader:** Announces text content

## Examples

```tsx
<Button>Click me</Button>
<Button variant="destructive">Delete</Button>
<Button size="sm">Small</Button>
<Button asChild>
  <a href="/link">Link as button</a>
</Button>
```
