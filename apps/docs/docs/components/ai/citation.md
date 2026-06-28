# Citation

**Purpose:** Renders a cited source block with a source label and quoted content.

## Import

```tsx
import { Citation } from '@open-edu/design-system';
```

## Props

| Prop        | Type              | Default     | Description                                    |
| ----------- | ----------------- | ----------- | ---------------------------------------------- |
| `source`    | `string`          | —           | Source name/label displayed above the citation |
| `children`  | `React.ReactNode` | —           | Cited content                                  |
| `className` | `string`          | `undefined` | Additional CSS class                           |

## Accessibility

- Source label is displayed in muted text for clear visual hierarchy.
- Uses semantic left border styling to visually distinguish citations.

## Examples

```tsx
<Citation source="MDN Web Docs">
  JavaScript is a lightweight, interpreted, or just-in-time compiled programming language.
</Citation>
```
