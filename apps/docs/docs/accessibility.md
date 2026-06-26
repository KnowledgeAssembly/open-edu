---
sidebar_position: 8
---

# Accessibility Engine (`@open-edu/accessibility`)

Accessibility is a core subsystem, not a plugin. It provides focus management, ARIA generation, screen reader announcements, and automated auditing — all automatic for content authors.

## AccessibilityProvider

Wrap your app or course view to enable all accessibility features:

```tsx
import { AccessibilityProvider } from '@open-edu/accessibility';

function App() {
  return (
    <AccessibilityProvider>
      <YourCourseView />
    </AccessibilityProvider>
  );
}
```

## Focus Management

| Export                  | Purpose                                               |
| ----------------------- | ----------------------------------------------------- |
| `FocusProvider`         | Context provider for focus state tracking             |
| `useFocusContext`       | Access current focus state and navigation history     |
| `useAutoFocus`          | Automatically focus an element when it mounts         |
| `useFocusTrap`          | Trap keyboard focus within a region (modals, quizzes) |
| `useKeyboardNavigation` | Arrow-key navigation within a list                    |
| `FocusTrap`             | Component wrapper that traps focus                    |

## Live Regions & Announcements

| Export               | Purpose                                             |
| -------------------- | --------------------------------------------------- |
| `LiveRegionProvider` | Context provider for screen reader announcements    |
| `useLiveRegion`      | Post assertive or polite messages to screen readers |
| `AriaProvider`       | Context provider for ARIA state management          |
| `useAriaContext`     | Access and set ARIA attributes dynamically          |
| `useAnnouncement`    | Announce node transitions and feedback              |

## Automated Auditing

```tsx
import { AxeValidator } from '@open-edu/accessibility';

function DevTools() {
  return <AxeValidator />;
}
```

The `AxeValidator` component runs axe-core checks on the rendered DOM and logs violations to the console. In the dev server, violations appear in the accessibility inspector panel.
