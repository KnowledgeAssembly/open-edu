# Drawer

**Purpose:** A bottom-drawer panel for mobile-friendly interactions.

## Import

```tsx
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
} from '@open-edu/design-system';
```

## Props

| Prop                  | Type      | Default | Description                                       |
| --------------------- | --------- | ------- | ------------------------------------------------- |
| shouldScaleBackground | `boolean` | `true`  | Whether to scale the background when drawer opens |

All components also accept Vaul Drawer primitive props.

| Component         | Description                              |
| ----------------- | ---------------------------------------- |
| Drawer            | Root container managing open/close state |
| DrawerTrigger     | Clickable element that opens the drawer  |
| DrawerContent     | Slide-up content panel with drag handle  |
| DrawerHeader      | Header section                           |
| DrawerFooter      | Footer section for actions               |
| DrawerTitle       | Title text                               |
| DrawerDescription | Description text                         |

## Accessibility

- **Keyboard:** Enter/Space to open, Escape to close
- **ARIA:** `role="dialog"` with `aria-modal`
- **Screen reader:** Announces drawer title and description on open

## Examples

```tsx
<Drawer>
  <DrawerTrigger>Open</DrawerTrigger>
  <DrawerContent>
    <DrawerHeader>
      <DrawerTitle>Title</DrawerTitle>
      <DrawerDescription>Description</DrawerDescription>
    </DrawerHeader>
  </DrawerContent>
</Drawer>
```
