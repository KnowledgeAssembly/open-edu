# Pipili AI Companion Design

**Status:** Approved design; implementation limited to MVP

**Scope:** OpenEdu learner app and its existing AI companion/LLM packages

## Goal

Build Pipili as a course-aware learning companion that helps learners understand, reflect, and progress without becoming a generic chatbot or assessment answer generator. The MVP will provide course and lesson grounding, notes integration, progressive hints, assessment guardrails, accessibility adaptation, reflection prompts, and session memory. The design will expose stable seams for V2 mastery tracking, concept-graph reasoning, telemetry interventions, teacher insights, and parent views without implementing those features now.

## Design decisions

### Server-owned orchestration

Prompt construction, educational policy, context prioritization, assessment restrictions, model routing, and tool access belong on the server side. The learner browser sends the conversation and a validated runtime-context snapshot; it must not construct the system prompt or hold provider credentials.

### Vercel AI SDK at the LLM boundary

Use Vercel AI SDK Core for server generation and tool calling, and AI SDK UI for the React chat transport:

- `streamText` for interactive streamed responses.
- `useChat` with `DefaultChatTransport` for learner-side chat state and streaming.
- `tool` plus Zod schemas for narrowly scoped educational tools.
- Structured output or validated response metadata for Pipili mode, citations, hint level, safety status, and suggested next steps.
- AI SDK message metadata/data parts for machine-readable response information that should not be mixed into visible prose.

Keep `@open-edu/llm-config` as the OpenEdu-owned provider and routing abstraction. It should construct AI SDK language models from the existing environment configuration rather than exposing AI SDK details throughout the learner UI.

Initial provider options:

- `@ai-sdk/openai` for OpenAI models.
- `@ai-sdk/google` for Gemini models when direct Google access is configured.
- `@openrouter/ai-sdk-provider` for OpenRouter-backed model selection and fallback.

The selected MVP provider/model must support the required combination of streaming, structured output, and tool calling. Provider capability differences must be represented in configuration and covered by tests rather than assumed to be universal.

## MVP architecture

```text
Learner UI
  useChat + DefaultChatTransport
        |
        v
Pipili chat endpoint
  request validation
  context assembly
  assessment policy
  accessibility policy
  model routing
  streamText + safe tools
        |
        v
@open-edu/llm-config model factory
  OpenAI / Google / OpenRouter
```

### Package ownership

`packages/ai-companion` owns provider-neutral domain contracts and pure services:

- Pipili request and response metadata types.
- Page, widget, lesson, course, notes, assessment, learner-profile, and history context types.
- Context-priority and bounded-context utilities.
- Conversation/session contracts.
- Citation and hint contracts.
- Provider interfaces used by the learner app.

`packages/llm-config` owns model construction and routing:

- Provider configuration from environment variables.
- AI SDK provider initialization.
- Fast-model and escalation-model selection.
- Provider capability declarations.
- A model-factory interface that keeps the rest of OpenEdu independent of provider packages.

The learner app/server integration owns Pipili policy and transport:

- HTTP request validation and authentication boundary where applicable.
- Context assembly from runtime state, notes, progress, and course data.
- System instructions and response policy.
- Assessment guardrails.
- Tool registration and authorization.
- Streaming endpoint compatible with AI SDK UI.

The learner UI owns presentation only:

- `useChat` transport wiring.
- Composer, streaming state, stop/retry behavior, and errors.
- Assistant message rendering.
- Citation and suggested-next-step presentation.
- Progressive-hint controls.
- Accessibility-profile presentation details.

## Contracts

The request sent to the Pipili endpoint contains a conversation identifier, UI messages, and a current context snapshot. It must be validated and size-limited before use.

```ts
type PipiliRequest = {
  conversationId: string;
  messages: UIMessage[];
  context: {
    page?: PageContext;
    widget?: WidgetContext;
    lesson?: LessonContext;
    module?: ModuleContext;
    course?: CourseContext;
    notes?: NotesContext;
    assessment?: AssessmentContext;
    learner?: LearnerProfile;
    history?: LearningHistory;
  };
};
```

