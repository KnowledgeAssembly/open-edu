# OPENEDU AI COMPANION — ARCHITECTURE SPECIFICATION

**Status:** Proposed
**Scope:** OpenEdu Studio AI Companion
**Audience:** AI coding agents, platform engineers, product engineers
**Primary goal:** Evolve the existing Studio Author Assistant into a domain-aware, tool-using AI Companion without prematurely coupling OpenEdu to a specific agent framework or model provider.

---

# 1. Purpose

The OpenEdu AI Companion is the intelligent assistant embedded in OpenEdu Studio.

It helps educators:

- understand course content
- create courses and lessons
- edit existing content
- improve explanations
- create activities and assessments
- adapt content to learner profiles
- check accessibility and pedagogy
- navigate the course authoring environment
- inspect and modify course artifacts
- eventually perform multi-step authoring tasks

The Companion is **not a generic chatbot**.

It is an **AI-native authoring agent operating over the OpenEdu course workspace**.

The Companion must understand:

1. the current Studio state
2. the current course
3. the current lesson/activity
4. the course specification
5. OpenEdu content structures
6. available widgets
7. applicable skills and pedagogical profiles
8. available tools
9. user permissions
10. pending changes
11. conversation/task state

---

# 2. Architectural Principle

The Companion must be separated into three concerns:

```text
┌───────────────────────────────────────────────┐
│                 Studio UI                     │
│                                               │
│ Chat / Context / Draft Cards / Approvals      │
└──────────────────────┬────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────┐
│              OpenEdu Companion                │
│                                               │
│ Context                                       │
│ Skills                                        │
│ Intent                                        │
│ Agent Loop                                    │
│ Tools                                         │
│ Permissions                                   │
│ Task State                                    │
│ Memory                                        │
│ Validation                                    │
└──────────────────────┬────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────┐
│                Agent Runtime                  │
│                                               │
│ Cloud / Local / Hybrid                        │
└──────────────────────┬────────────────────────┘
                       │
                       ▼
              AI Model Provider
```

The **OpenEdu Companion layer is OpenEdu-owned**.

The underlying agent runtime and model provider are implementation details.

---

# 3. Goals

## 3.1 Primary goals

The architecture must support:

- conversational assistance
- context-aware responses
- structured course generation
- structured content editing
- tool calling
- multi-step tasks
- draft generation
- validation
- user approval
- atomic workspace changes
- local AI
- hosted AI
- future hybrid execution
- multiple model providers
- persistent conversations
- persistent task state
- skills
- permissions
- observability
- evaluation

## 3.2 Non-goals

The initial implementation must NOT attempt to build:

- unrestricted autonomous agents
- multi-agent orchestration
- autonomous publishing
- autonomous destructive filesystem operations
- provider-specific business logic
- model-specific application logic
- opaque database-only course manipulation
- a mandatory dependency on Mastra, OpenAI Agents SDK, or another agent framework

---

# 4. Existing Architecture to Preserve

The following existing architectural decisions are considered foundational.

## 4.1 Context-aware Companion

`StudioContextBridge.tsx` remains responsible for producing the validated:

```ts
StudioContextSnapshot;
```

using the existing Zod schema.

The Companion must consume structured context rather than attempting to infer Studio state from conversation history.

---

## 4.2 Draft-then-commit

This is a hard invariant.

The Companion must never directly modify course files.

The flow is:

```text
AI
 ↓
Generate proposed change
 ↓
Validate
 ↓
Create draft/change set
 ↓
User review
 ↓
User approval
 ↓
Atomic commit
```

The Companion may propose changes.

The workspace layer owns mutation.

---

## 4.3 Provider independence

All model access must remain behind:

```text
@open-edu/llm-config
```

or the future AgentRuntime abstraction.

Application code must not depend directly on Gemini/OpenAI/Claude-specific APIs.

---

## 4.4 Local/Hosted interchangeability

The existing distinction between:

```text
local Vite middleware
```

and:

```text
hosted gateway
```

must remain supported.

The Companion API should not care where the runtime executes.

---

## 4.5 i18n

All user-facing strings must continue to flow through the existing i18n system.

