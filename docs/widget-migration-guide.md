# Widget Migration Guide

## What Changed

Widget IDs have been updated from a flat `open-edu.*` namespace to domain-prefixed IDs. This provides better organization, discoverability, and sets the foundation for the plugin ecosystem.

| Old ID                              | New ID                   |
| ----------------------------------- | ------------------------ |
| `open-edu.matching`                 | `core.matching`          |
| `open-edu.multiple-choice`          | `core.multiple-choice`   |
| `open-edu.multiple-choice-practice` | `core.multiple-choice`   |
| `open-edu.visual-counting`          | `core.visual-counting`   |
| `open-edu.drag-drop`                | `core.drag-drop`         |
| `open-edu.sequencing`               | `core.sequencing`        |
| `open-edu.fill-blank`               | `core.fill-blank`        |
| `open-edu.story-question`           | `core.story-question`    |
| `open-edu.real-world`               | `core.real-world`        |
| `open-edu.fraction-visual`          | `math.fraction-visual`   |
| `open-edu.place-value-chart`        | `math.place-value-chart` |
| `open-edu.grid-area`                | `math.grid-area`         |
| `open-edu.chart-reader`             | `core.chart-reader`      |
| `open-edu.clock-time`               | `math.clock-time`        |
| `open-edu.measurement-scale`        | `math.measurement-scale` |

## Do I Need to Migrate?

**No.** All legacy `open-edu.*` IDs are automatically resolved at runtime via the alias map. Existing courses will continue to work without changes.

**Recommended.** New IDs are more descriptive and will be the standard going forward for all authoring tools, AI generation, and documentation.

## Automatic Migration

Use the CLI migration tool to rewrite all legacy IDs in a course package:

```bash
edu widget migrate ./my-course-package
```

This will:

1. Recursively scan all `.md`, `.json`, and `.jsonc` files in the package
2. Replace all `open-edu.*` widget references with their new domain-prefixed IDs
3. Report what was changed and how many references were migrated

Preview changes without writing:

```bash
edu widget migrate ./my-course-package --dry-run
```

## Manual Migration

Replace widget IDs in your node files:

**Before:**

```json
{
  "type": "exercise",
  "widget": "open-edu.matching",
  "config": {
    "description": "Match the items",
    "pairs": [
      ["A", "1"],
      ["B", "2"]
    ]
  }
}
```

**After:**

```json
{
  "type": "exercise",
  "widget": "core.matching",
  "config": {
    "description": "Match the items",
    "pairs": [
      ["A", "1"],
      ["B", "2"]
    ]
  }
}
```

## Multiple Choice Merge

`open-edu.multiple-choice` and `open-edu.multiple-choice-practice` are now unified as `core.multiple-choice`. The widget supports both modes via config:

- **Quiz mode** (default): `{ "prompt": "...", "options": [...] }` — single correct answer
- **Practice mode**: `{ "questions": [...], "interactive": true }` — multi-question practice with feedback

The `open-edu.multiple-choice-practice` widget is deprecated and will be removed in a future version.

## New Widgets (Experimental)

The following widgets are available as experimental stubs for future use:

| ID                      | Description                       | Status       |
| ----------------------- | --------------------------------- | ------------ |
| `core.callout`          | Highlighted information callout   | Experimental |
| `core.image-compare`    | Side-by-side image comparison     | Experimental |
| `core.hotspot`          | Clickable regions on an image     | Experimental |
| `core.timeline`         | Horizontal timeline visualization | Experimental |
| `science.label-diagram` | Labeled diagram component         | Experimental |
| `science.image-label`   | Image with draggable labels       | Experimental |

## Backward Compatibility

- All legacy `open-edu.*` IDs are automatically resolved via the alias map
- The compiler agent prompt lists both old and new IDs
- No changes required to existing courses
- `multiple-choice-practice` is deprecated — use `core.multiple-choice` with practice config
