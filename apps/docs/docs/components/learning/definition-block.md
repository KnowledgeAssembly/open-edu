# DefinitionBlock

**Purpose:** Renders a term-definition pair with a styled left border accent.

## Import

```tsx
import { DefinitionBlock } from '@open-edu/design-system';
```

## Props

| Prop        | Type        | Default     | Description            |
| ----------- | ----------- | ----------- | ---------------------- |
| `term`      | `string`    | —           | The term being defined |
| `children`  | `ReactNode` | —           | The definition content |
| `className` | `string`    | `undefined` | Additional CSS class   |

## Accessibility

- Uses `<dt>` (definition term) and `<dd>` (definition description) elements for semantic HTML definition lists.

## Examples

```tsx
<DefinitionBlock term="Photosynthesis">
  The process by which plants convert light energy into chemical energy.
</DefinitionBlock>
```