No hard-coded user-facing English strings may be introduced by Companion features.

---

# 5. Target Package Architecture

The Companion should gradually become an independent package boundary.

Recommended structure:

```text
packages/
  companion/
    src/
      core/
      agent/
      context/
      skills/
      tools/
      permissions/
      memory/
      tasks/
      validation/
      runtime/
      events/
      types/
```

Suggested responsibilities:

```text
core/
  Companion
  CompanionRequest
  CompanionResponse

agent/
  AgentLoop
  AgentState
  AgentStep

context/
  ContextProvider
  ContextSnapshot
  ContextAssembler

skills/
  Skill
  SkillRegistry
  SkillResolver

tools/
  Tool
  ToolRegistry
  ToolResult

permissions/
  Permission
  PermissionPolicy
  ApprovalRequest

memory/
  Conversation
  ConversationStore
  MemoryProvider

tasks/
  Task
  TaskState
  TaskStore

validation/
  OutputValidator
  ChangeValidator

runtime/
  AgentRuntime
  LocalRuntime
  HostedRuntime

events/
  CompanionEvent
```

The exact directory structure may evolve, but these conceptual boundaries must remain.

---

# 6. Companion Contract

The primary public API should be conceptually:

```ts
interface Companion {
  run(request: CompanionRequest): AsyncIterable<CompanionEvent>;
}
```

Example:

```ts
interface CompanionRequest {
  message: string;

  context: StudioContextSnapshot;

  conversationId: string;

  mode?: CompanionMode;

  permissions: CompanionPermissions;

  capabilities?: CompanionCapabilities;
}
```

The Companion should return events rather than a single final response.

---

# 7. Event Model

The UI must be able to represent an evolving agent operation.

Recommended event types:

```ts
type CompanionEvent =
  | {
      type: 'message.delta';
      text: string;
    }
  | {
      type: 'message.complete';
    }
  | {
      type: 'tool.started';
      toolCallId: string;
      tool: string;
    }
  | {
      type: 'tool.completed';
      toolCallId: string;
      result: unknown;
    }
  | {
      type: 'draft.created';
      draft: CourseDraft;
    }
  | {
      type: 'approval.required';
      approval: ApprovalRequest;
    }
  | {
      type: 'task.started';
      taskId: string;
    }
  | {
      type: 'task.progress';
      taskId: string;
      progress?: number;
      message?: string;
    }
  | {
      type: 'task.completed';
      taskId: string;
    }
  | {
      type: 'error';
      error: CompanionError;
    };
```

The event model should be transport-independent.

AI SDK streaming is an implementation mechanism, not the domain contract.

### Adapter boundary

To avoid maintaining two parallel event systems, the AI SDK coupling must be confined to a single adapter point:

```text
Companion (emits CompanionEvent)
        ↓
CompanionClient (CompanionEvent → UIMessageChunk)
        ↓
AI SDK useChat / transports
```

The Companion itself never imports AI SDK stream types. `UIMessageChunk` is only mapped to `CompanionEvent` inside `CompanionClient` (and back again for the UI). This means the domain contract (`CompanionEvent`) is stable while the AI SDK stream shape can change independently underneath.

---

# 8. Agent Runtime

The Companion must not directly own model execution.

Introduce:

```ts
interface AgentRuntime {
  run(request: AgentRuntimeRequest): AsyncIterable<AgentRuntimeEvent>;
}
```

Possible implementations:

```text
CloudAgentRuntime
LocalAgentRuntime
HybridAgentRuntime
```

Initial implementation:

```text
AgentRuntime
      ↓
Vercel AI SDK
      ↓
@open-edu/llm-config
      ↓
Model
```

This allows the project to continue using Vercel AI SDK without making it the permanent Companion architecture.

---

# 9. Agent Loop

The initial Agent Loop should be controlled and deterministic.

Conceptually:

```text
Receive request
      ↓
Assemble context
      ↓
Resolve skills
      ↓
Resolve permissions
      ↓
Determine intent/mode
      ↓
Select tools
      ↓
Run model
      ↓
Tool call?
   ┌──┴──┐
  Yes    No
   │      │
Execute   Response
   │
Validate result
   │
Continue loop
```