The server normalizes this into a bounded context envelope. Sources retain provenance and priority:

```text
Current page
  -> current widget
  -> current lesson
  -> current module
  -> current course
  -> learner notes
  -> learning history
  -> concept graph (V2 seam)
  -> global knowledge
```

Global knowledge is used only when educational context is unavailable. Context entries must be truncated or omitted deterministically when limits are reached; the implementation must never silently replace high-priority context with lower-priority context.

Assistant responses expose visible text plus validated metadata:

```ts
type PipiliResponseMetadata = {
  mode: 'tutor' | 'coach' | 'reflection' | 'navigator' | 'accessibility';
  citations: Citation[];
  hintLevel?: 1 | 2 | 3 | 4;
  assessmentSafe: boolean;
  suggestedNextSteps: string[];
};
```

The metadata is delivered as typed AI SDK message metadata or data parts and rendered by the learner UI. It is not requested as free-form JSON inside the visible response text.

## MVP orchestration

The endpoint handles a request in this order:

1. Validate the HTTP body, UI messages, context shape, message count, and content size.
2. Normalize the context and attach source provenance.
3. Determine whether assessment mode is active.
4. Resolve learner language, reading level, and accessibility preferences.
5. Select the fast default model; use the escalation model only for explicitly defined complex requests.
6. Build Pipili system instructions from policy, context, profile, and assessment state.
7. Register only tools allowed for the current request.
8. Call `streamText` with converted model messages and bounded context.
9. Stream text and validated metadata to the learner UI.
10. Persist the completed session message through the existing conversation storage path.

The initial safe tool set is:

- `getCurrentPageContext` — returns the current page/widget content already authorized by runtime context.
- `getCurrentLessonContext` — returns objectives, content, and activities for the active lesson.
- `searchNotes` — searches learner-owned notes using the existing notes service/storage boundary.
- `getRelevantNotes` — retrieves bounded note excerpts selected by `searchNotes`.
- `getLearningHistory` — returns only the history fields needed for current guidance.
- `findRelatedConcepts` — initially uses available course/glossary data; the interface remains ready for the V2 concept graph.
- `createProgressiveHint` — produces or selects a hint level constrained by learner effort and assessment state.

Tools must have explicit Zod input schemas, bounded outputs, and no arbitrary file/system/network access. Notes and history tools must be scoped to the active learner and course context.

## Learning and safety policy

Pipili responses should generally follow this shape:

1. Direct answer or first useful hint.
2. Explanation grounded in the strongest available educational source.
3. A small example where useful.
4. A reflection prompt or check for understanding.
5. One suggested next step.

The model must guide learning rather than maximize answer completion. It should ask for learner effort before level-4 walkthroughs and avoid unnecessary topic changes.

When assessment mode is active:

- Do not reveal the answer, answer choice, or answer key.
- Do not solve the entire active assessment.
- Allow concept explanation, comparisons, questions about reasoning, and progressive hints.
- Mark the response metadata `assessmentSafe: true` only after the policy path has constrained the request.

When the needed information is absent from available context, return a clear limitation such as “I cannot find that information in the current course” and offer a safe way to continue. The model must not invent course facts or citations.

Accessibility adaptation is deterministic policy input, not a vague personality instruction:

- Autism profile: predictable headings, literal wording, short paragraphs, clear instructions, no unnecessary sensory language.
- ADHD profile: chunked content, key points, short actionable steps, and visible progress cues.
- Dyslexia profile: simpler wording, shorter sentences, and reduced dense prose.

## Memory and persistence

MVP session memory uses the existing conversation manager and IndexedDB-backed storage. The client may persist UI-format messages, but server processing must validate messages before converting them to model messages.

MVP does not add a new long-term learner profile store. Existing preferences, notes, progress, and telemetry are read through their current boundaries. The design reserves separate interfaces for:

- Course memory: strengths, misconceptions, and weak concepts.
- Long-term preferences: explanation choices and accessibility settings.
- V2 mastery and intervention records.

No provider key, hidden system instruction, or unapproved learner data is persisted in the browser.

## Error handling

