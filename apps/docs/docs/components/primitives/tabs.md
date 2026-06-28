# Tabs

**Purpose:** A tabbed interface for switching between content panels.

## Import

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@open-edu/design-system';
```

## Props

Tabs accepts Radix Tabs Root props (`defaultValue`, `value`, `onValueChange`, etc.). TabsList, TabsTrigger, and TabsContent accept Radix primitive props.

| Component   | Description                                   |
| ----------- | --------------------------------------------- |
| Tabs        | Root container managing tab state             |
| TabsList    | Wrapper containing tab triggers               |
| TabsTrigger | Clickable tab button                          |
| TabsContent | Content panel associated with a trigger value |

## Accessibility

- **Keyboard:** Arrow keys navigate between tabs, Tab moves into content
- **ARIA:** `role="tablist"`, `role="tab"`, `role="tabpanel"` with `aria-controls`, `aria-selected`, `aria-labelledby`
- **Screen reader:** Announces selected tab state

## Examples

```tsx
<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Content 1</TabsContent>
  <TabsContent value="tab2">Content 2</TabsContent>
</Tabs>
```
