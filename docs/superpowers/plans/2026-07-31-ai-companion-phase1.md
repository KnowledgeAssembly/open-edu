# AI Companion Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Phase 1 of the Pipili AI companion: a persistent FAB, a global `Ctrl/Cmd+Shift+P` shortcut, a reader toolbar in the course view, an explanation-style picker that changes Pipili's response formatting, and a pluggable emoji system with OpenMoji SVG support and native-text fallback.

**Architecture:** Five features layered on the existing learner-app companion stack. The emoji system is a decoupled `EmojiPack` strategy in `@open-edu/design-system` (`NativeEmojiPack` + `createOpenMojiPack`) consumed by an `<EmojiText>` renderer; the learner app owns the user preference (`oe-emoji-pack` in `localStorage`) and injects it into `PipiliMessage`. Explanation style flows from a `CompanionProvider` preference (`oe-explanation-style`) through `learningContextToSnapshot` into the `/api/pipili/chat` request context, where `policy.ts` injects style/emoji instructions into the system prompt.

**Tech Stack:** TypeScript 5.x, React 18, Tailwind CSS (tokens via `--oe-*`), pnpm workspaces, Vitest + jsdom, `@open-edu/design-system`, `@open-edu/ai-companion`, `@open-edu/i18n`.

---

## Context for the implementer

Read this before writing any code. It saves you from exploring the codebase.

- **Monorepo, pnpm workspaces.** Never run `npm`. Run package-scoped commands via `pnpm --filter <pkg> ...`.
- **Shell is macOS zsh.** Default git branch is `main`.
- **`@open-edu/ai-companion/pipili` resolves to the BUILT `dist/` folder** (see `packages/ai-companion/package.json` exports). The root `@open-edu/ai-companion` resolves to `src/`. **After editing `@open-edu/ai-companion` source you MUST run `pnpm --filter @open-edu/ai-companion build`** or the learner app's typecheck (which imports `policy.ts`/`handler.ts` from the `./pipili` subpath) will fail against stale types.
- **i18n:** `t('learner.<key>')` resolves to `<key>` in `packages/i18n/locales/en/learner.json` (a flat JSON). Every `t()` key you add to `apps/learner/src` MUST exist in that file — a repo test (`packages/i18n/src/i18n-keys.test.ts`) scans learner source for `t('...')` keys and fails if any key is missing. Add keys in **Task 1** before any component uses them.
- **Hardcoded string lint:** `apps/learner/src` is scanned by `scripts/lint-no-hardcoded-strings.mjs`. All new JSX text must be `{t('learner...')}` expressions. Use `aria-label` on dots/indicators; never render bare English text like `Ctrl⇧P`.
- **No dev-server Tailwind regeneration needed.** `scripts/check-tailwind-css.mjs` only scans `packages/runtime/src`, which this plan does not touch.
- **Existing test setup:** learner tests already wire up `fake-indexeddb`, `@testing-library/jest-dom`, and axe. `@open-edu/design-system/test-utils` exports `checkAccessibility(ui)`. Existing patterns: `apps/learner/src/ai/__tests__/PipiliMessage.test.tsx`, `apps/learner/src/ai/CompanionPanel.test.tsx` (both wrap in `CompanionProvider`).
- **The companion panel plumbing:** `AppShell.tsx` renders `CourseRightSidebar` (right sidebar, always mounted) and `CompanionFloatingUI` (the FAB). `panelState` lives in `CompanionProvider` (`'closed' | 'floating' | 'expanded' | 'pinned'`); only `'closed'`/`'floating'` are currently used. The chat POST body is built in `PipiliChatProvider` via `learningContextToSnapshot(contextRef.current)`.
- **Key files with line anchors (read them before starting):**
  - `apps/learner/src/AppShell.tsx:229` (panelState hook), `:654-669` (course `header` prop), `:821-837` (`CompanionFloatingUI`)
  - `apps/learner/src/ai/CompanionProvider.tsx` (panelState + context value, line 29-67)
  - `apps/learner/src/ai/PipiliChatProvider.tsx:49-70` (contextRef + transport)
  - `apps/learner/src/ai/context-mapper.ts`
  - `apps/learner/src/pipili/policy.ts` (`buildSystemPrompt`), `apps/learner/src/pipili/config.ts` (context zod schema), `apps/learner/src/pipili/handler.ts:67-81`
  - `apps/learner/src/ai/PipiliMessage.tsx:26-38` (text rendering)
  - `apps/learner/src/CourseRightSidebar.tsx:110-128` (pipili tab), `apps/learner/src/ai/CompanionPanel.tsx:89-114` (header + PipiliChat)
  - `apps/learner/src/SettingsPage.tsx:152-202` (last Card — add emoji Card after it)
  - `packages/design-system/src/index.ts` ("// Primitives" section, `pipili` export at line 121)

## Confirmed defaults (from the source plan's "User Review Required")

1. **OpenMoji is loaded from the jsDelivr CDN** (`https://cdn.jsdelivr.net/npm/openmoji-static@15.0.0/single_svg/{HEX}.svg`), with native Unicode text fallback on image load error / offline.
2. **Keyboard shortcut is `Ctrl+Shift+P` / `Cmd+Shift+P`.**

---

## Task 1: Add i18n keys to learner.json

**Files:**

- Modify: `packages/i18n/locales/en/learner.json`

- [ ] **Step 1: Add the new keys.**

Open `packages/i18n/locales/en/learner.json`. It is a flat JSON object. Insert the following lines immediately **after** line 139 (`"pipili.thinking": "Pipili is thinking...",`). Keep the surrounding indentation (2 spaces) and trailing-comma style used by the rest of the file:

```json
  "reader_toolbar.label": "Ask Pipili",
  "reader_toolbar.unread": "New messages",
  "reader_toolbar.shortcut_mac": "⌘⇧P",
  "reader_toolbar.shortcut_other": "Ctrl⇧P",
  "explanation_style.label": "Explanation style",
  "explanation_style.simple": "Simple",
  "explanation_style.detailed": "Detailed",
  "explanation_style.exam": "Exam",
  "explanation_style.child_friendly": "Child-Friendly",
  "explanation_style.autism_friendly": "Autism-Friendly",
  "settings.emoji_pack": "Emoji Style",
  "settings.emoji_pack_description": "Choose how emojis appear in Pipili messages",
  "settings.emoji_native": "Native",
  "settings.emoji_native_description": "Use your device's standard emojis (works offline)",
  "settings.emoji_openmoji": "OpenMoji",
  "settings.emoji_openmoji_description": "Render OpenMoji SVG icons (requires internet)",
```

- [ ] **Step 2: Verify the JSON is valid and keys are found by the validation test.**

Run:

```bash
python3 -c "import json; json.load(open('packages/i18n/locales/en/learner.json')); print('JSON OK')"
pnpm --filter @open-edu/i18n exec vitest run src/i18n-keys.test.ts
```

Expected: `JSON OK`, then vitest PASS for the i18n key validation suite.

- [ ] **Step 3: Commit**

```bash
git add packages/i18n/locales/en/learner.json
git commit -m "feat(i18n): add phase-1 companion i18n keys"
```

---

## Task 2: Add `ExplanationStyle` + learner profile fields to `@open-edu/ai-companion`

**Files:**

- Modify: `packages/ai-companion/src/providers/types.ts`
- Modify: `packages/ai-companion/src/pipili/types.ts`
- Modify: `packages/ai-companion/src/pipili/index.ts`
- Modify: `packages/ai-companion/src/index.ts`

- [ ] **Step 1: Edit `packages/ai-companion/src/providers/types.ts`.**

(a) Insert this type just above the `ExplanationRequest` interface (line 37):

```ts
export type ExplanationStyle =
  | 'simple'
  | 'detailed'
  | 'exam'
  | 'child_friendly'
  | 'autism_friendly';
```

(b) Change `ExplanationRequest.style` to use the new type. Replace:

```ts
style: 'simple' | 'detailed' | 'child_friendly' | 'autism_friendly' | 'exam';
```

with:

```ts
style: ExplanationStyle;
```

(c) Extend `LearningContext.learnerPreferences`. Replace:

```ts
  learnerPreferences?: {
    readingLevel?: string;
    language?: string;
  };
```

with:

