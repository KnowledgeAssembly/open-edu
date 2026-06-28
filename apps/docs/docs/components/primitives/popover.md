# Popover

**Purpose:** A floating card that appears on trigger click for additional content.

## Import

```tsx
import { Popover, PopoverTrigger, PopoverContent } from '@open-edu/design-system';
```

## Props

| Component      | Description                              |
| -------------- | ---------------------------------------- |
| Popover        | Root container managing open/close state |
| PopoverTrigger | Clickable element that opens the popover |
| PopoverContent | Floating content panel                   |

PopoverContent accepts `align` (default `'center'`), `sideOffset` (default `4`), and Radix Popover primitive props.

## Accessibility

- **Keyboard:** Enter/Space to open, Escape to close, Tab to move focus
- **ARIA:** `role="dialog"` with `aria-modal`, `aria-labelledby`
- **Screen reader:** Announces popover content when opened

## Examples

```tsx
<Popover>
  <PopoverTrigger>Open</PopoverTrigger>
  <PopoverContent>Content</PopoverContent>
</Popover>
```
