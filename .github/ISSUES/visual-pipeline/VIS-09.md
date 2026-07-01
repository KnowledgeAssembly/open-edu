---
name: '📖 VIS-09: Auto-detect .json input in course-compiler CLI'
title: '[Story] VIS-09: Auto-detect .json input in course-compiler CLI'
labels: ['type:story']
---

# Story VIS-09: Auto-detect `.json` input in course-compiler CLI

## Objective

Make the course-compiler CLI detect `.json` vs `.md` input by file extension and dispatch to the appropriate parser.

## Context

Currently the CLI always calls `parseCourseSpec(content)` which expects markdown. With the JSON format (VIS-08), we need to call `parseCourseSpecJSON(content)` when the input file has a `.json` extension.

## Scope

- **Edit**: `packages/course-compiler/src/cli/index.ts`
- **Exclusions**: No other files

## Acceptance Criteria

- [ ] `.md` file → calls existing `parseCourseSpec()` (unchanged)
- [ ] `.json` file → calls new `parseCourseSpecJSON()`
- [ ] No file extension → defaults to markdown (backward compatible)
- [ ] Case-insensitive: `.JSON` and `.json` both work
- [ ] Command description mentions both `.md` and `.json`

## Technical Notes

In `packages/course-compiler/src/cli/index.ts`, update the `compile()` function:

```typescript
import { parseCourseSpec, parseCourseSpecJSON } from '../parser/index.js';

// Inside compile():
const isJson = resolvedPath.toLowerCase().endsWith('.json');

let parsed: { model: CourseModel | null; diagnostics: CompilerDiagnostic[] };
if (isJson) {
  parsed = parseCourseSpecJSON(content);
} else {
  parsed = parseCourseSpec(content);
}

// rest of existing logic unchanged
```

Update the command description:
```typescript
new Command('compile')
  .description('Compile a course-spec.md or course-spec.json into an OpenEdu educational package')
  .argument('<file>', 'Path to course-spec.md or course-spec.json')
```

### Tests

Create `packages/course-compiler/src/cli/__tests__/compile.test.ts`:

1. Mock both parsers, call `compile('spec.md', ...)`, verify `parseCourseSpec` called but NOT `parseCourseSpecJSON`
2. Same setup, `compile('spec.json', ...)`, verify `parseCourseSpecJSON` called but NOT `parseCourseSpec`
3. `.JSON` uppercase, verify JSON parser called
4. No extension → markdown parser called

## Deliverables

- [x] Implementation (extension detection + dispatch)
- [x] Automated tests
- [ ] Documentation updates (help text already updated)

## Validation

```bash
pnpm --filter @open-edu/course-compiler build
pnpm --filter @open-edu/course-compiler test
```

Manual:
```bash
pnpm --filter @open-edu/course-compiler edu compile spec.md  # works as before
pnpm --filter @open-edu/course-compiler edu compile spec.json  # uses JSON parser
```

## References

- Parent Epic: [VIS-EPIC](./VIS-EPIC.md)
- Depends on: [VIS-08](./VIS-08.md)