```ts
  learnerPreferences?: {
    readingLevel?: string;
    language?: string;
    explanationStyle?: ExplanationStyle;
    emojiMode?: 'native' | 'openmoji';
  };
```

- [ ] **Step 2: Edit `packages/ai-companion/src/pipili/types.ts`.**

(a) Add an import at the top (after the blank line, before the first interface):

```ts
import type { ExplanationStyle } from '../providers/types.js';
```

(b) Extend `LearnerProfile`. Replace:

```ts
export interface LearnerProfile {
  language: string;
  readingLevel: string;
  accessibilityProfile?: AccessibilityProfile;
}
```

with:

```ts
export interface LearnerProfile {
  language: string;
  readingLevel: string;
  accessibilityProfile?: AccessibilityProfile;
  explanationStyle?: ExplanationStyle;
  emojiMode?: 'native' | 'openmoji';
}
```

- [ ] **Step 3: Re-export `ExplanationStyle` from `packages/ai-companion/src/pipili/index.ts`.**

Add `ExplanationStyle,` to the type list at the top of the file (the list currently starts `PipiliRequest,`). The first lines become:

```ts
export type {
  ExplanationStyle,
  PipiliRequest,
  PipiliMessage,
  PipiliContextSnapshot,
  ...
```

- [ ] **Step 4: Re-export `ExplanationStyle` from `packages/ai-companion/src/index.ts`.**

Add `ExplanationStyle,` to the first type-export block (which starts with `DictionaryEntry,`):

```ts
export type {
  DictionaryEntry,
  DictionaryProvider,
  LearningContext,
  ExplanationRequest,
  ExplanationStyle,
  ...
```

- [ ] **Step 5: Build ai-companion to regenerate `dist/` (the `./pipili` subpath resolves there).**

```bash
pnpm --filter @open-edu/ai-companion build
pnpm --filter @open-edu/ai-companion typecheck
```

Expected: build succeeds (emits to `dist/`), typecheck passes with no errors.

- [ ] **Step 6: Commit**

```bash
git add packages/ai-companion/src packages/ai-companion/dist
git commit -m "feat(ai-companion): add ExplanationStyle type and learner profile fields"
```

---

## Task 3: `EmojiPack` strategy + `<EmojiText>` in `@open-edu/design-system` (TDD)

**Files:**

- Create: `packages/design-system/src/primitives/emoji-packs.ts`
- Create: `packages/design-system/src/primitives/EmojiText.tsx`
- Test: `packages/design-system/src/primitives/__tests__/EmojiText.test.tsx`
- Modify: `packages/design-system/src/index.ts`

- [ ] **Step 1: Write the failing test.**

Create `packages/design-system/src/primitives/__tests__/EmojiText.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmojiText, splitEmojiRuns, emojiToHex } from '../EmojiText.js';
import { NativeEmojiPack, createOpenMojiPack } from '../emoji-packs.js';
import { checkAccessibility } from '@open-edu/design-system/test-utils';

describe('splitEmojiRuns', () => {
  it('splits plain text into a single text run', () => {
    expect(splitEmojiRuns('Hello world')).toEqual([{ type: 'text', value: 'Hello world' }]);
  });

  it('splits emoji and text into alternating runs', () => {
    expect(splitEmojiRuns('Great job 🌟 Keep going!')).toEqual([
      { type: 'text', value: 'Great job ' },
      { type: 'emoji', value: '🌟' },
      { type: 'text', value: ' Keep going!' },
    ]);
  });

  it('keeps skin-tone and ZWJ sequences in a single emoji run', () => {
    const runs = splitEmojiRuns('Hi 👋🏽 family 👨‍👩‍👧');
    expect(runs.filter((r) => r.type === 'emoji')).toHaveLength(2);
  });
});

describe('emojiToHex', () => {
  it('converts 🌟 (U+1F31F) to 1F31F', () => {
    expect(emojiToHex('🌟')).toBe('1F31F');
  });
});

describe('EmojiText', () => {
  it('renders raw text for the native pack', () => {
    render(<EmojiText text="Hello 🌟" pack={NativeEmojiPack} />);
    expect(screen.getByText('Hello 🌟')).toBeInTheDocument();
  });

  it('renders an SVG img for an OpenMoji pack', () => {
    render(<EmojiText text="Great job 🌟" pack={createOpenMojiPack()} />);
    const img = screen.getByAltText('🌟');
    expect(img).toHaveAttribute(
      'src',
      'https://cdn.jsdelivr.net/npm/openmoji-static@15.0.0/single_svg/1F31F.svg',
    );
  });

  it('falls back to native emoji text when the image fails to load', () => {
    render(<EmojiText text="Great job 🌟" pack={createOpenMojiPack()} />);
    fireEvent.error(screen.getByAltText('🌟'));
    expect(screen.getByText('🌟')).toBeInTheDocument();
  });

  it('keeps surrounding text when rendering an OpenMoji pack', () => {
    render(<EmojiText text="Great job 🌟 Keep going!" pack={createOpenMojiPack()} />);
    expect(screen.getByText('Great job ')).toBeInTheDocument();
    expect(screen.getByText(' Keep going!')).toBeInTheDocument();
  });

  describe('accessibility', () => {
    it('has no axe violations with native pack', async () => {
      await checkAccessibility(<EmojiText text="Hello 🌟" pack={NativeEmojiPack} />);
    });

    it('has no axe violations with OpenMoji pack', async () => {
      await checkAccessibility(<EmojiText text="Hello 🌟" pack={createOpenMojiPack()} />);
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails.**

```bash
pnpm --filter @open-edu/design-system exec vitest run src/primitives/__tests__/EmojiText.test.tsx
```

Expected: FAIL (module `../EmojiText.js` not found).

- [ ] **Step 3: Implement `packages/design-system/src/primitives/emoji-packs.ts`.**

```ts
export type EmojiPackFormat = 'svg' | 'png' | 'native';

export interface EmojiPack {
  id: string;
  name: string;
  format: EmojiPackFormat;
  getUrl?: (hexCodePoint: string) => string;
  fallbackToNative?: boolean;
}

export const NativeEmojiPack: EmojiPack = {
  id: 'native',
  name: 'Native',
  format: 'native',
  fallbackToNative: true,
};

export const OPENMOJI_CDN_BASE_URL =
  'https://cdn.jsdelivr.net/npm/openmoji-static@15.0.0/single_svg';

export interface OpenMojiPackOptions {
  id?: string;
  name?: string;
  baseUrl?: string;
}

export function createOpenMojiPack(options: OpenMojiPackOptions = {}): EmojiPack {
  const baseUrl = options.baseUrl ?? OPENMOJI_CDN_BASE_URL;
  return {
    id: options.id ?? 'openmoji',
    name: options.name ?? 'OpenMoji',
    format: 'svg',
    getUrl: (hexCodePoint: string) => `${baseUrl}/${hexCodePoint}.svg`,
    fallbackToNative: true,
  };
}
```

- [ ] **Step 4: Implement `packages/design-system/src/primitives/EmojiText.tsx`.**

```tsx
import * as React from 'react';
import { cn } from '../lib/utils.js';
import type { EmojiPack } from './emoji-packs.js';

export interface EmojiTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  text: string;
  pack: EmojiPack;
}

export type EmojiRun = { type: 'emoji' | 'text'; value: string };

const EMOJI_RUN_REGEX =
  /\p{Extended_Pictographic}(?:\u{FE0F}|[\u{1F3FB}-\u{1F3FF}]|\u{200D}\p{Extended_Pictographic})*/gu;

export function splitEmojiRuns(text: string): EmojiRun[] {
  const runs: EmojiRun[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(EMOJI_RUN_REGEX)) {
    const index = match.index;
    if (index > lastIndex) {
      runs.push({ type: 'text', value: text.slice(lastIndex, index) });
    }
    runs.push({ type: 'emoji', value: match[0] });
    lastIndex = index + match[0].length;
  }
  if (lastIndex < text.length) {
    runs.push({ type: 'text', value: text.slice(lastIndex) });
  }
  return runs;
}

export function emojiToHex(emoji: string): string {
  const codePoint = emoji.codePointAt(0) ?? 0;
  return codePoint.toString(16).toUpperCase().padStart(4, '0');
}

