# DropdownMenu

**Purpose:** A floating menu of actions triggered by a button click.

## Import

```tsx
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@open-edu/design-system';
```

## Props

All components accept Radix DropdownMenu primitive props.

| Component                | Description                              |
| ------------------------ | ---------------------------------------- |
| DropdownMenu             | Root container managing open/close state |
| DropdownMenuTrigger      | Clickable element that opens the menu    |
| DropdownMenuContent      | Floating menu panel                      |
| DropdownMenuItem         | Clickable menu action                    |
| DropdownMenuCheckboxItem | Item with checkbox state                 |
| DropdownMenuRadioItem    | Item with radio state                    |
| DropdownMenuLabel        | Section label                            |
| DropdownMenuSeparator    | Visual separator                         |
| DropdownMenuGroup        | Groups related items                     |
| DropdownMenuSub          | Nested submenu                           |
| DropdownMenuSubTrigger   | Submenu trigger                          |
| DropdownMenuSubContent   | Submenu content panel                    |

## Accessibility

- **Keyboard:** Enter/Space to open, Arrow keys to navigate, Enter to select, Escape to close
- **ARIA:** `role="menu"`, `role="menuitem"`, `role="menuitemcheckbox"`, `role="menuitemradio"` with `aria-checked`
- **Screen reader:** Announces menu items and selection state

## Examples

```tsx
<DropdownMenu>
  <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>Item 1</DropdownMenuItem>
    <DropdownMenuCheckboxItem checked>Checkbox</DropdownMenuCheckboxItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem>Item 2</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```
