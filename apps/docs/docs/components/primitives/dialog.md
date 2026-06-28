# Dialog

**Purpose:** A modal dialog overlay for focused user interactions.

## Import

```tsx
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@open-edu/design-system';
```

## Props

All components accept Radix Dialog primitive props.

| Component         | Description                              |
| ----------------- | ---------------------------------------- |
| Dialog            | Root container managing open/close state |
| DialogTrigger     | Clickable element that opens the dialog  |
| DialogContent     | Modal content panel with overlay         |
| DialogHeader      | Header section with flex column layout   |
| DialogFooter      | Footer section for actions               |
| DialogTitle       | Title text                               |
| DialogDescription | Description text                         |

## Accessibility

- **Keyboard:** Enter/Space to open, Escape to close, Tab to cycle focus (focus trap)
- **ARIA:** `role="dialog"` with `aria-modal="true"`, `aria-labelledby` on title, `aria-describedby` on description
- **Screen reader:** Announces dialog title and description on open, focus trapped inside

## Examples

```tsx
<Dialog>
  <DialogTrigger>Open</DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
      <DialogDescription>Description</DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```