export const EmojiText = React.forwardRef<HTMLSpanElement, EmojiTextProps>(function EmojiText(
  { text, pack, className, ...props },
  ref,
): JSX.Element {
  if (pack.format === 'native' || !pack.getUrl) {
    return (
      <span ref={ref} className={cn(className)} {...props}>
        {text}
      </span>
    );
  }

  const runs = splitEmojiRuns(text);

  return (
    <span ref={ref} className={cn(className)} {...props}>
      {runs.map((run, i) =>
        run.type === 'emoji' ? (
          <EmojiGlyph key={i} emoji={run.value} pack={pack} />
        ) : (
          <React.Fragment key={i}>{run.value}</React.Fragment>
        ),
      )}
    </span>
  );
});
EmojiText.displayName = 'EmojiText';

function EmojiGlyph({ emoji, pack }: { emoji: string; pack: EmojiPack }): JSX.Element {
  const [failed, setFailed] = React.useState(false);
  const src = pack.getUrl?.(emojiToHex(emoji));

  if (failed || !src) {
    return <span role="img">{emoji}</span>;
  }

  return (
    <img
      src={src}
      alt={emoji}
      draggable={false}
      loading="lazy"
      className="inline-block h-[1.2em] w-[1.2em] object-contain align-[-0.2em]"
      onError={() => setFailed(true)}
    />
  );
}
```

> Note: for multi-codepoint emoji (skin tone / ZWJ) the renderer uses the first code point, which OpenMoji ships a glyph for; anything unmappable falls back to native text via the `onError`/no-src path. This is an accepted v1 behavior.

- [ ] **Step 5: Export from `packages/design-system/src/index.ts`.**

In the "// Primitives" section, immediately after the existing `Pipili` export block (lines 121-122), add:

```ts
export { EmojiText, splitEmojiRuns, emojiToHex } from './primitives/EmojiText.js';
export type { EmojiTextProps, EmojiRun } from './primitives/EmojiText.js';
export {
  NativeEmojiPack,
  createOpenMojiPack,
  OPENMOJI_CDN_BASE_URL,
} from './primitives/emoji-packs.js';
export type { EmojiPack, EmojiPackFormat, OpenMojiPackOptions } from './primitives/emoji-packs.js';
```

- [ ] **Step 6: Run the test to verify it passes.**

```bash
pnpm --filter @open-edu/design-system exec vitest run src/primitives/__tests__/EmojiText.test.tsx
```

Expected: PASS (all cases including the two axe audits).

- [ ] **Step 7: Commit**

```bash
git add packages/design-system/src/primitives/emoji-packs.ts packages/design-system/src/primitives/EmojiText.tsx packages/design-system/src/primitives/__tests__/EmojiText.test.tsx packages/design-system/src/index.ts
git commit -m "feat(design-system): add pluggable EmojiPack strategy and EmojiText renderer"
```

---

## Task 4: Wire `explanationStyle` / `emojiMode` through CompanionProvider → context snapshot (TDD)

**Files:**

- Modify: `apps/learner/src/ai/CompanionProvider.tsx`
- Modify: `apps/learner/src/ai/context-mapper.ts`
- Modify: `apps/learner/src/ai/PipiliChatProvider.tsx`
- Modify: `apps/learner/src/ai/index.ts`
- Test: `apps/learner/src/ai/__tests__/context-mapper.test.ts`
- Test: `apps/learner/src/ai/CompanionProvider.test.tsx`

- [ ] **Step 1: Write failing tests for `context-mapper`.**

Append these two cases to `apps/learner/src/ai/__tests__/context-mapper.test.ts`:

```ts
it('maps explanationStyle and emojiMode from the preferences argument', () => {
  const result = learningContextToSnapshot(
    {},
    { explanationStyle: 'child_friendly', emojiMode: 'openmoji' },
  );
  expect(result.learner?.explanationStyle).toBe('child_friendly');
  expect(result.learner?.emojiMode).toBe('openmoji');
});

it('prefers learnerPreferences over the preferences argument', () => {
  const result = learningContextToSnapshot(
    {
      learnerPreferences: {
        explanationStyle: 'exam',
        emojiMode: 'native',
        language: 'hi',
        readingLevel: 'secondary',
      },
    },
    { explanationStyle: 'simple', emojiMode: 'openmoji' },
  );
  expect(result.learner?.explanationStyle).toBe('exam');
  expect(result.learner?.emojiMode).toBe('native');
  expect(result.learner?.language).toBe('hi');
});
```

- [ ] **Step 2: Run the context-mapper test to verify it fails.**

```bash
pnpm --filter @open-edu/learner exec vitest run src/ai/__tests__/context-mapper.test.ts
```

Expected: FAIL (current signature accepts only one argument; new assertions fail).

- [ ] **Step 3: Update `apps/learner/src/ai/context-mapper.ts`.**

Change the function signature and the `learner` block. Replace the whole file body from the signature line with:

```ts
export function learningContextToSnapshot(
  ctx: LearningContext,
  preferences?: Partial<LearnerProfile>,
): PipiliContextSnapshot {
  const snapshot: PipiliContextSnapshot = {};

  if (ctx.lessonId && ctx.lessonTitle) {
    snapshot.lesson = {
      id: ctx.lessonId,
      title: ctx.lessonTitle,
      objectives: [],
      topics: [],
    } satisfies LessonContext;
  }

  if (ctx.courseId && ctx.courseTitle) {
    snapshot.course = {
      id: ctx.courseId,
      title: ctx.courseTitle,
      description: '',
      subject: '',
      level: '',
      language: ctx.learnerPreferences?.language ?? 'en',
    } satisfies CourseContext;
  }

  if (ctx.pageContent || ctx.selectedText) {
    snapshot.page = {
      id: ctx.sectionId ?? ctx.lessonId ?? 'unknown',
      title: ctx.lessonTitle ?? 'Current page',
      content: ctx.selectedText
        ? `Selection: ${ctx.selectedText}\n\nPage: ${ctx.pageContent ?? ''}`
        : (ctx.pageContent ?? ''),
      nodeType: 'page',
    } satisfies PageContext;
  }

  if (ctx.learnerPreferences || preferences) {
    snapshot.learner = {
      language: ctx.learnerPreferences?.language ?? preferences?.language ?? 'en',
      readingLevel:
        ctx.learnerPreferences?.readingLevel ?? preferences?.readingLevel ?? 'secondary',
      explanationStyle: ctx.learnerPreferences?.explanationStyle ?? preferences?.explanationStyle,
      emojiMode: ctx.learnerPreferences?.emojiMode ?? preferences?.emojiMode,
    } satisfies LearnerProfile;
  }

  return snapshot;
}
```

- [ ] **Step 4: Update `apps/learner/src/ai/CompanionProvider.tsx`.**

(a) Add `ExplanationStyle` to the `@open-edu/ai-companion` type import:

```ts
import type {
  LearningContext,
  ConversationMessage,
  AIResponse,
  SearchResponse,
  EnrichedResult,
  PipiliResponseMetadata,
  ExplanationStyle,
} from '@open-edu/ai-companion';
```

(b) Add an `EmojiMode` type next to `PanelState`:

```ts
export type PanelState = 'closed' | 'floating' | 'expanded' | 'pinned';

export type EmojiMode = 'native' | 'openmoji';
```

(c) Add four members to the `CompanionContextValue` interface (after `setPanelState`):

```ts
  explanationStyle: ExplanationStyle;
  setExplanationStyle: (style: ExplanationStyle) => void;
  emojiMode: EmojiMode;
  setEmojiMode: (mode: EmojiMode) => void;
```

(d) Add state + setters inside the component. After the existing state declarations (after `rewardMessages`):

```ts
const [explanationStyle, setExplanationStyleState] = useState<ExplanationStyle>(() => {
  try {
    const stored = localStorage.getItem('oe-explanation-style');
    if (
      stored === 'simple' ||
      stored === 'detailed' ||
      stored === 'exam' ||
      stored === 'child_friendly' ||
      stored === 'autism_friendly'
    ) {
      return stored;
    }
  } catch {
    // localStorage may not be available
  }
  return 'detailed';
});

const [emojiMode, setEmojiModeState] = useState<EmojiMode>(() => {
  try {
    const stored = localStorage.getItem('oe-emoji-pack');
    if (stored === 'native' || stored === 'openmoji') return stored;
  } catch {
    // localStorage may not be available
  }
  return 'native';
});

