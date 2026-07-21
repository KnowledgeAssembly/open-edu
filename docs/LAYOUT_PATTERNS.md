# OpenEdu Layout Patterns

## Rule 1

Every screen must have a primary purpose.

One screen = One primary task.

---

# App Shell

Used for:

- Dashboard
- Navigation
- Global search
- Settings

Structure:

Header
Sidebar
Content Area

Pattern:

┌───────────────────────┐
│ Header │
├───────┬───────────────┤
│ Nav │ Content │
│ │ │
└───────┴───────────────┘

Reference:

Linear

---

# Learning Shell

Used for:

- Lessons
- Activities
- Reading

Structure:

Course Navigation
Learning Content
Progress Indicator

Pattern:

┌───────────────────────┐
│ Lesson Header │
├───────┬───────────────┤
│ Course│ Content │
│ Nav │ │
└───────┴───────────────┘

Reference:

Khan Academy

---

# Reader Shell

Used for:

- Articles
- Notes
- Explanations

Structure:

Centered content column

Pattern:

┌───────────────────────┐
│ │
│ Reading Column │
│ │
└───────────────────────┘

Maximum width:

70–80 characters per line

Reference:

Notion

---

# Studio Shell

Used for:

- Workflow Studio
- Authoring
- AI Tools

Structure:

Left Panel
Canvas
Right Panel

Pattern:

┌──────┬──────────┬─────┐
│ Tools│ Canvas │Info │
└──────┴──────────┴─────┘

Reference:

Linear + Figma

---

# Surface Hierarchy

Level 0

Canvas

Default page background

---

Level 1

Sections

Logical grouping

---

Level 2

Interactive Containers

Forms
Panels
Widgets

---

Level 3

Temporary Overlays

Dialogs
Menus
Popovers

---

# Content Width Rules

Reading:

640–800px

Forms:

480–640px

Dashboards:

Full width

Learning Activities:

Responsive
Content-focused

---

# Empty States

Every empty state must:

Explain

Why empty

Suggest

What to do next

Provide

One primary action
