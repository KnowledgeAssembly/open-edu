# OpenEdu Notepad MVP

## Agent Prompt Specification

Version: 1.0
Status: MVP
Priority: High

---

# Objective

Implement the OpenEdu Notepad MVP.

The goal is NOT to build a general-purpose note-taking application.

The goal is to help learners capture, organize, and revisit learning insights while studying.

The feature must be:

- Offline-first
- Fast
- Minimal
- Accessible
- Portable
- Learning-focused

The MVP should intentionally avoid advanced PKM and productivity features.

---

# Product Context

OpenEdu is an educational platform.

The notepad acts as a learning companion integrated into lessons.

Learners should be able to:

- Take notes while studying
- Capture important ideas
- Save questions
- Search notes
- Review notes later

Notes are associated with learning content.

---

# MVP Scope

Implement ONLY the following features.

---

# Feature 1: Lesson Notes

Every lesson must provide a note-taking area.

Layout:

```text
+--------------------------------+
| Lesson Content                 |
|                                |
|                                |
+--------------------------------+

+--------------------------------+
| My Notes                       |
|                                |
|                                |
+--------------------------------+
```

Requirements:

- Notes linked to lesson
- Notes linked to course
- Autosave
- Offline support

User Story:

"As a learner, I want to write notes while studying without leaving the lesson."

---

# Feature 2: Standalone Notes

Allow users to create independent notes.

Examples:

- Exam preparation
- Questions
- Revision notes

Requirements:

- Create note
- Rename note
- Delete note
- Search note

---

# Feature 3: Markdown Editor

Support only:

```md
# Heading

## Heading

**Bold**

_Italic_

- List

1. List

> Quote

`Inline code`
```

Do NOT implement:

- Tables
- Mermaid
- Drawings
- Embeds
- Whiteboards
- Complex formatting

Editor Requirements:

- Lightweight
- Fast
- Mobile-friendly

Preferred:

- CodeMirror
- TipTap (Markdown mode)

---

# Feature 4: Autosave

Behavior:

```text
User Types
     ↓
Debounced Save
     ↓
Local Database
```

Requirements:

- No save button
- Save every few seconds
- Prevent data loss

---

# Feature 5: Notes Dashboard

Create a Notes Home screen.

Sections:

```text
Notes

Recent Notes

Favorites

Tags
```

Required:

- List notes
- Open note
- Delete note
- Favorite note

---

# Feature 6: Search

Search across:

- Title
- Content
- Tags

Example:

```text
Search: photosynthesis
```

Results should display:

```text
Title

Snippet

Course/Lesson
```

Requirements:

- Instant search
- Works offline

Preferred:

- SQLite FTS5
- MiniSearch
- FlexSearch

---

# Feature 7: Tags

Support:

```text
#important

#revision

#question
```

Requirements:

- Add tag
- Remove tag
- Filter by tag

Do not build nested tags.

---

# Feature 8: Favorites

Users can star notes.

Purpose:

- Quick access
- Revision

Requirements:

```text
★ Favorite
☆ Not Favorite
```

---

# Feature 9: Export

Allow exporting notes.

Formats:

```text
Markdown (.md)

JSON (.json)
```

Requirements:

- Single note export
- All notes export

User owns data.

---

# Out Of Scope

Do NOT implement:

## Knowledge Graph

```md
[[Photosynthesis]]
```

Skip.

---

## Backlinks

Skip.

---

## AI Summary

Skip.

---

## AI Flashcards

Skip.

---

## AI Quiz Generation

Skip.

---

## Collaboration

Skip.

---

## Shared Notes

Skip.

---

## Audio Notes

Skip.

---

## Whiteboard

Skip.

---

## Infinite Canvas

Skip.

---

## Real-Time Sync

Skip.

---

# UX Principles

Follow OpenEdu design philosophy.

## Calm Interface

Avoid:

- Complex toolbars
- Enterprise UI
- Notion-like clutter

Prefer:

- Spacious layouts
- Minimal controls
- Progressive disclosure

---

## Learning First

Prioritize:

- Reading
- Reflection
- Revision

Over:

- Organization features
- Productivity features

---

## Mobile Friendly

Must work on:

- Desktop
- Tablet
- Mobile

Responsive by default.

---

# Accessibility Requirements

Must support:

- Keyboard navigation
- Screen readers
- High contrast mode
- Reduced motion mode
- Zoom up to 200%

WCAG AA compliance preferred.

---

# Data Model

Minimum model:

```ts
interface Note {
  id: string;

  title: string;

  content: string;

  tags: string[];

  favorite: boolean;

  createdAt: string;

  updatedAt: string;

  courseId?: string;

  lessonId?: string;
}
```

---

# Storage Architecture

Preferred:

## Browser

```text
SQLite WASM
+
OPFS
```

Fallback:

```text
IndexedDB
```

Requirements:

- Offline-first
- Local-first
- Fast startup
- Portable exports

---

# Suggested Database Schema

```sql
CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  favorite INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT,
  course_id TEXT,
  lesson_id TEXT
);
```

Tags:

```sql
CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE
);
```

Relations:

```sql
CREATE TABLE note_tags (
  note_id TEXT,
  tag_id TEXT
);
```

---

# Screens To Implement

## Screen 1

Lesson Notes Panel

---

## Screen 2

Notes Dashboard

---

## Screen 3

Note Editor

---

## Screen 4

Search Notes

---

# Deliverables

Produce:

1. Feature architecture
2. Database schema
3. Component hierarchy
4. State management design
5. Storage implementation
6. Responsive layouts
7. Accessibility review
8. Test plan

---

# Success Criteria

A learner should be able to:

✓ Open lesson

✓ Write note

✓ Leave lesson

✓ Return later

✓ Find note instantly

✓ Export note

✓ Use feature offline

without reading documentation.

If a feature does not directly improve learning, defer it to a future phase.