const setExplanationStyle = useCallback((style: ExplanationStyle) => {
  setExplanationStyleState(style);
  try {
    localStorage.setItem('oe-explanation-style', style);
  } catch {
    // localStorage may not be available
  }
}, []);

const setEmojiMode = useCallback((mode: EmojiMode) => {
  setEmojiModeState(mode);
  try {
    localStorage.setItem('oe-emoji-pack', mode);
  } catch {
    // localStorage may not be available
  }
}, []);
```

(e) Add the four new members to the `value` object (after `setPanelState`), and add `explanationStyle`, `emojiMode`, `setExplanationStyle`, `setEmojiMode` to the `useMemo` dependency array.

- [ ] **Step 5: Update `apps/learner/src/ai/PipiliChatProvider.tsx`.**

(a) Add `LearnerProfile` to the type import:

```ts
import type { PipiliResponseMetadata, LearnerProfile } from '@open-edu/ai-companion';
```

(b) After `contextRef.current = companion.context;` (line 53) add:

```ts
const prefsRef = useRef<Partial<LearnerProfile>>({
  explanationStyle: companion.explanationStyle,
  emojiMode: companion.emojiMode,
});
prefsRef.current = {
  explanationStyle: companion.explanationStyle,
  emojiMode: companion.emojiMode,
};
```

(c) In `prepareSendMessagesRequest`, pass the prefs. Replace:

```ts
            context: learningContextToSnapshot(contextRef.current),
```

with:

```ts
            context: learningContextToSnapshot(contextRef.current, prefsRef.current),
```

- [ ] **Step 6: Update `apps/learner/src/ai/index.ts` to export the new types.**

Add after the `PanelState` export line:

```ts
export type { EmojiMode } from './CompanionProvider.js';
```

- [ ] **Step 7: Extend `apps/learner/src/ai/CompanionProvider.test.tsx`.**

(a) In `TestConsumer`, destructure the new fields and render them:

```tsx
    explanationStyle,
    setExplanationStyle,
    emojiMode,
    setEmojiMode,
```

Add render output (after the existing `panel-state` div):

```tsx
      <div data-testid="explanation-style">{explanationStyle}</div>
      <div data-testid="emoji-mode">{emojiMode}</div>
      <button data-testid="set-style-exam" onClick={() => setExplanationStyle('exam')}>
        Set Exam
      </button>
      <button data-testid="set-mode-openmoji" onClick={() => setEmojiMode('openmoji')}>
        Set OpenMoji
      </button>
```

(b) Add tests:

```ts
  it('defaults explanationStyle to detailed and emojiMode to native', () => {
    localStorage.clear();
    render(
      <CompanionProvider>
        <TestConsumer />
      </CompanionProvider>,
    );
    expect(screen.getByTestId('explanation-style')).toHaveTextContent('detailed');
    expect(screen.getByTestId('emoji-mode')).toHaveTextContent('native');
  });

  it('updates explanationStyle and persists it to localStorage', () => {
    localStorage.clear();
    render(
      <CompanionProvider>
        <TestConsumer />
      </CompanionProvider>,
    );
    fireEvent.click(screen.getByTestId('set-style-exam'));
    expect(screen.getByTestId('explanation-style')).toHaveTextContent('exam');
    expect(localStorage.getItem('oe-explanation-style')).toBe('exam');
  });

  it('updates emojiMode and persists it to localStorage', () => {
    localStorage.clear();
    render(
      <CompanionProvider>
        <TestConsumer />
      </CompanionProvider>,
    );
    fireEvent.click(screen.getByTestId('set-mode-openmoji'));
    expect(screen.getByTestId('emoji-mode')).toHaveTextContent('openmoji');
    expect(localStorage.getItem('oe-emoji-pack')).toBe('openmoji');
  });
```

- [ ] **Step 8: Run the tests to verify they pass.**

```bash
pnpm --filter @open-edu/learner exec vitest run src/ai/__tests__/context-mapper.test.ts src/ai/CompanionProvider.test.tsx
pnpm --filter @open-edu/learner exec tsc --noEmit
```

Expected: PASS, typecheck clean.

- [ ] **Step 9: Commit**

```bash
git add apps/learner/src/ai
git commit -m "feat(learner): wire explanation style and emoji mode into companion context"
```

---

## Task 5: `ExplanationStylePicker` + mount it in the right sidebar and companion panel (TDD)

**Files:**

- Create: `apps/learner/src/ai/ExplanationStylePicker.tsx`
- Test: `apps/learner/src/ai/__tests__/ExplanationStylePicker.test.tsx`
- Modify: `apps/learner/src/ai/index.ts`
- Modify: `apps/learner/src/CourseRightSidebar.tsx`
- Modify: `apps/learner/src/ai/CompanionPanel.tsx`

- [ ] **Step 1: Write the failing component test.**

Create `apps/learner/src/ai/__tests__/ExplanationStylePicker.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExplanationStylePicker } from '../ExplanationStylePicker.js';
import { CompanionProvider } from '../CompanionProvider.js';
import { I18nProvider } from '@open-edu/i18n';
import learnerDict from '@open-edu/i18n/locales/en/learner.json';

function renderPicker() {
  return render(
    <I18nProvider locale="en" dictionaries={{ en: { learner: learnerDict } }}>
      <CompanionProvider>
        <ExplanationStylePicker />
      </CompanionProvider>
    </I18nProvider>,
  );
}

