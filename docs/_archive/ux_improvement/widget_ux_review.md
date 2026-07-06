# Widget UX Review — All 14 Built-in Widgets

> Full source-code audit of `packages/widgets/src/builtins/*`.  
> Reviewed from a UX standpoint: interaction model, visual design, feedback quality, state management, accessibility, and learner cognition.

---

## Cross-Cutting Issues (Apply to Every Widget)

Before individual reviews, there are four systemic problems across **all** widgets:

### 🔴 CX-1: Observe Mode Auto-Completes in 1.5 s With No Feedback

Every widget uses the same pattern for "observe" (non-interactive) mode:

```ts
const timer = setTimeout(() => {
  complete(100);
  setSubmitted(true);
}, 1500);
```

A learner literally just needs to exist on the page for 1.5 seconds to get 100%. There is zero visual indication that the timer is running, no animation, and no confirmation to the learner that they have "seen" anything. The "Completed." or "Observed." text that appears afterward is invisible — a bare `<div role="status">`.

**Recommendation**: Add a visible "Seen ✓" overlay or progress pulse to signal observation. At minimum, show a dismissible "Mark as seen" button so the learner consciously acknowledges the content.

---

### 🔴 CX-2: Submit Button Is Unstyled — All Widgets

Every `<button>` in every widget renders with zero CSS. They use browser-default styling (grey pill with system font), completely inconsistent with the design token system used by the rest of the app. This makes all interactive widgets feel like raw HTML prototypes rather than a polished educational product.

**Recommendation**: Every widget button must use the design token classes from `@open-edu/runtime` (e.g., `bg-primary text-on-primary rounded-lg px-md py-sm`) or accept a className/style prop from the surrounding `WidgetCanvas` (see CX-3).

---

### 🔴 CX-3: No Visual Widget Container — Each Widget Renders Naked

Widgets render `<div>` with no padding, no border, no background — directly inside the `LayoutShell`. The appearance is a raw flow of HTML paragraphs, buttons, and SVGs with no visual boundary.

**Recommendation**: As noted in the shell-level UX review — a `WidgetCanvas` wrapper component should give every widget a consistent outer card with: `rounded-xl border border-outline-variant p-md bg-surface-container-lowest`. Widgets should not own their own outer shell.

---

### 🟡 CX-4: Error State Is Identical Across All Widgets

Every widget shows exactly the same error: `<div role="alert"><p>Invalid widget configuration.</p></div>`. There is no debug information, no indication of what's wrong, and no recovery path for the learner.

**Recommendation**: Distinguish between "content unavailable" (learner-facing: "This activity couldn't load. Your teacher has been notified.") and developer-mode errors (show config validation messages in dev). Production errors should never expose technical language to learners.

---

## Individual Widget Reviews

---

### 1. MultipleChoice