The loop must have:

- maximum step count
- timeout
- cancellation
- tool permission checks
- output validation
- error handling
- observable events

---

# 10. Intent

The current deterministic:

```text
parseIntentFromMessage()
```

should remain useful.

However, intent parsing must evolve from being the complete agent architecture into being **one signal available to the Companion**.

Current intents:

```text
draft_new
edit_existing
generate_course
explain
```

Future intents may include:

```text
review
improve
translate
adapt
validate
create_activity
create_assessment
find_content
inspect_course
publish
```

The Companion may combine:

```text
deterministic intent
+
current context
+
available skills
+
LLM reasoning
```

to determine the appropriate execution path.

Deterministic intents should continue to be preferred where the intent is unambiguous.

---

# 11. Skills

Skills are reusable domain capabilities.

Example:

```text
course-authoring
lesson-design
assessment-design
accessibility
curriculum-alignment
learner-adaptation
translation
visual-design
course-review
```

A skill should contain:

```ts
interface CompanionSkill {
  id: string;
  description: string;

  instructions?: string;

  tools?: string[];

  permissions?: string[];

  inputSchema?: ZodSchema;

  outputSchema?: ZodSchema;
}
```

Skills should be dynamically resolved.

The entire skill library must not be injected into every model request.

---

# 12. Learner Profiles

Learner adaptation should be implemented as a skill/context capability rather than embedding learner-specific logic into the core Agent Loop.

Examples:

```text
school
college
adult
family
neurotypical
autism
```

A learner profile may affect:

- language
- explanation complexity
- activity design
- pacing
- sensory considerations
- assessment format
- visual presentation

The Companion must distinguish between:

```text
learner context
```

and:

```text
author context
```

The author is using Studio; the learner is the subject of the content being created.

Learner adaptation is implemented as the `learner-adaptation` skill (see §11) rather than as dedicated core-logic. It is introduced in migration Phase 7 (skills), alongside the first dynamic skills.

---

# 13. Context Architecture

The Companion context should be layered.

```text
┌─────────────────────────────┐
│ Global OpenEdu Context      │
├─────────────────────────────┤
│ User / Author Context       │
├─────────────────────────────┤
│ Course Context              │
├─────────────────────────────┤
│ Lesson Context              │
├─────────────────────────────┤
│ Selection Context           │
├─────────────────────────────┤
│ Conversation Context        │
├─────────────────────────────┤
│ Task Context                │
└─────────────────────────────┘
```

The existing `StudioContextSnapshot` remains the primary Studio-state input.

Do not send the entire course to the model on every turn.

Context should be selectively expanded through tools.

---

# 14. Workspace as the Source of Truth

The Companion operates over the OpenEdu workspace.

Conceptually:

```text
Companion
   ↓
Workspace Tools
   ↓
CourseWorkspace
   ↓
Course artifacts
```

The Agent must not manipulate raw storage directly.

It must use workspace abstractions.

Examples:

```text
workspace.course.read
workspace.course.search

workspace.lesson.read
workspace.lesson.create
workspace.lesson.update

workspace.activity.read
workspace.activity.create
workspace.activity.update

workspace.asset.list
workspace.asset.search

workspace.course.validate
```

This keeps the Agent independent from OPFS, IndexedDB, filesystem, Git, or cloud storage implementations.

---

# 15. Tool Architecture

Every tool must declare:

```ts
interface CompanionTool {
  id: string;

  description: string;

  inputSchema: ZodSchema;

  permission: Permission;

  execute(input: unknown, context: ToolContext): Promise<ToolResult>;
}
```

Tools should be:

- deterministic where possible
- schema validated
- observable
- permission controlled
- independently testable
- idempotent where practical

---

# 16. Read vs Write Tools

Tools must be classified.

## Read

```text
course.read
lesson.read
course.search
asset.search
curriculum.lookup
```

Read tools generally require no approval.

## Propose

```text
lesson.generate
lesson.edit
activity.generate
course.generate
translation.generate
```

These produce drafts/change sets.

## Commit

```text
changeSet.apply
```

Commit operations require explicit user approval unless a future product policy explicitly permits otherwise.

## Destructive

