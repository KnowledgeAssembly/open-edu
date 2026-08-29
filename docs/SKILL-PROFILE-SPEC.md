# OpenEdu Learner Profile System — Implementation Prompt Spec

## 1. Objective

Implement and refine the OpenEdu course-content authoring learner-profile system.

The current implementation contains four profiles:

- `neurotypical`
- `autism`
- `school`
- `college`

The `neurotypical` profile is the base/default layer. The `autism` profile is substantially implemented. The `school` and `college` profiles contain placeholders/TODOs.

The goal is to:

1. Complete the `school` and `college` profiles.
2. Refine the `autism` profile where necessary.
3. Preserve the existing `set / add / restrict / prefer` delta architecture.
4. Keep `neurotypical` as the implicit base authoring layer.
5. Separate learner characteristics from educational context where practical.
6. Keep v1 simple: **single learner profile selection only**.
7. Preserve compatibility with the existing `course-spec.json` contract and compiler pipeline.
8. Add machine-checkable configuration where appropriate.
9. Add/update validation and quality checks for profile-specific authoring behavior.

Do not redesign the entire course-spec architecture.

---

# 2. Current Architecture

The existing profile system is defined in:

```text
profiles.md
profile-neurotypical.md
profile-autism.md
profile-school.md
profile-college.md
profiles.config.json
scripts/profiles.mjs
```

The current profile architecture defines four profiles and uses delta semantics:

```text
set
add
restrict
prefer
```

The base authoring behavior is provided by the main course-content skill.

Profiles should describe **deltas over the base**, rather than duplicating the complete authoring specification.

The existing implementation records the selected profile in:

```text
course-brief.md
quality-report.json
course-spec.json
```

The compiler propagates profile-related metadata into the compiled package.

Preserve this behavior.

---

# 3. Design Principle

Use the following conceptual separation:

```text
Learner Profile
    ↓
How the learner may best learn

Education Level
    ↓
Academic/developmental expectations

Grade Band
    ↓
Age/grade-specific complexity

Curriculum
    ↓
What needs to be taught
```

Do not force all of these concepts into `learnerProfile`.

---

# 4. Profile Model

## 4.1 Learner Profile

For v1, retain:

```text
neurotypical
autism
```

`neurotypical` remains the default/base profile.

`autism` must never be inferred from age, grade, educational level, or curriculum.

It must only be selected explicitly.

Preserve the existing accessibility rule:

```text
autism is never inferred from age or level
```

---

# 5. Education Level

Introduce an educational-context field if the current course brief/spec supports it without breaking compatibility:

```yaml
educationLevel: school
  college
```

Do not make this a new learner profile.

If introducing this field would require a large schema migration, implement it first in the authoring/brief layer and maintain compatibility with existing `course-spec.json`.

---

# 6. Grade Band

For `school`, support grade-band context rather than creating separate profiles for every grade.

Recommended values:

```text
early_primary
upper_primary
middle_school
secondary
senior_secondary
```

The exact mapping to grades should be documented but should not be hard-coded into the learner profile itself.

Example:

```yaml
learnerProfile: school
gradeBand: middle_school
```

Do not create:

```text
school-grade-1
school-grade-2
school-grade-3
...
```

---

# 7. Curriculum

Curriculum should remain separate from learner profile.

Example:

```yaml
learnerProfile: autism
educationLevel: school
gradeBand: middle_school
curriculum: nios
```

Do not make:

```text
autism-nios
school-nios
```

profiles.

Curriculum-specific requirements belong in curriculum/context configuration rather than the generic learner profile.

---

# 8. Neurotypical Profile

## Status

Keep essentially unchanged.

The profile should remain a thin encoding layer over the base authoring behavior.

Current intent:

```yaml
key: neurotypical
default: true
```

Output:

```yaml
metadata.audience: neurotypical
metadata.accessibility: []
```

Pacing:

```text
15–45 minutes
```

Do not add unnecessary guidance deltas.

The base course-content skill remains authoritative for normal authoring behavior.

---

# 9. Autism Profile

## Status

The existing autism profile is substantially implemented.

Preserve the existing principles:

### Language

- literal language
- short sentences
- no idioms
- no sarcasm
- no ambiguous metaphor

Target sentence length:

```text
5–12 words
```

### Concept granularity

Every activity should contain:

```text
one learning objective
one task
one decision
```

