# AI Companion MVP Requirement Specification

**Project:** OpenEdu  
**Module:** AI Learning Companion  
**Version:** 1.0 (MVP)  
**Status:** Draft → Ready for Design & Implementation

---

# 1. Vision

## Goal

The AI Companion is a persistent learning assistant integrated throughout the OpenEdu learner experience.

Unlike a general-purpose chatbot, the AI Companion is designed to **support learning, not replace it**.

It should help learners:

- Understand difficult words
- Explain concepts in multiple ways
- Simplify complex text
- Translate content
- Pronounce words correctly
- Answer contextual questions
- Encourage curiosity
- Improve comprehension
- Support accessibility needs

The AI Companion should become the learner's trusted study partner.

---

# 2. Design Principles

## Learning First

The companion should never simply provide answers.

Instead it should:

- Explain
- Guide
- Encourage
- Ask reflective questions
- Give examples
- Build understanding

---

## Context Aware

The companion should automatically understand:

- Current course
- Current chapter
- Current lesson
- Current page
- Current paragraph
- Selected text
- Learner preferences

The learner should never need to repeatedly provide context.

---

## Offline First

Core functionality must work completely offline.

Cloud AI should only enhance the experience.

---

## Accessibility First

Accessibility is a core requirement.

The companion must support:

- Autism-friendly explanations
- Dyslexia-friendly layouts
- Keyboard navigation
- Screen readers
- Adjustable font sizes
- Reduced motion
- Reading-level adaptation
- High contrast mode
- Low stimulation mode

---

## Modular Architecture

Every capability should be implemented as an independent service.

No service should directly depend on a specific AI model or vendor.

---

# 3. Goals

## Primary Goals

- Help learners understand concepts
- Reduce learning friction
- Improve vocabulary
- Encourage curiosity
- Support self-paced learning

## Secondary Goals

- Increase learner engagement
- Improve accessibility
- Reduce dependence on teachers
- Enable offline learning

---

# 4. Non Goals (MVP)

The MVP should **NOT** attempt to become:

- A general ChatGPT clone
- A homework answer generator
- A search engine
- A coding assistant
- A web browser

The companion should remain focused on the current learning context.

---

# 5. High-Level Architecture

```
+-----------------------------------------------------+
|                  AI Companion                       |
+-----------------------------------------------------+
|                                                     |
|  Companion UI                                       |
|       │                                             |
|       ▼                                             |
|  Conversation Manager                               |
|       │                                             |
|       ▼                                             |
|  Context Manager                                    |
|       │                                             |
|       ├──────── Dictionary Service                  |
|       ├──────── Knowledge Service                   |
|       ├──────── Translation Service                 |
|       ├──────── Pronunciation Service               |
|       ├──────── Accessibility Adapter               |
|       ├──────── AI Provider                         |
|       └──────── Cache                               |
|                                                     |
+-----------------------------------------------------+
```

---

# 6. Core Modules

## 6.1 Companion UI

Responsibilities

- Floating companion
- Side panel
- Mobile bottom sheet
- Responsive layouts
- Keyboard navigation
- Screen reader support

---

## 6.2 Conversation Manager

Responsibilities

- Manage conversations
- Store session history
- Reset context when lesson changes
- Support follow-up questions

---

## 6.3 Context Manager

Responsible for collecting:

- Current course
- Current chapter
- Current lesson
- Current page
- Current paragraph
- Selected text
- Learner preferences

Every AI request must include this context.

---

## 6.4 Dictionary Service

Primary offline capability.

Responsibilities:

- Word lookup
- Pronunciation
- Definitions
- Parts of speech
- Examples
- Synonyms
- Antonyms
- Related words
- Translations

---

## 6.5 Knowledge Service

Provides richer educational content.

Each concept should include:

- Definition
- Simple explanation
- Detailed explanation
- Examples
- Common mistakes
- Related concepts
- Related lessons
- Practice questions

---

## 6.6 Translation Service

MVP Languages

- English
- Hindi
- Odia

Future language packs should be plug-in based.

---

## 6.7 Pronunciation Service

Support

- Word pronunciation
- Sentence pronunciation

Offline TTS preferred.

Cloud TTS optional.

---

## 6.8 AI Provider

Responsibilities

- Explanations
- Follow-up discussions
- Analogies
- Simplification
- Reading level adaptation

AI providers must be replaceable.

---

# 7. Entry Points

The AI Companion should be available from everywhere.

## Floating Companion Button

Persistent across learner app.

---

## Text Selection

Selecting text opens:

- Explain
- Define
- Translate
- Pronounce
- Ask Companion

---

## Word Tap

Single tap on supported words opens dictionary.

---

## Reader Toolbar

Quick access from lesson toolbar.

---

## Keyboard Shortcut

Desktop support.

---

# 8. Dictionary Requirements

## Functional Requirements

### Lookup

Return

- Definition
- Pronunciation
- Phonetics
- Part of speech
- Example sentence
- Synonyms
- Antonyms
- Related words
- Translation

---

### Smart Search

Support

Plural forms

```
plants
↓

plant
```

Verb forms

```
running
↓

run
```

Misspellings

```
gravty
↓

gravity
```

Prefix search

```
photo...
```

---

### Offline Search

Must use

SQLite FTS5

or equivalent.

Target latency

< 50 ms

---

# 9. Explanation Module

Support

- Word
- Sentence
- Paragraph

Future

- Diagram
- Image
- Formula

---

## Explanation Styles

- Simple
- Detailed
- Exam
- Child Friendly
- Autism Friendly

---

Example

Input

```
Photosynthesis
```

Output

