---
sidebar_position: 10
---

# Level B Math

**Multi-module bundle example with 3 modules and prerequisite chaining.** Demonstrates the bundle format — a `bundle.json` manifest with 3 modules (addition basics → addition with carrying → adding fractions), each a standard Open-Edu package with its own `package.json`, `workflow.json`, and nodes.

**Bundle pattern:** Prerequisite chain across modules. Each module has a conditional workflow (score >= 80 advances, otherwise remediation loop). Completing `addition_basics` unlocks `addition_carry`, which unlocks `adding_fractions`.

Key files:

- `bundle.json` — bundle manifest defining the module list and dependency graph
- `modules/addition_basics/` — first module (no prerequisites)
- `modules/addition_carry/` — depends on `addition_basics`
- `modules/adding_fractions/` — depends on `addition_carry`