Do not combine multiple new concepts in a single activity.

### Predictability

Maintain a fixed lesson structure across the course.

### Structured Work System

Each activity should make clear:

```text
What am I doing?
How much work is there?
How do I know I am finished?
What happens next?
```

### Shaping

Break complex skills into achievable substeps.

### Errorless learning

Introduce new concepts with a high probability of early success.

### Prompt hierarchy

Use:

```text
demonstration
→ visual hint
→ partial hint
→ verbal cue
→ independent
```

Support should fade gradually.

### Visual-first

Where appropriate, introduce a visual example before the textual explanation.

### Transitions

Every activity should provide an explicit transition to the next activity.

### Feedback

Use calm, specific, literal feedback.

Prefer:

```text
You counted correctly.
You completed the activity.
```

Avoid:

```text
You're a genius!
Amazing!
```

Avoid failure-oriented framing.

### AI tutor

Preserve:

```text
show
→ explain
→ practice
```

### Reinforcement

Prefer:

```text
mastery
independence
progress
completion
```

Avoid:

```text
leaderboards
rankings
competitive rewards
excessive gamification
```

### Calm/break

Lessons should include a calm/reflection opportunity.

Keep calm activities separate from learning, practice, and quiz activities.

---

# 10. Autism Profile — NIOS Decoupling

The generic `autism` profile must not assume NIOS.

If the current description contains:

```text
NIOS Open Basic Education
```

refactor this so that NIOS is represented as curriculum/context.

For example:

```yaml
learnerProfile: autism
educationLevel: school
curriculum: nios
```

The autism profile should describe learner needs.

The curriculum configuration should describe NIOS requirements.

Do not remove existing NIOS functionality if it is already implemented elsewhere.

---

# 11. Autism Output

Preserve:

```yaml
metadata.audience: autism
metadata.accessibility:
  - sensory-friendly
  - predictable-structure
  - literal-language
```

Prefer:

```text
beginner
```

difficulty unless explicitly overridden.

Pacing:

```text
10–30 minutes
```

with shorter activity chunks and explicit breaks.

---

# 12. Autism Activity Progression

Preserve the current five-stage progression:

```text
observe
→ guided_practice
→ independent_practice
→ mastery_check
→ positive_completion
```

Do not replace this with a more complicated state machine.

---

# 13. Autism Assessment

Questions should be:

- literal
- unambiguous
- focused on one learning objective
- one-step where appropriate
- free of trick wording
- free of semantic ambiguity
- retryable without penalty

Do not require distractors merely for the sake of conventional quiz design.

Distractors may be used only where they provide genuine instructional value and do not introduce ambiguity.

---

# 14. School Profile

Complete `profile-school.md`.

The school profile should modify authoring according to:

```text
K–12 learners
age/developmental appropriateness
curriculum alignment
scaffolding
grade-band complexity
```

Do not treat all K–12 learners identically.

---

# 15. School Vocabulary

Define grade-band guidance.

Recommended model:

| Grade Band       | Authoring Characteristics                                                                |
| ---------------- | ---------------------------------------------------------------------------------------- |
| early_primary    | very short sentences, concrete vocabulary, strong visual support                         |
| upper_primary    | simple explanations, gradually increasing technical vocabulary                           |
| middle_school    | moderate sentence complexity, explicit subject terminology                               |
| secondary        | increasingly abstract explanations, subject-specific terminology                         |
| senior_secondary | academically appropriate vocabulary with explicit definitions for new technical concepts |

Avoid rigid word-count rules unless required by an existing validator.

The goal is developmental appropriateness, not mechanical simplification.

---

# 16. School Objectives

School objectives should:

- align with the stated curriculum where curriculum information exists
- be appropriate for the grade band
- use observable outcomes
- connect directly to activities and assessment

Recommended progression:

```text
concept
→ learning objective
→ learning activity
→ practice
→ assessment
```

Avoid forcing every school lesson into higher-order objectives.

Use the cognitive complexity appropriate to the grade and subject.

---

# 17. School Examples

Prefer:

```text
concrete
→ familiar
→ visual
→ abstract
```

especially for younger learners.

Examples should be:

- age appropriate
- culturally/contextually appropriate
- related to the subject
- understandable without unnecessary background knowledge

Do not introduce advanced examples merely to make a course appear sophisticated.