Examples:

```text
course.delete
lesson.delete
asset.delete
```

Require explicit approval.

---

# 17. Change Sets

All mutating Companion operations should eventually converge on a common change-set model.

```ts
interface ChangeSet {
  id: string;

  target: WorkspaceTarget[];

  operations: ChangeOperation[];

  diagnostics: Diagnostic[];

  preview?: ChangePreview;

  createdAt: string;
}
```

Example:

```text
User:
"Make this lesson easier."

Agent:
  read lesson
  ↓
  generate modifications
  ↓
  validate
  ↓
  create ChangeSet
  ↓
  show preview
  ↓
  user approves
  ↓
  apply ChangeSet
```

This generalizes the existing draft system.

The existing item-draft write path is the primary convergence target. In the current implementation `applyDraft` / `applyDraftBatch` write generated items directly through `api.writeFile` (non-atomic, partial-failure prone, no diff preview). These paths must be re-expressed as a `ChangeSet` applied atomically via the workspace transaction (§14), with `diffChangeSet` supplying the review preview. There is no separate "item draft" mutation model — every content mutation, whether a single lesson or a full course, is a `ChangeSet`.

---

# 18. Validation

Validation must happen before a proposed change becomes committable.

At minimum:

```text
Schema validation
Content validation
Course structure validation
Reference validation
Widget validation
Accessibility checks
```

Future validators may include:

```text
Curriculum alignment
Reading level
Assessment coverage
Learning objective coverage
Pedagogical checks
```

The Companion must never assume that generated content is valid merely because the model returned structured JSON.

---

# 19. Approval Model

The Companion must clearly distinguish:

```text
Informational response
```

from:

```text
Proposed change
```

and:

```text
Committed change
```

The UI should represent this explicitly.

Example:

```text
Assistant

I suggest simplifying this explanation.

Proposed changes:
  • Replace paragraph 2
  • Add visual example
  • Add 2 practice questions

[Review changes]
```

The user must be able to:

```text
Accept
Reject
Edit
Apply partially
```

where supported.

---

# 20. Conversation Architecture

Conversation history is not equivalent to course state.

Maintain separate concepts:

```text
Conversation
Task
Workspace
Memory
```

A conversation records interaction.

A task records an operation.

The workspace records authoritative content.

Memory records reusable information.

Never treat conversation history as the source of truth for course content.

---

# 21. Memory

Initial memory should remain lightweight.

Useful memory:

```text
conversation history
active course
active lesson
author preferences
recent tasks
```

Do not build unrestricted long-term semantic memory initially.

Future memory may include:

```text
author preferences
frequently used workflows
course-specific conventions
team knowledge
```

Memory must be scoped and permission-aware.

For the initial Companion, "memory" is served by the existing `ConversationStore` (persistent conversation history scoped per course) plus the lightweight items listed above. No dedicated memory subsystem or long-term semantic memory is introduced in the migration phases; a memory phase is only justified once the agent loop and skills are stable.

---

# 22. Modes

The Companion should support explicit modes.

Initial modes:

```text
author
explain
review
design
validate
```

Example:

```text
Author
  → create/edit content

Explain
  → answer questions

Review
  → identify issues

Design
  → improve presentation/activities

Validate
  → check course quality
```

Modes may influence:

- available skills
- available tools
- system instructions
- permissions
- output format

Modes must not create separate agent implementations.

---

# 23. Local / Hosted / Hybrid Execution

The Companion must support three future deployment models.

## Local

```text
Studio
 ↓
LocalAgentRuntime
 ↓
Local model
```

## Hosted

```text
Studio
 ↓
HostedAgentRuntime
 ↓
OpenEdu AI service
 ↓
Model provider
```

## Hybrid

```text
                Companion
                    │
               Agent Router
                /        \
            Local        Cloud
```

The application layer must remain unchanged.

---

# 24. AI SDK Role

Vercel AI SDK remains the **transport/model integration layer**.

It must not become the domain-level Companion abstraction.

Current:

```text
StudioChatProvider
      ↓
useChat
      ↓
ChatTransport
```

Target:

```text
StudioChatProvider
      ↓
CompanionClient
      ↓
Companion protocol
      ↓
AgentRuntime
      ↓
AI SDK
```

The migration should be incremental.

---

# 25. Transport Architecture

The Companion protocol must be transport-independent.

Possible transports:

```text
SSE
HTTP streaming
WebSocket
local IPC
Tauri bridge
```

The Companion event model must remain identical.

Existing:

```text
DefaultChatTransport
createHostedChatTransport
```

may continue to exist as adapters.

---

# 26. Hosted Gateway

The existing gateway responsibilities remain:

```text
origin validation
body limits
rate limiting
request validation
request authentication
```

Future gateway responsibilities may include:

```text
authentication
authorization
usage metering
model routing
tenant isolation
AI quotas
observability
```

The gateway should remain a transport/security boundary, not the location of all Companion business logic.

---

# 27. Security

The Companion must assume that:

- user messages are untrusted
- tool inputs are untrusted
- model outputs are untrusted
- retrieved content may contain malicious instructions
- external content may attempt prompt injection

Never allow model output to directly perform arbitrary filesystem, network, shell, or database operations.

All privileged operations must pass through typed tools and permission policies.

---

# 28. Prompt Injection

Retrieved course content, uploaded documents, web content, and other external sources must be treated as **data**, not instructions.

The Agent must distinguish:

```text
System policy
Developer policy
Tool policy
User instruction
Retrieved content
Course content
```

Retrieved content must not override higher-priority Companion instructions.

---

# 29. Observability

Every Companion run should eventually produce a trace:

```text
run
 ├── context assembly
 ├── intent
 ├── skill resolution
 ├── model call
 ├── tool call
 ├── validation
 ├── draft
 ├── approval
 └── commit
```

Record:

- run ID
- conversation ID
- task ID
- model
- latency
- token usage where available
- tool calls
- errors
- validation results
- final outcome

Do not log sensitive course content unnecessarily.

---

# 30. Cancellation

Long-running Companion operations must support cancellation.

Cancellation must propagate:

```text
UI
 ↓
CompanionClient
 ↓
AgentRuntime
 ↓
model/tool execution
```

The existing client-disconnect abort behavior should be preserved.

---

# 31. Retry Policy

Retries must be explicit.

Safe to retry:

```text
model transient failure
network failure
rate-limit after backoff
```

Do not blindly retry:

```text
workspace mutations
commit operations
destructive operations
```

Mutating operations should use idempotency where practical.

---

# 32. Example Workflows

## 32.1 Explain

```text
User
 ↓
Context
 ↓
Intent = explain
 ↓
Agent
 ↓
LLM
 ↓
Streaming response
```

No workspace mutation.

---

## 32.2 Create lesson

```text
User
 ↓
"Create a lesson about fractions"
 ↓
Context assembly
 ↓
Skill resolution
 ↓
Course/lesson inspection
 ↓
Generate content
 ↓
Schema validation
 ↓
Course validation
 ↓
ChangeSet
 ↓
Draft UI
 ↓
User approval
 ↓
Commit
```

---

## 32.3 Improve existing lesson

```text
User
 ↓
"Make this easier for Level B"
 ↓
Read current lesson
 ↓
Resolve learner/curriculum skills
 ↓
Generate changes
 ↓
Validate
 ↓
ChangeSet
 ↓
Preview
 ↓
Approve
 ↓
Commit
```

---

## 32.4 Multi-step task

```text
User
"Review this lesson and fix the problems."

Agent
 ↓
Read lesson
 ↓
Run review
 ↓
Identify issues
 ↓
Generate fixes
 ↓
Validate fixes
 ↓
Create ChangeSet
 ↓
Request approval
 ↓
Commit
```

The Agent may perform multiple internal steps, but the user sees a coherent task.

---

# 33. Migration From Current Architecture

The existing implementation should be migrated incrementally.

Each phase is an independently shippable unit with its own Definition of Done (DoD). Functionality must remain working at the end of every phase; a phase is not complete until its DoD holds and the affected tests pass.

## Phase 1 — Extract contracts

Create:

```text
@open-edu/companion
```

with:

```text
CompanionRequest
CompanionEvent
AgentRuntime
CompanionTool
CompanionSkill
Permission
ChangeSet
```

Move the existing de-facto contracts into this package: `StudioContextSnapshot` (currently `context.ts`), `DraftItem` and `CourseDraftResult` (currently `types.ts`). Re-export them from the dev-server for backwards compatibility so no caller changes yet.

Do not change the UI yet.

**DoD:** `pnpm typecheck` passes; existing dev-server tests pass; the package contains only types/Zod schemas and no behavior.

---

## Phase 2 — Consolidate tool dispatch + introduce typed tools

The current implementation has three divergent dispatch paths: server-side tool dispatch (`chat/handler.ts`), client-side tool dispatch (`createHostedChatTransport` in `StudioChatProvider.tsx`), and no tool dispatch at all in the hosted gateway (`gateway/chat.ts`, which always issues a plain completion). Collapse these into a single shared intent/tool resolver used by all three.

Add `id`, `description`, `inputSchema`, and `permission` to the existing generation operations (`draftActivity`, `generateCourseDraftTool`), which become typed `CompanionTool`s. Convert:

```text
generate_course
generate_item
edit_item
explain
validate_course
```

Existing behavior must remain unchanged.

**DoD:** the hosted gateway gains tool-behavior parity with the local path; intent parsing and tool routing live in exactly one place; tools are schema-validated and independently testable.

---

## Phase 3 — Introduce CompanionClient

Change:

```text
StudioChatProvider
 ↓
ChatTransport
```

toward:

```text
StudioChatProvider
 ↓
CompanionClient
 ↓
ChatTransport adapter
```

AI SDK remains underneath, confined to the adapter described in §7.

**DoD:** `StudioChatProvider` communicates through `CompanionClient` rather than `useChat`/transport directly; the `CompanionEvent` → `UIMessageChunk` mapping exists only in the adapter.

---

## Phase 4 — Introduce AgentRuntime

Move model execution behind:

```ts
AgentRuntime;
```

Initial implementation may simply wrap existing AI SDK calls.

No new framework is required.

**DoD:** model execution is reached only through `AgentRuntime`; local and hosted paths share the same `AgentRuntime` contract.

---

## Phase 5 — Generalize ChangeSet

Unify:

```text
courseDraft
drafts
changeSet
```

under a consistent proposal/change model.

This phase's primary target is the existing item-draft write path: `applyDraft` / `applyDraftBatch` currently write generated items directly through `api.writeFile` (non-atomic, partial-failure prone, no diff preview). Re-express them as a `ChangeSet` applied atomically via the workspace transaction (§14), with `diffChangeSet` supplying the review preview.

Maintain backwards compatibility during migration.

**DoD:** multi-file drafts commit atomically with a diff preview; the partial-failure ("N of M saved") path is removed; no code path mutates course files except through a committed `ChangeSet`.

---

## Phase 6 — Add controlled agent loop

Introduce multi-step execution.

The initial loop must have:

```text
max steps
timeout
cancellation
permissions
validation
approval
```

**DoD:** a request can execute more than one internal step while presenting a coherent unit to the user; the loop enforces all six constraints and emits observable events.

---

## Phase 7 — Add skills

Introduce dynamic skill resolution.

Skills should initially be configuration/data-driven rather than a complex plugin system. Introduce `learner-adaptation` (see §12) as the first dynamic skill.

**DoD:** skills are resolved per-request (not all injected into every model call); a skill's instructions/tools/permissions take effect when matched.

---

## Phase 8 — Add persistent tasks

Only after the basic agent loop is stable.

Support:

```text
task started
task running
task waiting for approval
task completed
task failed
task cancelled
```

---

# 34. Framework Policy

Do not introduce Mastra, OpenAI Agents SDK, LangGraph, or another agent framework merely to implement the initial Companion.

The project should first establish the OpenEdu-owned contracts.

A third-party framework may later implement:

```text
AgentRuntime
```

if it provides sufficient value.

The rest of OpenEdu must remain independent of that framework.

---

# 35. Testing Strategy

## Unit tests

Test:

- intent parsing
- context assembly
- skill resolution
- permission checks
- tool schemas
- validators
- change-set generation
- event sequencing

