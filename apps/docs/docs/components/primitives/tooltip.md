# Tooltip

**Purpose:** Shows additional information on hover or focus.

## Import

```tsx
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@open-edu/design-system';
```

## Props

| Component       | Description                             |
| --------------- | --------------------------------------- |
| TooltipProvider | Context provider wrapping tooltip group |
| Tooltip         | Root tooltip container                  |
| TooltipTrigger  | Element that triggers the tooltip       |
| TooltipContent  | Floating content shown on hover/focus   |

TooltipContent accepts `sideOffset` (default `4`) and Radix Tooltip primitive props.

## Accessibility

- **Keyboard:** Focus trigger to show tooltip
- **ARIA:** `role="tooltip"` with `aria-describedby` on trigger
- **Screen reader:** Announces tooltip content when visible

## Examples

```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger>Hover me</TooltipTrigger>
    <TooltipContent>Tooltip content</TooltipContent>
  </Tooltip>
</TooltipProvider>
```