---

# 18. School Pacing

School lessons should generally use shorter learning blocks than college lessons.

Use the existing:

```text
profiles.config.json
```

as the machine-readable source for pacing ranges.

Recommended initial ranges:

```text
early_primary:     10–20 min
upper_primary:     15–25 min
middle_school:     20–35 min
secondary:         25–40 min
senior_secondary:  30–45 min
```

These are authoring defaults, not hard limits.

If the existing configuration uses different values, preserve existing project conventions unless there is a clear reason to change them.

---

# 19. School Activity Instructions

Instructions should be:

- direct
- concrete
- age appropriate
- sequential
- easy to scan

Prefer:

```text
Look at the picture.
Count the apples.
Choose the number.
```

over:

```text
Using the information presented above, determine the numerical quantity represented by the objects.
```

Worked examples should be used when introducing a new procedure.

---

# 20. School Assessment

Do not impose a universal "single-topic question" rule.

Instead:

> Each assessment item should primarily measure one learning objective, with complexity appropriate to the grade band.

Assessment may include:

```text
recall
recognition
application
multi-step reasoning
analysis
```

depending on grade, subject, and objective.

Questions should be readable at the intended grade level.

---

# 21. School Output

Preserve:

```yaml
metadata.audience: school
metadata.accessibility: []
```

The profile should not automatically add autism accessibility tags.

School profile ≠ autism profile.

---

# 22. College Profile

Complete `profile-college.md`.

The college profile should optimize for:

- academic rigor
- independence
- disciplinary terminology
- deeper conceptual treatment
- higher-order reasoning
- explicit prerequisites
- evidence-based explanation
- longer learning blocks

---

# 23. College Register

Use:

- formal language
- precise terminology
- discipline-appropriate vocabulary
- fewer conversational simplifications

Technical terminology may be introduced when relevant.

Do not unnecessarily simplify college-level content.

However, clarity remains more important than artificial academic verbosity.

Avoid writing that sounds academic merely for the sake of sounding academic.

---

# 24. College Objectives

Prefer higher-order objectives when appropriate:

```text
understand
apply
analyze
evaluate
create
```

Do not force every objective into:

```text
analyze
evaluate
create
```

The objective must reflect the actual learning goal.

---

# 25. College Prior Knowledge

College authoring may assume prerequisite knowledge only when:

1. it is explicitly stated in the course brief, or
2. it is established by the course/curriculum sequence.

Do not blindly assume that every college learner has substantial prior knowledge.

When a prerequisite is important, expose it explicitly.

Example:

```yaml
prerequisites:
  - basic algebra
  - functions
```

---

# 26. College Examples

Use:

- realistic disciplinary examples
- case studies where appropriate
- authentic problems
- research examples where relevant
- professional/academic contexts where useful

Move from simple explanation to disciplinary application.

---

# 27. College Evidence

Where appropriate, use:

```text
claim
→ explanation
→ evidence/example
→ implication
```

Cite authoritative sources when the discipline or subject requires evidence.

Do not require citations for every activity.

---

# 28. College Pacing

College lessons may use deeper, longer learning blocks.

Recommended initial range:

```text
30–60 minutes
```

Prefer:

```text
fewer
+
deeper
+
more independent
```

activities rather than many tiny activities.

---

# 29. College Activity Instructions

Instructions should be:

- formal
- self-contained
- precise
- sufficiently detailed to permit independent completion

Avoid excessive hand-holding.

However, do not intentionally remove scaffolding from genuinely difficult tasks.

The goal is increasing learner independence, not reducing support arbitrarily.

---

# 30. College Assessment

College assessments may include:

- multi-step problems
- inference
- application
- analysis
- evaluation
- synthesis
- plausible distractors
- case-based questions
- open-ended responses where supported by the course-spec

Questions should test reasoning rather than merely terminology memorization.

---

# 31. College Output

Preserve:

```yaml
metadata.audience: college
metadata.accessibility: []
```

Do not automatically mark college content as advanced difficulty.

Difficulty should still be determined by the course brief and subject.

---

# 32. Machine-Readable Configuration

Update:

```text
profiles.config.json
```

to contain machine-checkable values.

At minimum support:

