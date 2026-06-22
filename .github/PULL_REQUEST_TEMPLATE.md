## Summary
A concise description of the objective and what this pull request achieves.

## Related Issue
Closes #[Issue number] (or links to parent Story/Epic)

## Changes
Detail the specific changes made, organized by workspace:
- **`packages/...`**:
  - Description of change 1
- **`apps/...`**:
  - Description of change 2

## Tests & Verification
Detailed verification instructions to prove this PR works.
- **Automated Tests run**: (e.g., `pnpm --filter @open-edu/<package> test`, `pnpm lint`)
- **Manual Verification steps**:

## Risks & Mitigations
- **Compatibility**: Does this introduce breaking changes to API contracts or database schema?
- **Mitigation plan**:

## Review Checklist
- [ ] **Acceptance Criteria Met**: Verified against issue acceptance criteria.
- [ ] **Tests Pass**: test suite passes across all workspaces.
- [ ] **No Architecture Violations**: Confirmed dependency direction and workspace isolation.
- [ ] **Type Safety**: Strict TypeScript; no illegal `any` types added.
- [ ] **Documentation**: Updated README or docs if schemas or public APIs changed.
- [ ] **Clean Code**: No dead code, debug logs, or temporary edits remain.
- [ ] **Branch Strategy**: Conventional commit message (`feat:`, `fix:`, `chore:`, `docs:`), squash merge to `main`.
