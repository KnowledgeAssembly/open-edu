# Select

**Purpose:** A dropdown select menu for choosing an option from a list.

## Import

```tsx
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from '@open-edu/design-system';
```

## Props

All components accept Radix Select primitive props.

| Component       | Description                                 |
| --------------- | ------------------------------------------- |
| Select          | Root container managing selection state     |
| SelectTrigger   | Clickable trigger showing the current value |
| SelectValue     | Displays the selected value or placeholder  |
| SelectContent   | Dropdown content panel                      |
| SelectItem      | Individual selectable option                |
| SelectGroup     | Groups related items                        |
| SelectLabel     | Label for a group                           |
| SelectSeparator | Visual separator between groups             |

## Accessibility

- **Keyboard:** Enter/Space to open, Arrow keys to navigate, Enter to select, Escape to close
- **ARIA:** `role="combobox"` on trigger, `role="listbox"` on content, `role="option"` on items with `aria-selected`
- **Screen reader:** Announces selected option and list navigation

## Examples

```tsx
<Select>
  <SelectTrigger>
    <SelectValue placeholder="Select" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="1">Option 1</SelectItem>
    <SelectItem value="2">Option 2</SelectItem>
  </SelectContent>
</Select>
```
