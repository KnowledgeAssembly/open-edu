# Accordion

**Purpose:** A vertically stacked set of expandable sections.

## Import

```tsx
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@open-edu/design-system';
```

## Props

| Component        | Description                                                   |
| ---------------- | ------------------------------------------------------------- |
| Accordion        | Root container (accepts `type="single"` or `type="multiple"`) |
| AccordionItem    | Individual collapsible section                                |
| AccordionTrigger | Clickable heading that expands/collapses the item             |
| AccordionContent | Content revealed when the item is expanded                    |

All components accept Radix Accordion primitive props.

## Accessibility

- **Keyboard:** Enter/Space to toggle, Tab to navigate between items
- **ARIA:** `role="heading"` on trigger wrapper, `aria-expanded` state, `aria-controls` linking trigger to content
- **Screen reader:** Announces expanded/collapsed state

## Examples

```tsx
<Accordion type="single">
  <AccordionItem value="item-1">
    <AccordionTrigger>Section 1</AccordionTrigger>
    <AccordionContent>Content 1</AccordionContent>
  </AccordionItem>
</Accordion>
```
