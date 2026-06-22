---
name: '🧹 Tech Debt & Refactoring'
about: Improve code quality, update dependencies, or clean up technical debt.
title: '[TechDebt] '
labels: ['type:techdebt']
assignees: ''
---

# Tech Debt: [Title]

## Objective

A clear description of the technical debt being addressed and why fixing it improves long-term maintenance, performance, or developer experience.

---

## Context

How was this tech debt identified? (e.g., lint warnings, dependency audit, TypeScript strict-mode violations, performance profiles, or repeated manual workarounds)

---

## Scope & Refactoring Rules

- **Allowed modifications**: Exact directories or packages.
- **Strict Exclusions**: Rules to prevent scope creep. We MUST NOT rewrite unrelated systems.
- **Backward Compatibility**: API contracts and database schemas must be preserved unless explicitly planned.

---

## Acceptance Criteria

- [ ] Refactored code reduces complexity or resolves issue [describe impact]
- [ ] No regression of existing functionality
- [ ] Test coverage maintained or improved

---

## Validation

- Complete execution of test suites
- Build and lint validations

---

## References

- Related issues/PRs: #
- Relevant Architectural Guidelines: [AGENTS.md](../../AGENTS.md)
