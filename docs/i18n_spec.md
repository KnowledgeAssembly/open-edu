# OpenEdu Internationalization (i18n) Plumbing Specification

## Phase 0 Foundation Architecture

**Status:** Draft
**Version:** 1.0
**Scope:** Platform Infrastructure
**Priority:** Critical Foundation

---

# 1. Purpose

This document defines the foundational internationalization (i18n) architecture for OpenEdu.

The objective is to ensure multilingual support is designed into the platform from the beginning rather than added later.

OpenEdu must be capable of supporting:

- Multiple UI languages
- Multiple content languages
- Multiple writing systems
- Accessibility localization
- Locale-aware search
- AI-assisted translation workflows
- Future RTL (Right-To-Left) language support

without requiring architectural redesign.

---

# 2. Design Principles

## 2.1 Multilingual First

The platform must not assume English as the permanent source language.

The architecture should support:

```text
Canonical Content
        ↓
Localized Variants
```

rather than:

```text
English
   ↓
Translated Languages
```

---

## 2.2 Locale Awareness Everywhere

Every subsystem should understand locale information.

Examples:

- UI Components
- Widgets
- Course Content
- Assessments
- Search
- Accessibility
- AI Pipelines

---

## 2.3 Translation Is Data

Translations should not be hardcoded.

All translatable content must be externalized.

---

## 2.4 Platform Independence

The same i18n infrastructure must work across:

- Web
- PWA
- Capacitor Mobile Apps
- Tauri Desktop Apps

---

## 2.5 Accessibility First

Language information must be available to:

- Screen readers
- Assistive technologies
- Search engines

---

# 3. Supported Languages

## Phase 0

| Language | Code |
| -------- | ---- |
| English  | en   |

---

## Phase 1

| Language | Code |
| -------- | ---- |
| Hindi    | hi   |
| Odia     | or   |

---

## Future

| Language  | Code |
| --------- | ---- |
| Tamil     | ta   |
| Telugu    | te   |
| Bengali   | bn   |
| Marathi   | mr   |
| Kannada   | kn   |
| Malayalam | ml   |
| Urdu      | ur   |

The architecture must support arbitrary future locales.

---

# 4. Package Structure

Create:

```text
packages/
└── i18n/
    ├── locales/
    │   ├── en/
    │   ├── hi/
    │   └── or/
    │
    ├── dictionaries/
    │
    ├── locale.ts
    ├── formatter.ts
    ├── direction.ts
    ├── provider.tsx
    ├── hooks.ts
    └── index.ts
```

---

# 5. Locale Core

## Locale Type

```ts
export type Locale = 'en' | 'hi' | 'or';
```

---

## Locale Context

```ts
export interface LocaleContext {
  locale: Locale;
  direction: 'ltr' | 'rtl';
}
```

---

## Direction Utility

```ts
export function getDirection(locale: Locale): 'ltr' | 'rtl';
```

Requirements:

- LTR support today
- RTL-ready architecture
- Urdu support later without changes

---

# 6. Translation Engine

Implement:

```ts
t(
  key: string,
  locale?: Locale,
  params?: Record<string, string>
)
```

---

## Requirements

### Key-Based Translation

```ts
t('common.next');
```

---

### Nested Keys

```json
{
  "common": {
    "next": "Next"
  }
}
```

---

### Parameter Interpolation

```json
{
  "welcome": "Welcome {{name}}"
}
```

Usage:

```ts
t('welcome', {
  name: 'Arin',
});
```

---

### Fallback Support

If translation is missing:

```text
Requested Locale
       ↓
Fallback Locale (English)
```

---

### Missing Translation Detection

Development mode should warn when:

- Translation key is missing
- Namespace is missing
- Locale file is missing

---

# 7. React Integration

## Provider

Implement:

```tsx
<I18nProvider>
```

Responsibilities:

- Locale state management
- Dictionary loading
- Direction management
- Runtime switching

---

## Hook

Provide:

```tsx
const { locale, setLocale, direction, t } = useTranslation();
```

---

## Example

```tsx
<Button>{t('common.next')}</Button>
```

---

# 8. Language Switcher

Implement:

```tsx
<LanguageSwitcher />
```

Capabilities:

- Switch locale
- Persist preference
- Runtime updates
- No page reload

---

## Persistence

Phase 0:

```text
localStorage
```

Future:

```text
User Profile Settings
```

---

# 9. Course Content Localization

## Goal

Enable multilingual course content without schema migrations.

---

## Supported Structure

```yaml
title:
  en: Photosynthesis
  hi: प्रकाश संश्लेषण
  or: ପ୍ରକାଶ ସଂଶ୍ଳେଷଣ
```

