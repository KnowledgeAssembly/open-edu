# CommandPalette

**Purpose:** Modal command palette dialog for searching and executing commands, with subcomponents for grouped items.

## Import

```tsx
import { CommandPalette, CommandGroup, CommandItem, CommandEmpty } from '@open-edu/design-system';
```

## Props

### CommandPalette

| Prop           | Type                      | Default                | Description                                    |
| -------------- | ------------------------- | ---------------------- | ---------------------------------------------- |
| `open`         | `boolean`                 | —                      | **Required.** Whether the palette is visible   |
| `onOpenChange` | `(open: boolean) => void` | —                      | **Required.** Callback when open state changes |
| `placeholder`  | `string`                  | `'Search commands...'` | Input placeholder text                         |
| `children`     | `ReactNode`               | —                      | Command groups and items                       |

### CommandGroup

| Prop       | Type        | Default | Description         |
| ---------- | ----------- | ------- | ------------------- |
| `heading`  | `string`    | —       | Group heading label |
| `children` | `ReactNode` | —       | Group items         |

### CommandItem

| Prop       | Type         | Default | Description                 |
| ---------- | ------------ | ------- | --------------------------- |
| `onSelect` | `() => void` | —       | Callback when item selected |
| `disabled` | `boolean`    | —       | Disables the item           |
| `children` | `ReactNode`  | —       | Item content                |

### CommandEmpty

| Prop       | Type        | Default               | Description         |
| ---------- | ----------- | --------------------- | ------------------- |
| `children` | `ReactNode` | `'No results found.'` | Empty state message |

## Accessibility

- The palette uses `role="dialog"` with `aria-modal="true"` and `aria-label="Global command palette"`.
- The backdrop has `aria-hidden="true"`.
- The search input has `aria-label="Search commands"`.
- Items use `role="option"`.
- Groups use `role="group"` with `aria-label`.
- Escape key closes the palette.

## Examples

```tsx
<CommandPalette open={open} onOpenChange={setOpen}>
  <CommandGroup heading="Navigation">
    <CommandItem onSelect={() => navigate('/home')}>Home</CommandItem>
    <CommandItem onSelect={() => navigate('/courses')}>Courses</CommandItem>
  </CommandGroup>
  <CommandEmpty />
</CommandPalette>
```