**Files**: [MultipleChoice.tsx](file:///Users/sarthakpatnaik/Code/open-edu/packages/widgets/src/builtins/MultipleChoice/MultipleChoice.tsx)

**Modes**: Legacy (single Q), Multi-observe, Multi-interactive

#### UX Problems

**Dual personality — confusing architecture surfacing in UI**  
The widget supports 3 different internal modes: "legacy," "multi-observe," and "multi-interactive." Depending on the config, it renders completely different HTML structures. This inconsistency means learners get different layout, different element types, and different interaction patterns for what is semantically the same activity type.

**No per-question feedback in multi-interactive mode**  
When answering question N of M, the learner clicks Next without ever seeing whether their last answer was right or wrong. Feedback only appears at the very end: `"You got X of Y correct"` — a bare paragraph with no detail.

**Multi-interactive result screen is a single sentence**  
After submitting all questions, the widget shows one `<div>` with `"You got X of Y correct."` — no breakdown of which questions were wrong, no explanations, no encouragement.

**Observe mode shows the correct answer pre-selected**  
In multi-observe, the correct answer radio is pre-checked with a `✓` next to it. This is a pedagogical pattern (show, then hide), but there's no label explaining "this is the correct answer" — the `✓` is inside a `<span>` with no aria label.

**The button changes label to "Correct!" or "Incorrect"**  
In legacy mode, after submit the button text itself becomes the feedback indicator: `disabled ? (isCorrect ? 'Correct!' : 'Incorrect') : 'Submit'`. This is wrong semantically — buttons communicate actions, not states. Feedback belongs in a separate element.

#### Recommendations

- Unify the 3 rendering modes into one consistent UI with configuration-driven behavior.
- Show per-question feedback (✓/✗) immediately after each Next click before proceeding.
- Replace the post-submit result screen with a question-by-question review.
- Replace button label feedback with a dedicated feedback region.
- Add an `explanation` field to per-question schema and render it on submission.

---

### 2. FillBlank

**Files**: [FillBlank.tsx](file:///Users/sarthakpatnaik/Code/open-edu/packages/widgets/src/builtins/FillBlank/FillBlank.tsx)

#### UX Problems

**Dropdown combobox is implemented manually with poor affordance**  
The `select` mode renders a `<button role="combobox">` that shows `"?"` when empty. There is no visual cue (no chevron ▼ icon, no placeholder label beyond `?`) that it's a dropdown. Learners unfamiliar with this pattern won't know to click it.

**Inline blanks inside paragraph text are tiny**  
The `type` mode renders `<input>` elements (`width: 6rem`) inline within a paragraph. For young learners or mobile users, 6rem wide inline inputs are very hard to tap and visually confusing within flowing text.

**Feedback is shown as a second disabled button**  
After submission, the feedback appears as a disabled `<button>` that reads "Correct!" or "Incorrect". This is semantically wrong — disabled buttons are not feedback elements. A learner using a screen reader will hear "Correct!, dimmed, button" which is bizarre.

**Multiple blank grading: only count shown, no reveal**  
After submitting with some blanks wrong, the feedback says "2 of 3 blanks correct." — but the learner cannot see which specific blanks were wrong. The blanks just remain with their incorrect answers, with no red/green highlighting on incorrect ones.

**Hint system requires multiple clicks and is styled as tiny grey text**  
Hints are revealed progressively via a "More help" button styled with `fontSize: '0.8rem'`. This is too subtle — most learners will miss it.

#### Recommendations

- Replace the custom combobox with a styled `<select>` or a visually clearer dropdown with a visible ▼ indicator.
- After submission, color-code each blank: green border for correct, red border with revealed correct answer for incorrect.
- Replace the "feedback as disabled button" pattern with a `<div role="status">` with appropriate visual styling.
- Make the hint system more prominent — a styled "💡 Hint" button with a consistent appearance.

---

### 3. FractionVisual

**Files**: [FractionVisual.tsx](file:///Users/sarthakpatnaik/Code/open-edu/packages/widgets/src/builtins/FractionVisual/FractionVisual.tsx)

#### UX Problems

**Interactive segments have no hover state**  
The SVG segments in interactive mode use `cursor: pointer` but have no `hover` fill change. The only feedback is the cursor shape changing. Learners have no visual affordance to know segments are clickable until after they've clicked.

**Fraction label is raw text (`2/5`) in a `<div role="status">`**  
The `displayIndex` (e.g., `2/5`) is rendered as plain text in a live region. This is not typeset as a proper fraction — for a math-focused educational tool, this should use proper fraction notation with a numerator over a denominator (SVG text or CSS `frac` styling).

**"Not quite." feedback is vague**  
After an incorrect submission, the feedback is `"Not quite."` — offering zero information. For a fraction activity, the learner needs to know what the correct fraction was and ideally see both the target and their attempt side by side.

**Interactive bar and circle SVG heights are equal (`size × size`)**  
The bar fraction renders as a square SVG. A fraction bar should be a wide rectangle, not a square. A circle fraction should be circular, not square. Both are rendered as `size × size`, making the bar look distorted and tall.

**Hard cap at 12 denominator with plain "Too many parts to display"**  
The error for `denominator > 12` is a bare `<p>` — no visual context, no guidance for the author.

#### Recommendations

- Add `fill` hover states to interactive SVG segments (e.g., lighten the color on `:hover`).
- Render fraction notation properly: `n/d` should visually show a numerator over a denominator line, not just a string.
- Bar visual: set `height` to ~`size/4` (wide rectangle) and `width` to `size` — not square.
- Post-submit feedback: "You shaded X segments. The correct answer is Y/Z." with the visual showing the target shading.

---

### 4. VisualCounting

**Files**: [VisualCounting.tsx](file:///Users/sarthakpatnaik/Code/open-edu/packages/widgets/src/builtins/VisualCounting/VisualCounting.tsx)

#### UX Problems

**Number answer buttons are computed as `expected ± 3`**  
The widget auto-generates answer buttons from `max(1, expected-3)` to `expected+3`. This means 7 answer buttons are always shown. For a learner counting 20 items, they see buttons 17–23. This removes the counting exercise's challenge — the learner can count roughly and still hit a nearby button.

**"Incorrect" feedback as a disabled button**  
Same pattern as FillBlank — feedback text appears as the label of a disabled button.

**Addition mode renders `+` and `=` as emoji with `role="img" aria-label="plus"`**  
The `+` and `=` symbols are wrapped in `<span role="img" aria-label="plus">` — this is a misuse of ARIA. Plain text `+` and `=` are perfectly acceptable symbols and don't need to be wrapped as images.

**`"No items to count."` appears when `displayItems` is empty but not in addition mode**  
When an author specifies only `count` (not `items`), the learner sees "No items to count." even though items are being rendered as emoji via `content.emoji`. This is a stale code path that leaks into production.

**Size of emoji items has no mobile consideration**  
`sm` = `2rem`, `md` = `3rem`, `lg` = `4rem`. On a phone screen, 20 items at `3rem` each in a flex row will overflow or wrap unexpectedly, with no grid management.

#### Recommendations

- Make number buttons non-sequential — randomize their order or offer a free-input mode for harder difficulty.
- Remove the disabled-button feedback pattern in favor of a styled `<div role="status">`.
- Fix the "No items to count" stale code path.
- Wrap emoji items in a responsive grid (auto-fill) rather than a flat flex row.

---

### 5. DragDrop

**Files**: [DragDrop.tsx](file:///Users/sarthakpatnaik/Code/open-edu/packages/widgets/src/builtins/DragDrop/DragDrop.tsx)

#### UX Problems

**Not actually drag-and-drop — it's click-to-select + click-to-place**  
The widget is named `DragDrop` and described as a "drag and drop activity," but uses a two-step click interaction: click an item to select it (highlight it), then click a target zone to place it. Actual HTML5 drag-and-drop (`draggable`, `ondragstart/drop`) is not implemented. This is a significant expectation gap given the widget's name.

**No visual "dragging" animation or cursor feedback**  
When an item is selected, only a blue border appears. There is no cursor change to `grabbing`, no drag shadow, no animated transition to the drop zone. The interaction is invisible and feels broken to users who expect dragging.

**All drop zones highlight simultaneously when an item is selected**  
When an item is selected, `border: '2px solid #3b82f6'` is applied to **all** drop zones simultaneously. There's no distinction between "this is a valid drop target" and "this is not relevant right now." This creates visual noise and confusion.

**Remove button is tiny (✕) and red — alarming**  
Placed items have a small `✕` button styled `color: '#ef4444'` (red). Red in educational UIs communicates "wrong" or "error." Using red for "remove" creates a false negative association.

**"All items placed" text is grey italic placeholder style**  
Once all items are placed, the items tray shows grey italic text "All items placed." This is a common empty-state pattern, but at this point the Submit button should be the focus — visually promoting the Submit button would be more action-oriented.

#### Recommendations

- Implement real HTML5 drag-and-drop or be honest — rename to "Place" and use clear click-to-place affordances.
- If keeping click-to-place: change only the relevant target zones to highlight (not all simultaneously).
- Change the remove button color from red to a neutral grey or `text-on-surface-variant` icon.
- Animate the item "flying" into the drop zone on placement (CSS transition).

---

### 6. Matching

**Files**: [Matching.tsx](file:///Users/sarthakpatnaik/Code/open-edu/packages/widgets/src/builtins/Matching/Matching.tsx)

#### UX Problems

**Connection indicator is ASCII dashes `───`**  
The connection between matched left/right items is represented by hardcoded ASCII `───` characters in a center column `div`. This renders as a small fixed-width dashes row that doesn't visually connect to the actual item rows when items have different heights. There's no SVG line drawn between matched pairs.

**Right-column items stay fully opaque when already matched**  
A matched right item uses `opacity: 0.7` only when a left item is selected. Otherwise it looks identical to an unmatched item. Learners have no way to tell at a glance which right items are already paired.

**No way to re-match without removing the connection first**  
To change a match, a learner must: (1) find the `✕` on the left item, (2) click it, (3) re-select the left item, (4) click the new right item. A more natural UX is: click a left item that's already matched → it becomes selected, and clicking a new right item replaces the connection.

**Observe mode is a three-column grid with literal `───` connectors**  
In observe mode, the layout is a grid with left labels, center `───` strings, and right labels. The `───` doesn't actually draw a line — it's three text dashes that don't visually span across the grid gap. This looks broken.

**Shuffle uses `Math.random()` — no seed for reproducibility**  
The right-column items are shuffled on mount with `shuffleArray()` (Fisher-Yates with `Math.random()`). This means every render produces a different order, which is fine, but there's no way for educators to control or predict the layout for testing or content-specific reasons.

#### Recommendations

- Replace ASCII `───` with SVG lines drawn between matched pairs (even absolute-positioned CSS lines would be better).
- Right items that are already matched should visually dim or show a checkmark, not become slightly transparent only conditionally.
- Support "click to re-match" — selecting an already-matched left item should immediately make it ready for a new right-column selection.

---

### 7. Sequencing

**Files**: [Sequencing.tsx](file:///Users/sarthakpatnaik/Code/open-edu/packages/widgets/src/builtins/Sequencing/Sequencing.tsx)

#### UX Problems

**Click-to-append model — no reordering once placed**  
Items are added to the sequence by clicking them from the "available items" pool. They append to the bottom. To change position, a learner must click the placed item to remove it (`✕`), then re-add in the right position. There's no drag-to-reorder within the sequence zone.

**No numbered drop-zone slots in the target area**  
The "Your sequence" zone just appends items vertically. There's no visual indication of the expected sequence length or available slot positions. The learner doesn't know if they're building a 3-step or 10-step sequence until they've exhausted all items.

**Placed item removal requires clicking anywhere on the item**  
The placed item `role="button"` fires `handlePlacedItemClick` on click, but the `✕` character is also present inside the same element. Clicking anywhere on the item removes it — the `✕` is decorative, not a distinct action target. The `aria-label` says "Click to remove" but the user expects to click the ✕ specifically.

**Feedback shows position-count but not which items were wrong**  
Post-submit feedback: `"2 of 4 items in the right position."` — no highlight of which were correct vs. incorrect. The entire sequence just sits there with no visual differentiation.

**"Click items to build your sequence" instruction appears before items**  
The instruction text `<p>Click items to build your sequence:</p>` appears immediately, even when the activity zone is empty. For young learners, this is fine, but it reads as filler text rather than a contextual guide.

#### Recommendations

- Add drag-to-reorder within the sequence zone (or at minimum Up/Down arrow buttons on each placed item).
- Show numbered placeholder slots in the target zone (e.g., "Step 1 **_", "Step 2 _**") before items are placed.
- After submission, color-code each placed item: green for correct position, red for wrong position.
- Make `✕` a distinct focusable button inside the item, not a click on the entire item.

---

### 8. ChartReader

**Files**: [ChartReader.tsx](file:///Users/sarthakpatnaik/Code/open-edu/packages/widgets/src/builtins/ChartReader/ChartReader.tsx)

#### UX Problems

**Interactive bar chart responds to a single click — no confirmation step**  
In interactive mode, clicking a bar immediately calls `complete(score)` via `handleSelect`. There's no "Is this your answer?" confirmation. A learner who accidentally clicks the wrong bar has no way to undo.

**After selecting a bar, the UI shows only `<p>Completed.</p>`**  
There's no visual state change on the chart after clicking. No highlight of the selected bar, no indication of whether the answer was right or wrong, no explanation of what the correct answer was. Just a bare "Completed." text.

**Pictograph: emoji count as visual data is hard to scan at scale**  
The pictograph renders `value` number of emoji symbols per row. For `value = 20`, this means 20 emoji in a horizontal flex span with no grid wrapping — they overflow or wrap unpredictably.

**Bar chart `svgWidth` calculation can produce very wide SVGs**  
`svgWidth = data.length * (barWidth + gap) + padding`. For 10 bars: `10 * (60+40) + 60 = 1060px`. On a mobile screen or narrow column this breaks layout. There's no `maxWidth` on the SVG — only `style={{ maxWidth: '100%', height: 'auto' }}` on the `<svg>` tag, which may not resize correctly if the viewBox is fixed.

**Interactive mode requires `correctLabel` in config but gives no UI instruction**  
The `description` field is optional and the interactive chart renders no task instruction by default. A learner sees a chart and nothing else — no "Which category has the highest value?" prompt.

#### Recommendations

- Add a two-step flow: click selects the bar (highlighted), a "Submit" button confirms.
- After submit: green the correct bar, red the selected (if wrong), show a brief explanation.
- Limit pictograph emoji rendering to a grid (e.g., 10 per row) for large values.
- Require `description` (the question text) in interactive config schema and render it prominently above the chart.

---

### 9. ClockTime

**Files**: [ClockTime.tsx](file:///Users/sarthakpatnaik/Code/open-edu/packages/widgets/src/builtins/ClockTime/ClockTime.tsx)

#### UX Problems

**Set mode uses `▲ / ▼` buttons with no visible time display during interaction**  
To set the time, learners click ▲/▼ buttons for hour and minute. The current time `displayHour12:displayMinuteStr` is shown only as the clock hand positions — there's no digital readout that updates in real-time as the user adjusts (unless `showDigital: true` is explicitly configured, but that renders in a `<div role="status" aria-live="polite">` that shows empty string when `!config.showDigital`).

**`Tab` key is overridden to switch between hour/minute modes**  
In `handleKeyDown`, `Tab` is intercepted to toggle between hour and minute mode. Overriding the Tab key is a major accessibility antipattern — it traps keyboard users inside the clock widget and prevents them from tabbing to other elements on the page.

**Read mode: clicking a number on the clock immediately submits**  
In read mode, clicking any hour number (1–12) immediately calls `complete()` — no opportunity to reconsider. Like ChartReader, this needs a confirmation step.

**"Tab to switch between hour/minute, arrow keys to adjust" appears as small grey span**  
This keyboard instruction is styled `fontSize: '0.75rem', color: '#6b7280'` — it's practically invisible and appears only after the submit button. Keyboard affordances should appear before the interactive element, in a consistent visible way.

**Binary scoring — 1 minute tolerance is very strict**  
`minuteCorrect = Math.abs(currentMinute - target.minute) <= 5`. A 5-minute tolerance is used but learners receive 0 or 100 — no partial credit for being "close." For a young learner setting 3:15 when the answer is 3:20, they get 0/100 with `"Not quite."`.

#### Recommendations

- Always show a digital readout that updates live as the user adjusts hour/minute in set mode.
- Remove the Tab key override — use explicit `<button>` toggles labeled "Hour" and "Minute" to switch mode.
- Add a confirmation step after clock reading selection before scoring.
- Move keyboard instructions to a visible `<label>` or help text above the interactive element.

---

### 10. GridArea

**Files**: [GridArea.tsx](file:///Users/sarthakpatnaik/Code/open-edu/packages/widgets/src/builtins/GridArea/GridArea.tsx)

#### UX Problems

**Grid cells have `outline: none` — focus is invisible for keyboard users**  
Each grid cell is a `<button>` with `outline: none` hardcoded in the style. This completely removes the browser's focus ring, making keyboard navigation impossible to see. WCAG 2.4.7 requires visible keyboard focus.

**Perimeter mode gives no instruction on what "perimeter" means**  
The widget switches to perimeter mode but there's no contextual label explaining the task. The count display reads "Perimeter count: X" but the learner has no guidance on what they're supposed to do. Should they click all border cells? Click exactly X cells?

**Maximum highlight limit silently rejects clicks**  
When `maxHighlights` is reached, additional cell clicks are silently ignored (`return prev`). There is no visual or textual feedback to explain why clicking a cell did nothing.

**Grid can be 20×20 = 400 cells, each requiring individual keyboard access**  
A 20×20 grid with 400 individual `<button>` elements creates a keyboard navigation nightmare. A learner using keyboard must Tab through all 400 cells to reach the Submit button.

**All cells are the same blue — no hover state**  
Highlighted cells are `backgroundColor: '#3b82f6'` and non-highlighted are `#ffffff`. There is no hover state, making the interactive intent unclear before first interaction.

#### Recommendations

- Remove `outline: none` — or provide a custom focus ring (`box-shadow: 0 0 0 2px blue` etc.).
- Add a hover state: `#dbeafe` (light blue) for non-highlighted cells on hover.
- When `maxHighlights` is reached, show a brief status message: "Maximum X cells selected."
- For large grids, add keyboard shortcuts (e.g., arrow keys to move focus between cells).

---

### 11. MeasurementScale

**Files**: [MeasurementScale.tsx](file:///Users/sarthakpatnaik/Code/open-edu/packages/widgets/src/builtins/MeasurementScale/MeasurementScale.tsx)

#### UX Problems

**Marker is always red (error color) before submit**  
The ruler marker, thermometer fill, and cylinder fill are all `#ef4444` (red) before submission. Red is an error/warning color. Using it as the default "current value" indicator sends the wrong signal — learners may think their initial reading is wrong before they've even interacted.

**Click-anywhere-on-SVG to set value**  
The interactive SVG intercepts `onClick` on the entire SVG element and maps click position to a value via DOM coordinate math. This is imprecise, especially on mobile (touch events aren't handled at all — only `MouseEvent` is typed). Additionally, there's no visual snapping indicator showing the "next tick" the value will snap to.

**No visible current-reading label during interaction**  
The reading (`currentReading`, e.g., `"15cm"`) appears in a `<div role="status" aria-live="polite">` but only if `showReading` is true. Even when shown, there's no visual positioning of this label relative to the SVG — it just appears above or below.

**Thermometer and cylinder use red as the liquid fill color**  
Both the thermometer and cylinder use `#ef4444` (red) as the fill. A thermometer could legitimately be red, but it should change color meaningfully (e.g., blue below 0°, red above body temp). Currently it's just permanently red, reinforcing the "error" association.

**`containerRef` is declared but never used**  
`const containerRef = useRef<HTMLDivElement>(null)` is created and attached to the outer div but never read anywhere. This is a dead code remnant that adds noise to the component.

#### Recommendations

- Change default marker/fill color from red to a neutral indicator (e.g., `#3b82f6` blue or a dark grey).
- Add touch event support (`onTouchStart`, `onTouchMove`) for mobile learners.
- Show the current reading directly on the SVG as a floating label next to the marker for immediate visual feedback.
- Remove the unused `containerRef`.

---

### 12. PlaceValueChart

**Files**: [PlaceValueChart.tsx](file:///Users/sarthakpatnaik/Code/open-edu/packages/widgets/src/builtins/PlaceValueChart/PlaceValueChart.tsx)

**Strongest UX among all widgets.** The click-to-select digit, click-slot-to-place interaction is clear and consistent. The live status announcements are helpful. The chart itself visually communicates column labels well.

#### UX Problems

**Digit bank always shows 0–9 (10 digits) regardless of task**  
`bankDigits = content?.draggableDigits ?? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]`. If the task is "place 1,234," all 10 digits appear in the bank, but only 1, 2, 3, 4 are needed. Extra digits create cognitive noise and increase the chance of errors. The `draggableDigits` config allows narrowing, but the default is too open.

**Selected digit status: `"Selected digit: 5"` — no instruction on what to do next**  
After selecting a digit, a status message reads "Selected digit: 5" — but there's no instruction like "Now click a column to place it." First-time learners may not know to click a slot.

**Slot already has a digit — clicking replaces with nothing**  
When a slot has a digit and you click it: `if (current !== null) { next[index] = null; }` — the slot is cleared, not replaced with the selected digit. If you had a digit selected and click a filled slot, you lose both the selection and the placed digit. The expected behavior would be to replace the existing digit.

**Column labels use Indian number system abbreviations (Cr, TL, L...)**  
The label system is specific to the Indian number system (Crore, Lakh). The full labels (`"Crore"`, `"Ten Lakh"`) are used in aria-labels but abbreviated in the visual (`"Cr"`, `"TL"`). Non-Indian learners will not understand these abbreviations. International support would require a configurable column labeling system.

#### Recommendations

- Default `draggableDigits` should derive from the digits in `targetNumber` (if set), not always 0–9.
- After digit selection, update instruction text: `"Selected: 5 → click a column to place it."`
- Fix the slot-click logic: if a digit is selected AND the slot is occupied, replace the digit.

---

### 13. RealWorld

**Files**: [RealWorld.tsx](file:///Users/sarthakpatnaik/Code/open-edu/packages/widgets/src/builtins/RealWorld/RealWorld.tsx)

#### UX Problems

**The textarea `label` duplicates the `prompt` text**

```tsx
<label htmlFor="real-world-response">{prompt ?? 'Your response:'}</label>
<textarea ... />
```

The `prompt` is already rendered as a `<p>` above the `<div>`. It now also appears as the textarea's label, creating duplicate content. A screen reader will announce the prompt twice.

**Always completes with score 100 regardless of response quality**  
`handleComplete` always calls `complete(100)`. The `expectedAnswer` field is captured in the interaction event but not used for scoring. Every learner who writes anything gets full marks. This removes all assessment value from the widget.

**`visualExample` is rendered as a plain text `<span aria-hidden="true">`**  
The `visualExample` field (presumably an emoji or unicode icon) is just placed in a `<span>` before the scenario text with `aria-hidden="true"`. There's no styling, no sizing, no prominent display — it blends into the text.

**"I Completed This Task" button — ambiguous label**  
This button label implies the learner has done something _outside_ the browser (a real-world physical task). This is semantically correct for the widget's purpose but provides no guidance on _what_ to do. A learner who has done nothing could click it immediately.

**Submitted state just shows "Task completed." — no summary**  
After submission, the textarea and button disappear, and `"Task completed."` appears in a `<div role="status">`. There's no echo of the learner's response, no acknowledgement of what they wrote.

#### Recommendations

- Remove the duplicate label/prompt — use the prompt _as_ the aria-label for the textarea without repeating it visually.
- For tasks with `expectedAnswer`, implement simple text-matching scoring (case-insensitive), or mark clearly that this is self-assessed.
- Make `visualExample` prominent: render in a styled callout box with larger font size.
- After submission, show the learner's response echoed back: "Your response: [their text]" as a summary.

---

### 14. StoryQuestion

**Files**: [StoryQuestion.tsx](file:///Users/sarthakpatnaik/Code/open-edu/packages/widgets/src/builtins/StoryQuestion/StoryQuestion.tsx)

#### UX Problems

**Story text is not visually distinct from the question**  
The story/scenario is rendered in a plain `<article>` with a `<p>` and the question fieldset follows immediately. There's no visual separator, no callout box, no background differentiation to help learners understand "read this first, then answer."

**No per-question feedback before moving to the next question**  
After clicking Next on question 1, the widget immediately renders question 2 with no feedback on whether question 1 was answered correctly. Final feedback only: `"You got X of Y correct."` — same issue as `MultipleChoice`.

**Observe mode shows correct answer pre-checked with a `✓` text span**  
Same pattern as `MultipleChoice` observe mode. The `✓` is not accessible — it's `<span> ✓</span>` with no aria-label. A screen reader says "checkmark" which conveys nothing contextual.

**Result screen replaces the story entirely**  
After submission, the submitted state renders only the story `<article>` and the result `<p>` — the questions disappear. A learner who wants to review their answers or re-read which question they got wrong cannot do so.

**`visual` field is a string rendered as emoji/icon before the story**  
Like `RealWorld`, the `visual` field is a string (emoji) placed in a `<span aria-hidden="true">` before the story text. No sizing, no distinct visual treatment.

#### Recommendations

- Give the story a distinct visual callout: `bg-primary-container/20 rounded-lg p-md` before the questions.
- Show per-question feedback immediately after each Next click (✓ for correct, ✗ for incorrect with correct answer shown).
- On the result screen, show a question-by-question review with the learner's answer vs. correct answer.
- Show question progress: "Question 2 of 5" above each question.

---

## Priority Summary Matrix

| Widget           | Top UX Issue                                                   | Priority       | Severity    |
| ---------------- | -------------------------------------------------------------- | -------------- | ----------- |
| All widgets      | Unstyled native buttons (CX-2)                                 | 🔴 Fix now     | Critical    |
| All widgets      | Observe auto-complete with no feedback (CX-1)                  | 🔴 Fix now     | Critical    |
| All widgets      | No widget container shell (CX-3)                               | 🔴 Fix now     | High        |
| MultipleChoice   | No per-question feedback, feedback as button label             | 🔴 Fix now     | High        |
| DragDrop         | Not actually drag-and-drop; all zones highlight simultaneously | 🔴 Fix now     | High        |
| GridArea         | `outline: none` removes focus ring                             | 🔴 Fix now     | High (A11y) |
| ClockTime        | Tab key override traps keyboard users                          | 🔴 Fix now     | High (A11y) |
| FillBlank        | Feedback as disabled button; no per-blank reveal               | 🟡 Next sprint | Medium      |
| Sequencing       | No reorder in sequence zone; no position feedback              | 🟡 Next sprint | Medium      |
| Matching         | ASCII `───` connectors; no re-match UX                         | 🟡 Next sprint | Medium      |
| ChartReader      | Single-click immediate submit; no post-selection state         | 🟡 Next sprint | Medium      |
| MeasurementScale | Red marker color before submit; no touch support               | 🟡 Next sprint | Medium      |
| FractionVisual   | Square bar SVG; vague "Not quite" feedback                     | 🟡 Next sprint | Medium      |
| VisualCounting   | Feedback as disabled button; emoji overflow                    | 🟡 Next sprint | Medium      |
| RealWorld        | Always 100% score; duplicate label                             | 🟢 Backlog     | Low         |
| StoryQuestion    | Story not visually distinct; result replaces questions         | 🟢 Backlog     | Low         |
| PlaceValueChart  | Slot replace logic bug; fixed 0–9 digit bank                   | 🟢 Backlog     | Low         |