## Integration tests

Test:

```text
request
 → context
 → agent
 → tool
 → validation
 → draft
```

## Workspace tests

Verify:

```text
draft
 → approve
 → atomic commit
```

## Runtime tests

The same Companion behavior must work with:

```text
LocalAgentRuntime
HostedAgentRuntime
```

## Golden tests

Maintain representative authoring tasks:

```text
create lesson
edit lesson
simplify content
translate
create quiz
review lesson
generate course
```

Expected structured outputs should be validated.

---

# 36. Product Safety Invariants

These are hard requirements.

### INV-001 — No direct mutation

The model cannot directly write course content.

### INV-002 — Typed tools only

All privileged operations go through registered tools.

### INV-003 — Approval before commit

Generated content must be reviewed/approved before commit.

### INV-004 — Workspace is authoritative

Course content comes from the workspace, not conversation memory.

### INV-005 — Provider independence

The Companion cannot depend on one model provider.

### INV-006 — Runtime independence

The Companion cannot depend on cloud-only execution.

### INV-007 — Context validation

Studio context must be schema validated.

### INV-008 — Output validation

Generated course structures must be validated before becoming drafts.

### INV-009 — Cancellation

Long-running operations must be cancellable.

### INV-010 — Permission enforcement

The model cannot grant itself permissions.

---

# 37. Target Architecture

The intended final architecture is:

```text
                         OPENEDU STUDIO
                              │
                 ┌────────────▼────────────┐
                 │    Companion Client     │
                 │                         │
                 │ Chat                    │
                 │ Context                 │
                 │ Drafts                  │
                 │ Approval                │
                 └────────────┬────────────┘
                              │
                     Companion Protocol
                              │
                 ┌────────────▼────────────┐
                 │    OPENEDU COMPANION    │
                 │                         │
                 │ Context                 │
                 │ Intent                  │
                 │ Skills                  │
                 │ Agent Loop              │
                 │ Tools                   │
                 │ Permissions             │
                 │ Tasks                   │
                 │ Memory                  │
                 │ Validation              │
                 └────────────┬────────────┘
                              │
                       AgentRuntime
                              │
              ┌───────────────┼───────────────┐
              │               │               │
             Local          Hosted          Hybrid
              │               │               │
          Local model      OpenEdu AI       Router
                              │
                       Model Providers
```

---

# 38. Guiding Principle

The OpenEdu Companion should evolve from:

```text
chat interface
+
special-case generation handlers
```

into:

```text
domain-aware controlled agent
+
typed OpenEdu tools
+
workspace
+
skills
+
permissions
+
validation
+
human approval
```

without requiring a rewrite of the existing Studio.

The existing implementation is therefore considered **Phase 0 of the Companion architecture**, not technical debt that must be discarded.

The migration should preserve working functionality at every stage.

---

# 39. Definition of Done

Each migration phase in §33 carries its own incremental DoD. This section describes the end-state DoD.

The Companion architecture is considered mature when:

- Studio can communicate with a provider-independent Companion API
- local and hosted runtimes implement the same contract
- tools are typed and permission-controlled
- skills are dynamically resolved
- multi-step tasks are supported
- all content mutations use ChangeSets
- users can review and approve changes
- course validation occurs before commit
- conversations and tasks are separate from workspace state
- Companion runs are observable
- cancellation works
- model providers can be replaced without changing Studio
- the system can eventually support cloud, local, and hybrid execution
- no core OpenEdu architecture depends on a specific agent framework

---

# 40. Implementation Philosophy

**Build the OpenEdu Companion, not an "AI agent feature."**

Vercel AI SDK is an implementation tool.

An agent framework is an implementation option.

The OpenEdu Companion is the product architecture.

The stable boundary should therefore be:

```text
OpenEdu Studio
       ↓
OpenEdu Companion
       ↓
AgentRuntime
       ↓
Model
```

and not:

```text
OpenEdu Studio
       ↓
Vercel AI SDK
       ↓
specific model
```

This preserves OpenEdu's ability to evolve from a local authoring assistant into a cloud/local/hybrid AI authoring platform without locking the product to a particular vendor or agent framework.