describe('ExplanationStylePicker', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders all five style pills', () => {
    renderPicker();
    expect(screen.getByRole('button', { name: 'Simple' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Detailed' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exam' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Child-Friendly' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Autism-Friendly' })).toBeInTheDocument();
  });

  it('defaults to Detailed', () => {
    renderPicker();
    expect(screen.getByRole('button', { name: 'Detailed' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('selecting a style updates aria-pressed and persists to localStorage', () => {
    renderPicker();
    fireEvent.click(screen.getByRole('button', { name: 'Exam' }));
    expect(screen.getByRole('button', { name: 'Exam' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Detailed' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(localStorage.getItem('oe-explanation-style')).toBe('exam');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails.**

```bash
pnpm --filter @open-edu/learner exec vitest run src/ai/__tests__/ExplanationStylePicker.test.tsx
```

Expected: FAIL (module `../ExplanationStylePicker.js` not found).

- [ ] **Step 3: Implement `apps/learner/src/ai/ExplanationStylePicker.tsx`.**

```tsx
import { useTranslation } from '@open-edu/i18n';
import { cn } from '@open-edu/design-system';
import type { ExplanationStyle } from '@open-edu/ai-companion';
import { useCompanion } from './CompanionProvider.js';

const STYLES: Array<{ id: ExplanationStyle; labelKey: string }> = [
  { id: 'simple', labelKey: 'learner.explanation_style.simple' },
  { id: 'detailed', labelKey: 'learner.explanation_style.detailed' },
  { id: 'exam', labelKey: 'learner.explanation_style.exam' },
  { id: 'child_friendly', labelKey: 'learner.explanation_style.child_friendly' },
  { id: 'autism_friendly', labelKey: 'learner.explanation_style.autism_friendly' },
];

export function ExplanationStylePicker(): JSX.Element {
  const { t } = useTranslation();
  const { explanationStyle, setExplanationStyle } = useCompanion();

  return (
    <div
      role="group"
      aria-label={t('learner.explanation_style.label')}
      data-testid="explanation-style-picker"
    >
      <p className="text-on-surface-muted text-caption mb-1.5">
        {t('learner.explanation_style.label')}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {STYLES.map((s) => {
          const active = explanationStyle === s.id;
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={active}
              data-testid={`explanation-style-${s.id}`}
              onClick={() => setExplanationStyle(s.id)}
              className={cn(
                'text-caption rounded-full border px-2.5 py-1 transition-colors',
                active
                  ? 'border-primary bg-primary-container text-primary'
                  : 'border-outline-variant text-on-surface-variant hover:border-primary',
              )}
            >
              {t(s.labelKey)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Export it from `apps/learner/src/ai/index.ts`.**

Add:

```ts
export { ExplanationStylePicker } from './ExplanationStylePicker.js';
```

- [ ] **Step 5: Run the test to verify it passes.**

```bash
pnpm --filter @open-edu/learner exec vitest run src/ai/__tests__/ExplanationStylePicker.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Mount the picker in `apps/learner/src/CourseRightSidebar.tsx`.**

(a) The file already imports `useCompanion, usePipiliChat, PipiliChat` from `./ai`. Add `ExplanationStylePicker` to that import.

(b) In the `pipili` `TabsContent`, insert a header row above `<PipiliChat>`. Replace:

```tsx
        <TabsContent
          value="pipili"
          className="flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
        >
          <PipiliChat
```

with:

```tsx
        <TabsContent
          value="pipili"
          className="flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
        >
          <div className="border-outline-variant shrink-0 border-b px-3 py-2">
            <ExplanationStylePicker />
          </div>
          <PipiliChat
```

- [ ] **Step 7: Mount the picker in `apps/learner/src/ai/CompanionPanel.tsx`.**

(a) Add an import:

```ts
import { ExplanationStylePicker } from './ExplanationStylePicker.js';
```

(b) Insert it between the header and `<PipiliChat>`. Replace:

```tsx
        </div>
        <PipiliChat
```

with:

```tsx
        </div>
        <div className="border-outline-variant shrink-0 border-b px-4 py-2">
          <ExplanationStylePicker />
        </div>
        <PipiliChat
```

> Note: `CompanionPanel` is currently only rendered in its own test file (not in `AppShell`); the picker there is covered by that test's `CompanionProvider` wrapper.

- [ ] **Step 8: Verify existing sidebar/panel tests still pass.**

```bash
pnpm --filter @open-edu/learner exec vitest run src/__tests__/CourseRightSidebar.test.tsx src/ai/CompanionPanel.test.tsx
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add apps/learner/src/ai/ExplanationStylePicker.tsx apps/learner/src/ai/__tests__/ExplanationStylePicker.test.tsx apps/learner/src/ai/index.ts apps/learner/src/CourseRightSidebar.tsx apps/learner/src/ai/CompanionPanel.tsx
git commit -m "feat(learner): add explanation style picker to companion surfaces"
```

---

## Task 6: Inject explanation style + emoji guidance into the system prompt (TDD)

**Files:**

- Modify: `apps/learner/src/pipili/policy.ts`
- Modify: `apps/learner/src/pipili/config.ts`
- Modify: `apps/learner/src/pipili/handler.ts`
- Test: `apps/learner/src/pipili/__tests__/policy.test.ts`

- [ ] **Step 1: Write failing tests for `buildSystemPrompt`.**

Append to `apps/learner/src/pipili/__tests__/policy.test.ts` (inside the existing `describe('buildSystemPrompt', ...)` block):

```ts
it('includes explanation style instructions when a style is provided', () => {
  const prompt = buildSystemPrompt({
    boundedContext: makeBoundedContext(),
    assessmentActive: false,
    learnerLanguage: 'en',
    readingLevel: 'secondary',
    explanationStyle: 'child_friendly',
  });
  expect(prompt).toContain('Explanation Style');
  expect(prompt).toContain('playful');
});

it('excludes the explanation style section when no style is provided', () => {
  const prompt = buildSystemPrompt({
    boundedContext: makeBoundedContext(),
    assessmentActive: false,
    learnerLanguage: 'en',
    readingLevel: 'secondary',
  });
  expect(prompt).not.toContain('Explanation Style');
});

it('includes emoji guidance when emojiVisualMode is true', () => {
  const prompt = buildSystemPrompt({
    boundedContext: makeBoundedContext(),
    assessmentActive: false,
    learnerLanguage: 'en',
    readingLevel: 'secondary',
    emojiVisualMode: true,
  });
  expect(prompt).toContain('Emoji Use');
  expect(prompt).toContain('friendly emojis');
});

it('excludes emoji guidance when emojiVisualMode is false', () => {
  const prompt = buildSystemPrompt({
    boundedContext: makeBoundedContext(),
    assessmentActive: false,
    learnerLanguage: 'en',
    readingLevel: 'secondary',
    emojiVisualMode: false,
  });
  expect(prompt).not.toContain('Emoji Use');
});
```

- [ ] **Step 2: Run the test to verify it fails.**

```bash
pnpm --filter @open-edu/learner exec vitest run src/pipili/__tests__/policy.test.ts
```

Expected: FAIL (the 4 new cases fail; existing cases pass).

- [ ] **Step 3: Update `apps/learner/src/pipili/policy.ts`.**

(a) Add `ExplanationStyle` to the type import from `@open-edu/ai-companion/pipili`:

```ts
import type {
  AccessibilityProfile,
  BoundedContext,
  Citation,
  ExplanationStyle,
  PipiliMode,
  PipiliResponseMetadata,
} from '@open-edu/ai-companion/pipili';
```

(b) Extend `SystemPromptParams`:

```ts
export interface SystemPromptParams {
  boundedContext: BoundedContext;
  assessmentActive: boolean;
  learnerLanguage: string;
  readingLevel: string;
  accessibilityProfile?: AccessibilityProfile;
  explanationStyle?: ExplanationStyle;
  emojiVisualMode?: boolean;
}
```

(c) In `buildSystemPrompt`, destructure the new params and append two sections before `return prompt;`. Replace:

```ts
export function buildSystemPrompt(params: SystemPromptParams): string {
  const { boundedContext, assessmentActive, accessibilityProfile } = params;
```

with:

```ts
export function buildSystemPrompt(params: SystemPromptParams): string {
  const {
    boundedContext,
    assessmentActive,
    accessibilityProfile,
    explanationStyle,
    emojiVisualMode,
  } = params;
```

(d) Replace the tail of the function (after the accessibility block, before `return prompt;`):

```ts
  if (accessibilityProfile) {
    prompt += `## Accessibility Adaptation
${getAccessibilityInstructions(accessibilityProfile)}
`;
  }

  return prompt;
}
```

with:

```ts
  if (accessibilityProfile) {
    prompt += `## Accessibility Adaptation
${getAccessibilityInstructions(accessibilityProfile)}
`;
  }

  if (explanationStyle) {
    prompt += `## Explanation Style (${explanationStyle})
${getExplanationStyleInstructions(explanationStyle)}
`;
  }

  if (emojiVisualMode) {
    prompt += `## Emoji Use
- Use a few small, friendly emojis (e.g. 🌟, 💡, ✅) to encourage the learner.
- Keep emojis relevant and never let them replace meaning.
- Use at most one or two emojis per response.
`;
  }

  return prompt;
}

function getExplanationStyleInstructions(style: ExplanationStyle): string {
  switch (style) {
    case 'simple':
      return `- Use short sentences and plain words.
- Explain one idea at a time.
- Prefer examples over abstract definitions.`;
    case 'detailed':
      return `- Give thorough, well-structured explanations.
- Include reasoning, examples, and connections to related ideas.
- Use headings or numbered points to organize longer answers.`;
    case 'exam':
      return `- Teach toward exam-style questions.
- Highlight key definitions and facts the learner should memorise.
- Suggest practice questions and mark-relevant points.`;
    case 'child_friendly':
      return `- Use warm, playful, age-appropriate language.
- Keep sentences short and concrete.
- Use simple analogies from everyday life.`;
    case 'autism_friendly':
      return `- Use literal, concrete wording — avoid metaphors and sarcasm.
- Keep structure predictable: headings, short paragraphs, numbered steps.
- Avoid sensory overload; keep sentences short.`;
    default:
      return '';
  }
}
```

- [ ] **Step 4: Run the test to verify it passes.**

```bash
pnpm --filter @open-edu/learner exec vitest run src/pipili/__tests__/policy.test.ts
```

Expected: PASS.

- [ ] **Step 5: Extend the request context schema in `apps/learner/src/pipili/config.ts`.**

In `pipiliContextSchema`, replace the `learner` object:

```ts
  learner: z
    .object({
      language: z.string(),
      readingLevel: z.string(),
      accessibilityProfile: z.enum(['autism', 'adhd', 'dyslexia']).optional(),
    })
    .optional(),
```

with:

```ts
  learner: z
    .object({
      language: z.string(),
      readingLevel: z.string(),
      accessibilityProfile: z.enum(['autism', 'adhd', 'dyslexia']).optional(),
      explanationStyle: z
        .enum(['simple', 'detailed', 'exam', 'child_friendly', 'autism_friendly'])
        .optional(),
      emojiMode: z.enum(['native', 'openmoji']).optional(),
    })
    .optional(),
```

- [ ] **Step 6: Pass the new values through in `apps/learner/src/pipili/handler.ts`.**

After the existing `const accessibilityProfile = context.learner?.accessibilityProfile;` line, add:

```ts
const explanationStyle = context.learner?.explanationStyle;
const emojiVisualMode = context.learner?.emojiMode === 'openmoji';
```

Then extend the `buildSystemPrompt` call:

```ts
const instructions = buildSystemPrompt({
  boundedContext: boundedCtx,
  assessmentActive,
  learnerLanguage,
  readingLevel,
  accessibilityProfile,
  explanationStyle,
  emojiVisualMode,
});
```

- [ ] **Step 7: Typecheck the learner app.**

```bash
pnpm --filter @open-edu/learner exec tsc --noEmit
```

Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add apps/learner/src/pipili
git commit -m "feat(learner): inject explanation style and emoji guidance into pipili system prompt"
```

---

## Task 7: Render emoji through `<EmojiText>` in `PipiliMessage` (TDD)

**Files:**

- Modify: `apps/learner/src/ai/PipiliMessage.tsx`
- Modify: `apps/learner/src/ai/__tests__/PipiliMessage.test.tsx`

- [ ] **Step 1: Write the failing tests + make the existing tests resilient.**

`PipiliMessage` will now call `useCompanion()`, so the test renderer must wrap in `CompanionProvider`. Update `apps/learner/src/ai/__tests__/PipiliMessage.test.tsx`:

(a) Add imports:

```tsx
import { CompanionProvider } from '../CompanionProvider.js';
```

(b) Wrap the renderer. Replace:

```tsx
function renderWithI18n(ui: React.ReactElement) {
  return render(
    <I18nProvider locale="en" dictionaries={{ en: { learner: learnerDict } }}>
      {ui}
    </I18nProvider>,
  );
}
```

with:

```tsx
function renderWithI18n(ui: React.ReactElement) {
  return render(
    <I18nProvider locale="en" dictionaries={{ en: { learner: learnerDict } }}>
      <CompanionProvider>{ui}</CompanionProvider>
    </I18nProvider>,
  );
}
```

(c) Append these tests:

```tsx
it('renders OpenMoji SVG images for assistant text in OpenMoji mode', () => {
  localStorage.setItem('oe-emoji-pack', 'openmoji');
  renderWithI18n(<PipiliMessage role="assistant" parts={textParts('Great job 🌟')} />);
  const img = screen.getByAltText('🌟');
  expect(img).toHaveAttribute(
    'src',
    'https://cdn.jsdelivr.net/npm/openmoji-static@15.0.0/single_svg/1F31F.svg',
  );
  localStorage.removeItem('oe-emoji-pack');
});

it('keeps native emoji text for assistant text in Native mode', () => {
  localStorage.setItem('oe-emoji-pack', 'native');
  renderWithI18n(<PipiliMessage role="assistant" parts={textParts('Great job 🌟')} />);
  expect(screen.getByText('Great job 🌟')).toBeInTheDocument();
  localStorage.removeItem('oe-emoji-pack');
});
```

- [ ] **Step 2: Run the test to verify the new cases fail.**

```bash
pnpm --filter @open-edu/learner exec vitest run src/ai/__tests__/PipiliMessage.test.tsx
```

Expected: the two new cases FAIL; existing cases still pass (the provider wrapper alone does not break them).

- [ ] **Step 3: Update `apps/learner/src/ai/PipiliMessage.tsx`.**

(a) Add imports:

```tsx
import {
  EmojiText,
  NativeEmojiPack,
  createOpenMojiPack,
  type EmojiPack,
} from '@open-edu/design-system';
import { useCompanion } from './CompanionProvider.js';
import type { EmojiMode } from './CompanionProvider.js';
```

(b) Add module-level helpers above the component:

```tsx
const openMojiPack = createOpenMojiPack();

function resolveEmojiPack(emojiMode: EmojiMode | undefined): EmojiPack {
  return emojiMode === 'openmoji' ? openMojiPack : NativeEmojiPack;
}
```

(c) Inside the component, read the preference:

```tsx
const { t } = useTranslation();
const { emojiMode } = useCompanion();
```

(d) Replace the message body rendering. Replace:

```tsx
          <span className={cn(isStreaming && 'opacity-95')}>
            {visibleText}
```

with:

```tsx
          <span className={cn(isStreaming && 'opacity-95')}>
            {role === 'assistant' ? (
              <EmojiText text={visibleText} pack={resolveEmojiPack(emojiMode)} />
            ) : (
              visibleText
            )}
```

- [ ] **Step 4: Run the test to verify it passes.**

```bash
pnpm --filter @open-edu/learner exec vitest run src/ai/__tests__/PipiliMessage.test.tsx
```

Expected: PASS (all cases, including both new emoji cases and the axe audit).

- [ ] **Step 5: Commit**

```bash
git add apps/learner/src/ai/PipiliMessage.tsx apps/learner/src/ai/__tests__/PipiliMessage.test.tsx
git commit -m "feat(learner): render pipili emoji via EmojiText with openmoji support"
```

---

## Task 8: Keyboard shortcut + reader toolbar + persistent FAB + settings control (TDD)

**Files:**

- Create: `apps/learner/src/ai/useCompanionShortcut.ts`
- Create: `apps/learner/src/ai/ReaderToolbar.tsx`
- Test: `apps/learner/src/ai/__tests__/useCompanionShortcut.test.ts`
- Test: `apps/learner/src/ai/__tests__/ReaderToolbar.test.tsx`
- Modify: `apps/learner/src/ai/index.ts`
- Modify: `apps/learner/src/AppShell.tsx`
- Modify: `apps/learner/src/SettingsPage.tsx`
- Modify: `apps/learner/src/SettingsPage.test.tsx`

- [ ] **Step 1: Write the failing hook test.**

Create `apps/learner/src/ai/__tests__/useCompanionShortcut.test.ts`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { useCompanionShortcut } from '../useCompanionShortcut.js';

describe('useCompanionShortcut', () => {
  it('calls handler on Cmd+Shift+P', () => {
    const handler = vi.fn();
    renderHook(() => useCompanionShortcut(handler));
    fireEvent.keyDown(document, { key: 'p', metaKey: true, shiftKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('calls handler on Ctrl+Shift+P', () => {
    const handler = vi.fn();
    renderHook(() => useCompanionShortcut(handler));
    fireEvent.keyDown(document, { key: 'P', ctrlKey: true, shiftKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not call handler on a plain P press', () => {
    const handler = vi.fn();
    renderHook(() => useCompanionShortcut(handler));
    fireEvent.keyDown(document, { key: 'p' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('ignores the shortcut while an input has focus', () => {
    const handler = vi.fn();
    renderHook(() => useCompanionShortcut(handler));
    const input = document.createElement('input');
    document.body.appendChild(input);
    fireEvent.keyDown(input, { key: 'p', metaKey: true, shiftKey: true });
    expect(handler).not.toHaveBeenCalled();
    input.remove();
  });

  it('ignores the shortcut while a textarea has focus', () => {
    const handler = vi.fn();
    renderHook(() => useCompanionShortcut(handler));
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    fireEvent.keyDown(textarea, { key: 'p', metaKey: true, shiftKey: true });
    expect(handler).not.toHaveBeenCalled();
    textarea.remove();
  });

  it('ignores the shortcut inside a contenteditable element', () => {
    const handler = vi.fn();
    renderHook(() => useCompanionShortcut(handler));
    const editable = document.createElement('div');
    editable.contentEditable = 'true';
    document.body.appendChild(editable);
    fireEvent.keyDown(editable, { key: 'p', metaKey: true, shiftKey: true });
    expect(handler).not.toHaveBeenCalled();
    editable.remove();
  });

  it('uses the latest handler after re-render', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ h }) => useCompanionShortcut(h), {
      initialProps: { h: first },
    });
    rerender({ h: second });
    fireEvent.keyDown(document, { key: 'p', metaKey: true, shiftKey: true });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails.**

```bash
pnpm --filter @open-edu/learner exec vitest run src/ai/__tests__/useCompanionShortcut.test.ts
```

Expected: FAIL (module not found).

- [ ] **Step 3: Implement `apps/learner/src/ai/useCompanionShortcut.ts`.**

```ts
import { useEffect, useRef } from 'react';

export function useCompanionShortcut(handler: () => void): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName ?? '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'p') {
        event.preventDefault();
        handlerRef.current();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);
}
```

- [ ] **Step 4: Run the test to verify it passes.**

```bash
pnpm --filter @open-edu/learner exec vitest run src/ai/__tests__/useCompanionShortcut.test.ts
```

Expected: PASS.

- [ ] **Step 5: Write the failing `ReaderToolbar` test.**

Create `apps/learner/src/ai/__tests__/ReaderToolbar.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReaderToolbar } from '../ReaderToolbar.js';
import { I18nProvider } from '@open-edu/i18n';
import learnerDict from '@open-edu/i18n/locales/en/learner.json';

function renderToolbar(overrides: Partial<React.ComponentProps<typeof ReaderToolbar>> = {}) {
  return render(
    <I18nProvider locale="en" dictionaries={{ en: { learner: learnerDict } }}>
      <ReaderToolbar onOpen={vi.fn()} {...overrides} />
    </I18nProvider>,
  );
}

describe('ReaderToolbar', () => {
  it('renders the Pipili trigger button', () => {
    renderToolbar();
    expect(screen.getByRole('button', { name: 'Ask Pipili' })).toBeInTheDocument();
  });

  it('renders the non-Mac shortcut hint in jsdom', () => {
    renderToolbar();
    expect(screen.getByText('Ctrl⇧P')).toBeInTheDocument();
  });

  it('calls onOpen when the trigger is clicked', () => {
    const onOpen = vi.fn();
    renderToolbar({ onOpen });
    fireEvent.click(screen.getByRole('button', { name: 'Ask Pipili' }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('shows an unread indicator when hasUnread is true', () => {
    renderToolbar({ hasUnread: true });
    expect(screen.getByRole('img', { name: 'New messages' })).toBeInTheDocument();
  });

  it('hides the unread indicator when hasUnread is false', () => {
    renderToolbar({ hasUnread: false });
    expect(screen.queryByRole('img', { name: 'New messages' })).not.toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = renderToolbar({ hasUnread: true });
    const axe = await import('axe-core');
    const results = await axe.run(container);
    expect(results.violations).toHaveLength(0);
  });
});
```

- [ ] **Step 6: Run the test to verify it fails.**

```bash
pnpm --filter @open-edu/learner exec vitest run src/ai/__tests__/ReaderToolbar.test.tsx
```

Expected: FAIL (module `../ReaderToolbar.js` not found).

- [ ] **Step 7: Implement `apps/learner/src/ai/ReaderToolbar.tsx`.**

```tsx
import { Button, cn } from '@open-edu/design-system';
import { Sparkles } from 'lucide-react';
import { useTranslation } from '@open-edu/i18n';

export interface ReaderToolbarProps {
  onOpen: () => void;
  hasUnread?: boolean;
  className?: string;
}

function isMacPlatform(): boolean {
  try {
    return typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform ?? '');
  } catch {
    return false;
  }
}

export function ReaderToolbar({
  onOpen,
  hasUnread = false,
  className,
}: ReaderToolbarProps): JSX.Element {
  const { t } = useTranslation();
  const mac = isMacPlatform();

  return (
    <div
      className={cn(
        'border-outline-variant bg-surface flex items-center gap-2 border-b px-4 py-1.5',
        className,
      )}
      data-testid="reader-toolbar"
    >
      <Button variant="ghost" size="sm" onClick={onOpen} className="gap-1.5">
        <Sparkles className="h-4 w-4" />
        {t('learner.reader_toolbar.label')}
      </Button>
      <span
        className="bg-surface-container text-on-surface-variant border-outline-variant text-caption rounded border px-1.5 py-0.5"
        aria-hidden="true"
      >
        {mac
          ? t('learner.reader_toolbar.shortcut_mac')
          : t('learner.reader_toolbar.shortcut_other')}
      </span>
      {hasUnread && (
        <span
          className="bg-primary h-2 w-2 rounded-full"
          role="img"
          aria-label={t('learner.reader_toolbar.unread')}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 8: Run the ReaderToolbar test to verify it passes.**

```bash
pnpm --filter @open-edu/learner exec vitest run src/ai/__tests__/ReaderToolbar.test.tsx
```

Expected: PASS.

- [ ] **Step 9: Export the new modules from `apps/learner/src/ai/index.ts`.**

Add:

```ts
export { useCompanionShortcut } from './useCompanionShortcut.js';
export { ReaderToolbar } from './ReaderToolbar.js';
export type { ReaderToolbarProps } from './ReaderToolbar.js';
```

- [ ] **Step 10: Update `apps/learner/src/AppShell.tsx`.**

(a) Add `ReaderToolbar` and `useCompanionShortcut` to the existing `./ai` import block (lines 49-56):

```ts
import {
  CompanionProvider,
  useCompanion,
  ContextBridge,
  TextSelectionToolbar,
  WordTapHandler,
  PipiliChatProvider,
  ReaderToolbar,
  useCompanionShortcut,
} from './ai';
```

(b) In `AppShellInner`, replace the existing companion hook line (line 229):

```ts
const { panelState } = useCompanion();
```

with:

```ts
const { panelState, setPanelState, messages } = useCompanion();

useCompanionShortcut(() => {
  setPanelState(panelState === 'closed' ? 'floating' : 'closed');
});
```

(c) Add `ReaderToolbar` under the `TopAppBar` in the course `header` prop. Replace:

```tsx
                  header={
                    <TopAppBar
                      breadcrumbs={getBreadcrumbs()}
                      isCourseView
                      courseTitle={coursePkg.manifest.title}
                      showA11yControls
                      progressCurrent={courseProgressCurrent}
                      progressTotal={courseProgressTotal}
                    />
                  }
```

with:

```tsx
                  header={
                    <>
                      <TopAppBar
                        breadcrumbs={getBreadcrumbs()}
                        isCourseView
                        courseTitle={coursePkg.manifest.title}
                        showA11yControls
                        progressCurrent={courseProgressCurrent}
                        progressTotal={courseProgressTotal}
                      />
                      <ReaderToolbar
                        onOpen={() => setPanelState(panelState === 'closed' ? 'floating' : 'closed')}
                        hasUnread={messages.length > 0 && panelState === 'closed'}
                      />
                    </>
                  }
```

(d) Update `CompanionFloatingUI` (bottom of the file). Replace the whole function:

```tsx
function CompanionFloatingUI({ view }: { view: AppView }): JSX.Element | null {
  const { panelState, setPanelState, messages, pendingReward } = useCompanion();
  const isOpen = panelState !== 'closed';

  const isCourseView = view.view === 'course';
  const showRewardState = isCourseView && pendingReward;

  return (
    <Pipili
      mood={!isCourseView && isOpen ? 'curious' : 'idle'}
      visible={isCourseView ? !isOpen : true}
      hasUnread={messages.length > 0 && !isOpen}
      pendingReward={showRewardState}
      onClick={() => setPanelState(isOpen ? 'closed' : 'floating')}
    />
  );
}
```

> Behavior: on course view the FAB hides when the right sidebar is open (the sidebar has its own collapse toggle); on all other views the FAB stays visible as a toggle and switches to the `curious` mood while open.

- [ ] **Step 11: Update `apps/learner/src/SettingsPage.tsx`.**

(a) Add imports:

```tsx
import { Smile } from 'lucide-react';
import { useCompanion, type EmojiMode } from './ai';
```

(b) Inside the component, read the preference:

```tsx
const { emojiMode, setEmojiMode } = useCompanion();
```

(c) Add a new Card after the Break Reminder card (after the closing `</Card>` at line 202, before the final `</div>`). Content:

```tsx
<Card>
  <CardHeader>
    <h2 className="text-h2 font-display flex items-center gap-2">
      <Smile className="h-5 w-5" /> {t('learner.settings.emoji_pack')}
    </h2>
  </CardHeader>
  <CardContent>
    <p className="text-on-surface-variant text-body-ui">
      {t('learner.settings.emoji_pack_description')}
    </p>
    <RadioGroup
      value={emojiMode}
      onValueChange={(value) => setEmojiMode(value as EmojiMode)}
      className="mt-3 gap-3"
    >
      <div className="flex items-center gap-3">
        <RadioGroupItem value="native" id="emoji-native" />
        <label htmlFor="emoji-native" className="text-body-ui">
          <span className="font-medium">{t('learner.settings.emoji_native')}</span>
          <p className="text-on-surface-variant text-caption">
            {t('learner.settings.emoji_native_description')}
          </p>
        </label>
      </div>
      <div className="flex items-center gap-3">
        <RadioGroupItem value="openmoji" id="emoji-openmoji" />
        <label htmlFor="emoji-openmoji" className="text-body-ui">
          <span className="font-medium">{t('learner.settings.emoji_openmoji')}</span>
          <p className="text-on-surface-variant text-caption">
            {t('learner.settings.emoji_openmoji_description')}
          </p>
        </label>
      </div>
    </RadioGroup>
  </CardContent>
</Card>
```

- [ ] **Step 12: Update `apps/learner/src/SettingsPage.test.tsx` so it can render the provider-backed picker.**

(a) Add import:

```tsx
import { CompanionProvider } from './ai';
```

(b) Wrap in `CompanionProvider`. Replace:

```tsx
function renderWithProvider(ui: React.ReactElement) {
  return render(
    <I18nProvider locale="en" dictionaries={{ en: { learner: learnerDict } }}>
      <FontSizeProvider>{ui}</FontSizeProvider>
    </I18nProvider>,
  );
}
```

with:

```tsx
function renderWithProvider(ui: React.ReactElement) {
  return render(
    <I18nProvider locale="en" dictionaries={{ en: { learner: learnerDict } }}>
      <FontSizeProvider>
        <CompanionProvider>{ui}</CompanionProvider>
      </FontSizeProvider>
    </I18nProvider>,
  );
}
```

(c) Append a test:

```tsx
it('renders the emoji pack section with both options', () => {
  renderWithProvider(
    <SettingsPage
      currentThemeId="lumina-scholastica"
      onThemeChange={vi.fn()}
      breakTimer={mockBreakTimer}
    />,
  );
  expect(screen.getByText('Emoji Style')).toBeInTheDocument();
  expect(screen.getByRole('radio', { name: /Native/ })).toBeInTheDocument();
  expect(screen.getByRole('radio', { name: /OpenMoji/ })).toBeInTheDocument();
});
```

- [ ] **Step 13: Run all affected tests.**

```bash
pnpm --filter @open-edu/learner exec vitest run src/ai/__tests__/useCompanionShortcut.test.ts src/ai/__tests__/ReaderToolbar.test.tsx src/SettingsPage.test.tsx src/AppShell.test.tsx
```

Expected: PASS.

- [ ] **Step 14: Commit**

```bash
git add apps/learner/src/ai apps/learner/src/AppShell.tsx apps/learner/src/SettingsPage.tsx apps/learner/src/SettingsPage.test.tsx
git commit -m "feat(learner): add companion shortcut, reader toolbar, persistent FAB, and emoji settings"
```

---

## Task 9: Full verification

- [ ] **Step 1: Rebuild ai-companion (stale-dist safety) and run the whole suite.**

```bash
pnpm --filter @open-edu/ai-companion build
pnpm test
```

Expected: all Vitest suites pass, including the new `EmojiText`, `ExplanationStylePicker`, `useCompanionShortcut`, `ReaderToolbar`, `policy`, `context-mapper`, `CompanionProvider`, `PipiliMessage`, `CourseRightSidebar`, `CompanionPanel`, and `SettingsPage` tests.

- [ ] **Step 2: Typecheck the monorepo.**

```bash
pnpm typecheck
```

Expected: no type errors.

- [ ] **Step 3: Lint (includes the hardcoded-string scan).**

```bash
pnpm lint
```

Expected: no violations. If the i18n key validation or hardcoded-string scan flags anything, fix and re-run.

- [ ] **Step 4: Format changed files.**

```bash
pnpm exec prettier --write \
  packages/design-system/src/primitives/EmojiText.tsx \
  packages/design-system/src/primitives/emoji-packs.ts \
  packages/design-system/src/primitives/__tests__/EmojiText.test.tsx \
  packages/design-system/src/index.ts \
  packages/ai-companion/src/providers/types.ts \
  packages/ai-companion/src/pipili/types.ts \
  packages/ai-companion/src/pipili/index.ts \
  packages/ai-companion/src/index.ts \
  packages/i18n/locales/en/learner.json \
  apps/learner/src/ai/CompanionProvider.tsx \
  apps/learner/src/ai/CompanionProvider.test.tsx \
  apps/learner/src/ai/context-mapper.ts \
  apps/learner/src/ai/PipiliChatProvider.tsx \
  apps/learner/src/ai/ExplanationStylePicker.tsx \
  apps/learner/src/ai/PipiliMessage.tsx \
  apps/learner/src/ai/ReaderToolbar.tsx \
  apps/learner/src/ai/useCompanionShortcut.ts \
  apps/learner/src/ai/index.ts \
  apps/learner/src/ai/CompanionPanel.tsx \
  apps/learner/src/CourseRightSidebar.tsx \
  apps/learner/src/AppShell.tsx \
  apps/learner/src/SettingsPage.tsx \
  apps/learner/src/SettingsPage.test.tsx \
  apps/learner/src/pipili/policy.ts \
  apps/learner/src/pipili/config.ts \
  apps/learner/src/pipili/handler.ts \
  apps/learner/src/pipili/__tests__/policy.test.ts \
  apps/learner/src/ai/__tests__/PipiliMessage.test.tsx \
  apps/learner/src/ai/__tests__/ExplanationStylePicker.test.tsx \
  apps/learner/src/ai/__tests__/useCompanionShortcut.test.ts \
  apps/learner/src/ai/__tests__/ReaderToolbar.test.tsx \
  apps/learner/src/ai/__tests__/context-mapper.test.ts
pnpm format:check
```

Expected: `format:check` passes.

- [ ] **Step 5: If any verification step changed files, commit the formatting/verification fixes.**

```bash
git add -A
git commit -m "chore(ai-companion): phase-1 verification fixes" || echo "nothing to commit"
```

---

## Manual verification (dev server)

```bash
pnpm --filter @open-edu/learner dev   # port 4001
```

- [ ] FAB stays visible on non-course pages (Home, Catalog, Settings) when the companion panel is open; mood is `curious` while open.
- [ ] On a course page the FAB hides when the right sidebar is open and returns when collapsed.
- [ ] `Cmd+Shift+P` (Mac) / `Ctrl+Shift+P` (Win/Linux) toggles the companion panel everywhere except while typing in an input/textarea.
- [ ] Reader toolbar renders above course content with the Sparkles button, `⌘⇧P`/`Ctrl⇧P` hint badge, and unread dot; clicking it toggles the right sidebar.
- [ ] Selecting an explanation style in the sidebar picker changes Pipili's response formatting on the next message.
- [ ] Selecting **OpenMoji** in Settings renders OpenMoji SVGs for emoji in Pipili messages; switching back to **Native** renders system emojis.
- [ ] With the network disabled, OpenMoji SVGs fall back to native Unicode emoji text.

---

## Self-review notes (for the plan author — not tasks)

- **Spec coverage:** FAB persistence → Task 8d; global shortcut → Task 8 (hook + AppShell); reader toolbar → Task 8 (component + AppShell header); explanation styles → Tasks 4-6 + picker Task 5; pluggable emoji + OpenMoji → Tasks 3, 4 (prefs), 7 (PipiliMessage), 8 (settings); system prompt guidance → Task 6; i18n → Task 1. All five features in the source plan are mapped.
- **Type consistency:** `ExplanationStyle` defined once (Task 2) and reused everywhere (`ExplanationRequest.style`, `LearnerProfile.explanationStyle`, `LearningContext.learnerPreferences.explanationStyle`, picker, policy). `EmojiMode` defined in `CompanionProvider` and exported via `ai/index.ts`. `splitEmojiRuns`/`emojiToHex` names match between implementation and tests.
- **Fallback safety:** `EmojiText` renders native text when `format === 'native'` or `getUrl` is undefined; `EmojiGlyph` falls back on `onError`. `PipiliMessage` resolves `'openmoji'` → `createOpenMojiPack()`, everything else → `NativeEmojiPack`.
- **Rebuild requirement:** `@open-edu/ai-companion/pipili` is consumed from `dist/`; the build step is called out in Task 2 Step 5 and Task 9 Step 1.
