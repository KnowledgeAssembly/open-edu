# BundleOverview

**Purpose:** Displays a bundle's modules with progress tracking, status badges, and navigation actions for starting/continuing modules.

## Import

```tsx
import { BundleOverview } from '@open-edu/design-system';
```

## Props

| Prop               | Type                         | Default     | Description                                                 |
| ------------------ | ---------------------------- | ----------- | ----------------------------------------------------------- |
| `bundleTitle`      | `string`                     | —           | Title of the bundle                                         |
| `bundleId`         | `string`                     | —           | Unique identifier for the bundle                            |
| `description`      | `string`                     | `undefined` | Optional description of the bundle                          |
| `modules`          | `BundleOverviewModule[]`     | —           | Array of modules in the bundle                              |
| `onStartModule`    | `(moduleId: string) => void` | —           | Callback when user clicks Start on an unlocked module       |
| `onContinueModule` | `(moduleId: string) => void` | `undefined` | Callback when user clicks Continue on an in-progress module |
| `onBackToCatalog`  | `() => void`                 | —           | Callback when user clicks Back to Catalog                   |

### BundleOverviewModule

| Prop                 | Type                                                     | Description                          |
| -------------------- | -------------------------------------------------------- | ------------------------------------ |
| `id`                 | `string`                                                 | Module identifier                    |
| `title`              | `string`                                                 | Module title                         |
| `chapterCode`        | `string`                                                 | Optional chapter code badge          |
| `status`             | `'locked' \| 'unlocked' \| 'in_progress' \| 'completed'` | Current module status                |
| `nodeCount`          | `number`                                                 | Total activities in module           |
| `completedNodeCount` | `number`                                                 | Completed activities                 |
| `estimatedDuration`  | `number`                                                 | Estimated completion time in minutes |
| `prerequisiteLabel`  | `string`                                                 | Label shown when module is locked    |

## Accessibility

- Overall progress uses `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, and `aria-label`.
- Module cards are `role="region"` with `aria-labelledby` pointing to the module title.
- Back button is a focusable `<Button>` element.
- Status badges use semantic `<Badge>` component.

## Examples

```tsx
<BundleOverview
  bundleTitle="Introduction to JavaScript"
  bundleId="intro-js"
  description="Learn the basics of JavaScript programming."
  modules={[
    { id: 'm1', title: 'Variables', status: 'unlocked', nodeCount: 5, completedNodeCount: 0 },
    { id: 'm2', title: 'Functions', status: 'in_progress', nodeCount: 8, completedNodeCount: 3 },
  ]}
  onStartModule={(id) => console.log('start', id)}
  onBackToCatalog={() => console.log('back')}
/>
```
