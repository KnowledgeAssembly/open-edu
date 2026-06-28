# RadioGroup

**Purpose:** A set of radio buttons for single-selection.

## Import

```tsx
import { RadioGroup, RadioGroupItem } from '@open-edu/design-system';
```

## Props

RadioGroup accepts Radix RadioGroup Root props (`defaultValue`, `value`, `onValueChange`). RadioGroupItem accepts Radix RadioGroup Item props (`value`, `disabled`).

| Component      | Description                             |
| -------------- | --------------------------------------- |
| RadioGroup     | Root container managing selection state |
| RadioGroupItem | Individual radio option                 |

## Accessibility

- **Keyboard:** Arrow keys to navigate between options
- **ARIA:** `role="radiogroup"` on group, `role="radio"` with `aria-checked` on each item
- **Screen reader:** Announces selected option

## Examples

```tsx
<RadioGroup defaultValue="a">
  <RadioGroupItem value="a" />
  <RadioGroupItem value="b" />
</RadioGroup>
```
