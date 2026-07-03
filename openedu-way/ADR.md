# Architectural & Design Decision Records (ADR)

> _"Good decisions are preserved. Great decisions are explained."_

---

# Purpose

Architectural & Design Decision Records (ADRs) capture the reasoning behind significant decisions made within OpenEdu.

They provide historical context, explain trade-offs, and prevent important decisions from being repeatedly revisited without new evidence.

An ADR records **why** a decision was made—not just **what** was decided.

---

# Why ADRs?

Projects evolve.

Contributors change.

Technologies become obsolete.

Without context, future contributors often repeat discussions that have already been resolved.

ADRs preserve institutional knowledge so the project can evolve without losing its original intent.

---

# When to Create an ADR

Create an ADR whenever a decision:

- changes project direction
- affects architecture
- affects the design language
- introduces a long-term constraint
- establishes a guiding principle
- replaces a previous approach
- significantly impacts contributors

Do **not** create ADRs for routine implementation decisions or temporary experiments.

---

# Decision Hierarchy

An ADR never overrides higher-level documentation.

Priority:

1. Volume I — Philosophy
2. Volume II — Design Language
3. ADRs
4. Architecture Documentation
5. Implementation

If an ADR conflicts with Volume I or II, the higher-level document takes precedence.

---

# ADR Lifecycle

Every ADR moves through the following stages.

```
Proposed

↓

Under Discussion

↓

Accepted

↓

Implemented

↓

Superseded (optional)

↓

Archived (optional)
```

Only **Accepted** ADRs should guide future work.

---

# ADR Naming

Use sequential numbering.

Examples:

```
ADR-0001-open-modules.md

ADR-0002-project-pipili.md

ADR-0003-design-language-ownership.md
```

Numbers should never change.

Titles may be refined if necessary.

---

# ADR Template

Every ADR should contain the following sections.

## Title

A concise description of the decision.

---

## Status

Example:

Accepted

---

## Date

Decision date.

---

## Context

Describe the problem.

Why was this decision necessary?

What alternatives existed?

---

## Decision

Describe the chosen solution.

State the decision clearly and unambiguously.

---

## Rationale

Explain why this solution was chosen.

Include philosophical, design, architectural, and practical reasoning.

---

## Alternatives Considered

List the primary alternatives.

Explain why they were rejected.

Avoid criticizing alternatives.

---

## Consequences

Document both benefits and trade-offs.

No decision is free.

---

## Related Documents

Reference:

- Volume I
- Volume II
- Other ADRs
- Architecture Documents

---

# Writing Guidelines

Good ADRs are:

- concise
- objective
- timeless
- implementation-independent
- easy to understand years later

Avoid implementation details unless they are essential to the decision.

---

# Review Process

Major ADRs should be reviewed before acceptance.

Questions to ask:

- Does this align with Volume I?
- Does this align with Volume II?
- Does this improve the project?
- Is the reasoning clear?
- Will future contributors understand this decision?

---

# Superseding Decisions

Sometimes decisions change.

Never delete an accepted ADR.

Instead:

1. Create a new ADR.
2. Reference the previous ADR.
3. Explain why the decision changed.

Project history is valuable.

---

# Suggested Initial ADRs

The following decisions are important enough to capture immediately.

### ADR-0001

OpenEdu uses modular learning as its core educational model.

---

### ADR-0002

Project Pipili exists as a companion, not a tutor.

---

### ADR-0003

OpenEdu owns its design language.

External design systems are implementation references.

---

### ADR-0004

Design Tokens belong to OpenEdu rather than any UI framework.

---

### ADR-0005

Design language precedes product interface design.

---

### ADR-0006

Accessibility is treated as a core design principle rather than a compliance requirement.

---

### ADR-0007

AI acts as a collaborative contributor while humans remain responsible for final design decisions.

---

# Success Criteria

An ADR is successful when a contributor can understand:

- the problem,
- the reasoning,
- the alternatives,
- and the long-term implications,

without needing to ask the original authors.

Good software preserves code.

Great projects preserve decisions.
