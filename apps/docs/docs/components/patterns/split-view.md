# SplitView

**Purpose:** Horizontal split-panel layout with left and right panels separated by a divider.

## Import

```tsx
import { SplitView } from '@open-edu/design-system';
```

## Props

| Prop           | Type        | Default | Description                       |
| -------------- | ----------- | ------- | --------------------------------- |
| `left`         | `ReactNode` | —       | **Required.** Left panel content  |
| `right`        | `ReactNode` | —       | **Required.** Right panel content |
| `defaultRatio` | `number`    | `0.5`   | Flex ratio for the left panel     |
| `minLeftWidth` | `string`    | —       | CSS min-width for the left panel  |

## Accessibility

- A visual divider (`w-px`) separates the two panels.

## Examples

```tsx
<SplitView
  left={<div>Editor</div>}
  right={<div>Preview</div>}
  defaultRatio={0.6}
  minLeftWidth="300px"
/>
```
