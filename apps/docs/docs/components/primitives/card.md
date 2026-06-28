# Card

**Purpose:** A container component for grouping related content with header, title, description, content, and footer sections.

## Import

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@open-edu/design-system';
```

## Props

All Card sub-components accept `HTMLAttributes<HTMLDivElement>` (or `HTMLHeadingElement` for CardTitle).

| Component       | Element | Description                                             |
| --------------- | ------- | ------------------------------------------------------- |
| Card            | `<div>` | Root container with border, shadow, and rounded corners |
| CardHeader      | `<div>` | Header section with flex column layout and spacing      |
| CardTitle       | `<h3>`  | Title text with semibold font                           |
| CardDescription | `<p>`   | Description text in muted color                         |
| CardContent     | `<div>` | Main content area with padding                          |
| CardFooter      | `<div>` | Footer section with flex row layout                     |

## Accessibility

- **ARIA:** Uses semantic `<h3>` for CardTitle, `<p>` for CardDescription
- **Screen reader:** Announces heading level for CardTitle

## Examples

```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>Body</CardContent>
  <CardFooter>Footer</CardFooter>
</Card>
```