```json
{
  "neurotypical": {
    "pacingRangeMinutes": [15, 45]
  },
  "autism": {
    "pacingRangeMinutes": [10, 30],
    "difficultyBias": "beginner"
  },
  "school": {
    "pacingRangeMinutes": [15, 45]
  },
  "college": {
    "pacingRangeMinutes": [30, 60]
  }
}
```

If grade-band pacing is supported by the existing configuration architecture, use:

```json
{
  "school": {
    "gradeBands": {
      "early_primary": {
        "pacingRangeMinutes": [10, 20]
      },
      "upper_primary": {
        "pacingRangeMinutes": [15, 25]
      },
      "middle_school": {
        "pacingRangeMinutes": [20, 35]
      },
      "secondary": {
        "pacingRangeMinutes": [25, 40]
      },
      "senior_secondary": {
        "pacingRangeMinutes": [30, 45]
      }
    }
  }
}
```

Do not make prose guidance dependent on this JSON.

---

# 33. Validation

Update the profile resolution and quality-reporting pipeline.

Existing behavior must remain:

```text
explicit valid key
→ explicit

no profile
→ neurotypical / defaulted

known alias
→ mapped

unknown value
→ neurotypical / mapped
```

Preserve aliases:

```text
autistic → autism
k12 → school
university → college
```

---

# 34. Profile-Specific QC

Preserve existing autism checks:

```text
QC-ACC-05
QC-ACC-06
QC-ACC-07
```

Preserve:

```text
QC-SCH-01
QC-COL-01
```

Extend school validation where practical to check:

```text
grade-band appropriateness
objective appropriateness
instruction complexity
assessment complexity
```

Extend college validation where practical to check:

```text
academic register
objective rigor
prerequisite awareness
assessment depth
```

Do not create brittle validators that attempt to determine educational quality entirely from word counts.

Use machine checks only where deterministic validation is meaningful.

---

# 35. Quality Report

Ensure the selected profile/context remains visible in:

```text
quality-report.json
```

At minimum:

```json
{
  "summary": {
    "learnerProfile": {
      "key": "school",
      "name": "School",
      "source": "explicit"
    }
  }
}
```

If `educationLevel`, `gradeBand`, or `curriculum` are added to the authoring context, expose them in the report without breaking existing consumers.

---

# 36. Profile Composition

Do NOT implement profile composition in this task.

Do not introduce:

```text
autism + school
autism + college
```

as executable profile combinations.

The architecture should remain compatible with future composition, but v1 continues to support one learner profile.

---

# 37. Backward Compatibility

Do not break:

- existing `course-spec.json`
- existing course compiler
- existing profile resolution
- existing aliases
- existing quality reports
- existing generated courses
- existing autism authoring behavior

If schema changes are required, prefer optional fields with sensible defaults.

Existing courses without the new fields must continue to compile.

---

# 38. Files to Modify

Primary files:

```text
profiles.md
profile-neurotypical.md
profile-autism.md
profile-school.md
profile-college.md
profiles.config.json
scripts/profiles.mjs
```

Also inspect and update, if required:

```text
SKILL.md
quality-rubric.md
scripts/summarize-quality.mjs
course-spec schema
course-brief generation
tests/
```

Do not modify unrelated parts of the course authoring system.

---

# 39. Tests

Add or update tests for:

### Profile resolution

```text
undefined → neurotypical
neurotypical → neurotypical
autism → autism
autistic → autism
school → school
k12 → school
college → college
university → college
unknown → neurotypical
```

### Metadata

Verify each profile produces the correct:

```text
metadata.audience
metadata.accessibility
```

### Autism

Verify:

```text
pacing
activity progression
accessibility tags
difficulty preference
```

### School

Verify:

```text
school metadata
grade-band context
pacing
school QC
```

### College

Verify:

```text
college metadata
pacing
college QC
```

### Backward compatibility

Verify courses generated without:

```text
educationLevel
gradeBand
curriculum
```

continue to work.

---

# 40. Documentation

Update `profiles.md` so that it explains:

```text
Learner Profile
Education Level
Grade Band
Curriculum
```

and their responsibilities.

Provide examples such as:

```yaml
learnerProfile: neurotypical
educationLevel: school
gradeBand: middle_school
curriculum: nios
```

and:

```yaml
learnerProfile: autism
educationLevel: school
gradeBand: middle_school
curriculum: nios
```

and:

```yaml
learnerProfile: neurotypical
educationLevel: college
```

Clearly document that:

```text
autism is never inferred from age/grade
```

---

# 41. Implementation Strategy

Implement in this order:

### Phase 1 — Inspect

Inspect:

```text
SKILL.md
profiles.md
all profile files
profiles.config.json
profiles.mjs
quality-rubric.md
quality scripts
course-spec schema
existing tests
```

Do not start modifying files before understanding how profile information currently flows through the pipeline.

### Phase 2 — Refactor Context

Introduce educational context only where it fits naturally.

Avoid unnecessary schema changes.

### Phase 3 — Complete School

Replace all TODO placeholders in:

```text
profile-school.md
```

with concrete authoring rules.

### Phase 4 — Complete College

Replace all TODO placeholders in:

```text
profile-college.md
```

with concrete authoring rules.

### Phase 5 — Refine Autism

Remove generic NIOS assumptions from the learner profile while preserving its existing instructional behavior.

### Phase 6 — Configuration

Update:

```text
profiles.config.json
```

with deterministic settings.

### Phase 7 — Validation

Update quality checks and tests.

### Phase 8 — Documentation

Update `profiles.md`.

### Phase 9 — Regression Test

Generate representative courses using:

```text
neurotypical
autism
school
college
```

and verify the resulting specs and quality reports.

---

# 42. Representative Test Cases

Create small fixtures for:

### Case A

```yaml
learnerProfile: neurotypical
educationLevel: school
gradeBand: early_primary
```

Expected:

- simple concrete examples
- age-appropriate pacing
- no autism constraints

### Case B

```yaml
learnerProfile: autism
educationLevel: school
gradeBand: early_primary
curriculum: nios
```

Expected:

- autism instructional constraints
- predictable progression
- literal language
- visual-first approach
- short chunks
- calm completion
- NIOS handled as curriculum context

### Case C

```yaml
learnerProfile: school
gradeBand: secondary
```

Expected:

- secondary-level academic complexity
- appropriate terminology
- curriculum-aware objectives where available
- more complex assessment than primary

### Case D

```yaml
learnerProfile: college
educationLevel: college
```

Expected:

- academic register
- deeper activities
- greater independence
- higher-order objectives where appropriate
- multi-step assessment

---

# 43. Anti-Patterns

Do not:

1. Duplicate the entire base authoring skill in every profile.
2. Create a profile for every school grade.
3. Infer autism from age or educational context.
4. Make school content universally simplistic.
5. Make college content artificially verbose.
6. Force every college objective to be "analyze/evaluate/create".
7. Force every school question to be single-step.
8. Require citations for every college activity.
9. Encode NIOS assumptions inside generic autism behavior.
10. implement profile composition in v1.
11. create a complicated personalization engine.
12. make validators dependent on fragile word-count heuristics.

---

# 44. Definition of Done

The implementation is complete when:

- [ ] `profile-school.md` contains no TODO placeholders.
- [ ] `profile-college.md` contains no TODO placeholders.
- [ ] `profile-autism.md` no longer incorrectly assumes NIOS as an intrinsic learner-profile property.
- [ ] `neurotypical` remains the base/default profile.
- [ ] Existing autism behavior is preserved.
- [ ] School authoring has grade-band-aware guidance.
- [ ] College authoring has academic/depth guidance.
- [ ] Pacing configuration is machine-readable.
- [ ] Profile resolution remains backward compatible.
- [ ] Profile-specific QC remains functional.
- [ ] Quality reports continue to identify the active learner profile.
- [ ] Existing courses still compile.
- [ ] Tests cover all profile resolution paths.
- [ ] Documentation explains the separation between learner profile and educational context.
- [ ] No profile composition is introduced.

---

# 45. Important Implementation Constraint

**Do not over-engineer this system.**

The objective is not to create a generalized learner-modeling framework.

For the current OpenEdu MVP, the desired architecture is:

```text
                    ┌─────────────────┐
                    │ Course Brief    │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ↓              ↓              ↓
       learnerProfile   educationLevel   curriculum
              │              │              │
              ↓              ↓              ↓
        authoring       complexity       content
          style          context        requirements
              │              │              │
              └──────────────┼──────────────┘
                             ↓
                       course-spec.json
                             ↓
                          Compiler
                             ↓
                       OpenEdu Course
```

Keep the implementation small, explicit, testable, and compatible with the existing OpenEdu course-generation pipeline.