- Definition
- Simple Explanation
- Example
- Related Concepts

---

# 10. Lesson Awareness

The companion should always know

- Course
- Chapter
- Lesson
- Section
- Page
- Selected text

Example

User asks

```
What is a cell?
```

The answer should depend on the current lesson.

Biology lesson

→ Living cell

Physics lesson

→ Battery cell

---

# 11. Reading Level Adaptation

Support

- Age 6–8
- Age 9–12
- Secondary
- Adult
- Teacher
- Autism Friendly

Every explanation should be adaptable.

---

# 12. Translation

Support

- Word
- Sentence
- Paragraph

Languages

- English
- Hindi
- Odia

Architecture must support future language packs.

---

# 13. Pronunciation

Support

- Word pronunciation
- Sentence pronunciation

Offline first.

---

# 14. Suggested Actions

Instead of blank chat,

Offer suggestions such as:

- Explain this
- What does this mean?
- Give an example
- Translate
- Pronounce
- Quiz me

---

# 15. Explain Current Lesson

The learner may ask

```
Explain this page.
```

The companion should summarize only the current lesson.

Never summarize the entire course.

---

# 16. Quiz Generation

Generate

- Multiple Choice
- True / False
- Fill in the blanks
- One word answers

Only from current lesson.

---

# 17. AI Modes

## Offline Mode

Uses

- Dictionary
- Knowledge Base
- Course Content
- Knowledge Graph

---

## Online Mode

Enhances with

- LLM
- Better explanations
- Analogies
- Rich examples
- Follow-up discussion

---

# 18. Accessibility Features

Required

- Large text
- Simplified language
- Short sentences
- Highlight while reading
- Speech output
- Reduced animations
- Low stimulation theme
- High contrast mode

---

# 19. Reward Integration

Future capability.

Companion should expose hooks for

- Vocabulary Builder
- Curiosity Badge
- Question Master
- Daily Learner

No implementation required in MVP.

---

# 20. User Interface

Support

Desktop

Tablet

Mobile

Responsive.

Panel states

- Floating
- Expanded
- Pinned
- Collapsed

---

# 21. AI Response Layout

Every response may contain

- Definition
- Explanation
- Example
- Translation
- Pronunciation
- Related Concepts
- Try Yourself
- Related Lesson

---

# 22. Data Source Priority

Responses should be generated using

1. Local Dictionary
2. Local Knowledge Base
3. Current Course Content
4. AI Provider
5. Internet (Future)

Higher priority sources override lower ones.

---

# 23. Caching

Cache

- Dictionary lookups
- AI explanations
- Conversation summaries
- Translations

Support offline reuse.

---

# 24. Privacy

Requirements

- Conversations remain local whenever possible
- Cloud AI only receives minimal context
- User consent required for cloud services
- No learner data uploaded by default

---

# 25. Non Functional Requirements

## Performance

Startup

< 1 second

Dictionary lookup

< 50 ms

Offline explanation

< 150 ms

Cloud AI

< 3 seconds

---

## Storage

Initial offline package

< 100 MB

---

## Accessibility

Minimum

WCAG 2.2 AA

---

## Reliability

Offline features should continue working without internet.

---

# 26. Extension Points

Future plugins

- OCR
- Image explanation
- Diagram explanation
- Math solver
- Voice conversation
- Sign language
- Emotion detection
- AR learning
- Teacher mode
- Parent mode

---

# 27. Provider Interfaces

Implementation should use interfaces rather than concrete implementations.

Suggested interfaces

```typescript
DictionaryProvider;

KnowledgeProvider;

TranslationProvider;

PronunciationProvider;

AIProvider;

ContextProvider;

ConversationStore;

CacheProvider;
```

Providers should be replaceable without affecting other modules.

---

# 28. Suggested APIs

```
lookupWord(word)

explainSelection(text)

translate(text)

pronounce(word)

ask(question)

summarizeCurrentLesson()

generateQuiz()

getRelatedConcepts()

searchConcept(query)
```

---

# 29. Success Criteria

The MVP is considered successful when a learner can:

✅ Tap any supported word and immediately view its meaning.

✅ Highlight text and receive an explanation.

✅ Translate words and sentences.

✅ Hear pronunciation.

✅ Ask contextual questions.

✅ Receive reading-level appropriate explanations.

✅ Continue a contextual conversation within the lesson.

✅ Use all dictionary and knowledge features offline.

✅ Access the companion using keyboard, touch, or assistive technologies.

---

# 30. Deliverables

## UX

- User journeys
- Wireframes
- Responsive layouts
- Accessibility review

---

## Design

- OpenEdu design tokens
- Light theme
- Dark theme
- Low stimulation theme

---

## Architecture

- Component diagram
- State management
- Data flow
- Offline strategy
- Caching strategy

---

## Implementation

- Companion UI
- Dictionary Service
- Knowledge Service
- AI Provider
- Translation Service
- Pronunciation Service
- Context Manager
- Conversation Manager
- Unit Tests
- Integration Tests

---

## Documentation

- ADR
- API documentation
- Extension guide
- Provider documentation
- Accessibility notes

---

# 31. Future Roadmap

## Phase 2

- Voice conversation
- Image explanation
- OCR
- Offline AI
- Personalized learning

## Phase 3

- Avatar companion
- Multi-agent tutoring
- Parent companion
- Teacher companion
- Learning analytics
- Adaptive study plans

---

# Appendix A — Guiding Principle

> The AI Companion should **teach learners how to think, not simply tell them what to think.**

Every interaction should improve understanding, build confidence, and encourage curiosity while remaining accessible, offline-first, and privacy-respecting.
