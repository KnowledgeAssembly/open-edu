# SideNav

**Purpose:** Vertical navigation sidebar for course-level browsing with tab-based section switching.

## Import

```tsx
import { SideNav } from '@open-edu/design-system';
```

## Props

| Prop               | Type                      | Default      | Description                                |
| ------------------ | ------------------------- | ------------ | ------------------------------------------ |
| `courseTitle`      | `string`                  | —            | Title shown in the course section header   |
| `children`         | `ReactNode`               | —            | Content rendered below the course title    |
| `onResumeLesson`   | `() => void`              | —            | Callback when "Resume Last Lesson" clicked |
| `activeTab`        | `NavTabId`                | —            | Controlled active tab ID                   |
| `defaultActiveTab` | `NavTabId`                | `'overview'` | Default tab when uncontrolled              |
| `onTabChange`      | `(tab: NavTabId) => void` | —            | Callback when a tab is selected            |

`NavTabId` = `'overview' \| 'modules' \| 'progress' \| 'bookmarks' \| 'settings'`

## Accessibility

- The `<aside>` element has `aria-label="Course navigation"`.
- Active tab buttons have `aria-current="page"`.
- Section icons use `aria-hidden="true"`.

## Examples

```tsx
<SideNav courseTitle="Introduction to JavaScript" onResumeLesson={() => console.log('resume')}>
  <div>Custom module tree</div>
</SideNav>
```