The endpoint returns stable error categories for validation failure, missing configuration, provider authentication failure, provider rate limiting, timeout, stream interruption, and internal orchestration failure. The UI presents localized, learner-friendly messages and supports retry/stop without exposing provider internals.

If a stream is interrupted, the UI should preserve already received text, expose retry, and use AI SDK stream-resume behavior only when the server can safely identify the conversation and response. Partial assistant messages must not be persisted as complete responses.

Provider errors must not cause automatic escalation when assessment policy, context validation, or safety checks failed. Escalation is a routing decision, not an error bypass.

## Migration sequence

1. Add the AI SDK core/UI and selected provider dependencies at the correct workspace package boundaries.
2. Extend `@open-edu/llm-config` with an AI SDK model factory while preserving existing configuration names and provider selection.
3. Add Pipili domain contracts and context normalization utilities to `@open-edu/ai-companion`.
4. Implement the server-side Pipili orchestration and tool registry behind a typed endpoint.
5. Add request/response and policy tests before changing the learner UI.
6. Update `AIProviderImpl`, `CompanionProvider`, and `CompanionPanel` to use streamed UI messages and metadata.
7. Keep the current proxy path temporarily as a controlled fallback during migration, then remove prompt-building and generic JSON assumptions once the new endpoint is verified.
8. Regenerate any affected dev-server Tailwind output when runtime classes change.

## Testing strategy

Unit tests in `packages/ai-companion` cover:

- Context priority and deterministic truncation.
- Provenance and citation mapping.
- Learner-profile policy normalization.
- Hint progression and effort requirements.
- Assessment mode state.
- Conversation serialization compatibility.

Unit tests in `packages/llm-config` cover:

- Provider/model factory selection.
- Fast versus escalation routing.
- Missing credentials and unsupported capabilities.
- Provider configuration compatibility.

Server/integration tests cover:

- Request validation and size limits.
- Tool authorization and bounded results.
- Assessment answer refusal.
- Unsupported-information fallback.
- Correct context precedence.
- Stream success, timeout, provider errors, and interrupted streams.
- Metadata schema validation.

Learner tests cover:

- Streaming message rendering.
- Citation and next-step presentation.
- Hint-level interaction.
- Retry, stop, and error states.
- Session restoration.
- Accessibility audits for the companion panel and message states.

## V2 extension seams

The MVP should not implement these capabilities, but interfaces should avoid blocking them:

- `ConceptGraphProvider` for prerequisite and related-concept reasoning.
- `MasteryProvider` for mastery scores, misconception summaries, and intervention history.
- `LearningPlanService` for adaptive study plans.
- `InterventionPolicy` for telemetry-triggered support suggestions.
- Teacher and parent read models with explicit privacy and consent boundaries.

These are separate providers/services rather than additional prompt fields. V2 orchestration can add them as authorized tools after their data contracts, privacy rules, and tests exist.

## Success criteria

The MVP is complete when a learner can:

- Ask a question and receive a streamed, course-aware response.
- Receive citations tied to available lesson/course/note context.
- Ask for increasingly specific hints without immediately receiving an answer.
- Use Pipili safely during an active assessment.
- Receive explanations adapted to supported accessibility profiles.
- Ask about and search their notes through the companion.
- Restore the current session from existing storage.
- See clear, localized behavior when context, configuration, or provider access is unavailable.

Success is evaluated with learning-focused signals such as reduced confusion, improved assessment performance, lesson completion, retention, and learner satisfaction. Message count, session duration, and token usage are operational metrics only, not optimization goals.

## Official references

- [AI SDK Core: generating and streaming text](https://ai-sdk.dev/docs/ai-sdk-core/generating-text)
- [AI SDK Core: tool calling](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling)
- [AI SDK UI: `useChat`](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat)
- [AI SDK UI: transport](https://ai-sdk.dev/docs/ai-sdk-ui/transport)
- [AI SDK UI: message metadata](https://ai-sdk.dev/docs/ai-sdk-ui/message-metadata)
- [AI SDK providers](https://ai-sdk.dev/providers/ai-sdk-providers)
- [OpenRouter community provider](https://ai-sdk.dev/providers/community-providers/openrouter)