---

## Alternative Structure

```yaml
titleKey: course.photosynthesis.title
```

with translation bundles.

---

## Requirements

The architecture should document:

- Pros/Cons of embedded translations
- Pros/Cons of translation bundles
- Recommended approach for OpenEdu

---

# 10. Widget Localization

Every widget must receive locale information.

---

## Widget Context

```ts
interface WidgetContext {
  locale: Locale;
}
```

---

## Examples

### Quiz Widget

Localizable fields:

```ts
question;
answers;
feedback;
```

---

### Timeline Widget

Localizable fields:

```ts
title;
label;
description;
```

---

### Diagram Widget

Localizable fields:

```ts
annotations;
labels;
captions;
```

---

### SVG Widgets

Must support:

```ts
locale;
```

for rendering translated labels.

---

# 11. Typography System

## Requirements

Support:

- Latin
- Devanagari
- Odia
- Tamil
- Telugu
- Kannada
- Malayalam
- Urdu

---

## Font Strategy

Primary family:

```text
Noto Sans
```

Secondary:

```text
Noto Serif
```

Code:

```text
JetBrains Mono
```

---

## Design Tokens

```css
--font-ui
--font-content
--font-mono
```

---

# 12. Search Localization

Search infrastructure must be locale-aware.

---

## Search Document Schema

```ts
interface SearchDocument {
  id: string;
  locale: string;
  title: string;
  body: string;
}
```

---

## Requirements

Support:

- Locale-aware indexing
- Locale-aware tokenization
- Language filtering

---

## Non-Goals

Phase 0 does NOT require:

- Cross-language retrieval
- Multilingual ranking
- Machine translation search

---

# 13. Accessibility Localization

The platform must expose language metadata.

---

## HTML Language Attribute

Example:

```html
<html lang="hi"></html>
```

---

## Requirements

Support:

- Screen readers
- Assistive technologies
- Search indexing

---

## Accessible Labels

All translated UI text must remain accessible.

Examples:

- aria-label
- aria-describedby
- aria-labelledby

---

# 14. Locale Formatting

Create utilities:

```ts
formatDate();
formatNumber();
formatPercent();
formatCurrency();
```

using:

```ts
Intl.*
```

APIs.

---

## Example

```ts
formatNumber(100000, 'hi');
```

must respect locale formatting conventions.

---

# 15. AI Translation Extension Points

Phase 0 should prepare for future AI translation workflows.

---

## Interfaces

```ts
interface TranslationProvider {}
```

```ts
interface TranslationJob {}
```

```ts
interface TranslationStatus {}
```

---

## Purpose

Future AI systems should be able to:

- Generate translations
- Track translation status
- Manage review workflows

without changing existing schemas.

---

# 16. Developer Tooling

Create CLI utilities.

---

## Extract

```bash
pnpm i18n:extract
```

Purpose:

- Discover translation keys

---

## Validate

```bash
pnpm i18n:validate
```

Purpose:

- Verify locale files

---

## Missing

```bash
pnpm i18n:missing
```

Purpose:

- Detect untranslated strings

---

# 17. Acceptance Criteria

The implementation is complete when:

### Locale Management

- New locale added in under 15 minutes

### Runtime Switching

- Language changes without page reload

### Widget Support

- Any widget can be localized without framework modifications

### Course Support

- Any course can contain localized content

### Accessibility

- Screen readers receive correct language information

### Search

- Search indexes support locale awareness

### Future Proofing

- RTL languages can be added without architectural changes

### Cross Platform

The same infrastructure works for:

- Web
- PWA
- Capacitor Mobile
- Tauri Desktop

---

# 18. Non-Goals

The following are intentionally excluded from Phase 0:

- Translation Management System (TMS)
- Community Translation Platform
- AI Translation Generation
- Human Review Workflow
- Translation Marketplace
- Regional Content Packs
- Cross-Language Search

These will be addressed in future roadmap phases.

---

# 19. Deliverables

The implementation team must produce:

1. Technical Architecture Document
2. Folder Structure
3. TypeScript Interfaces
4. Translation Engine
5. React Integration
6. Language Switcher
7. Course Schema Examples
8. Widget Integration Examples
9. Search Integration Design
10. Accessibility Design
11. CLI Tooling
12. ADRs for major architectural decisions

---

# Success Definition

OpenEdu should be able to evolve from:

```text
English Only
```

to:

```text
Dozens of Languages
```

without changing:

- Course schemas
- Widget APIs
- Search architecture
- Accessibility infrastructure
- Platform architecture
- Mobile/Desktop applications

The Phase 0 i18n plumbing should remain stable for the next 3–5 years of OpenEdu development.
