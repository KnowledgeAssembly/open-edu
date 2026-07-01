---
name: '📖 VIS-06: Wire JSON output into CLI + graph'
title: '[Story] VIS-06: Wire JSON output into CLI + graph'
labels: ['type:story']
---

# Story VIS-06: Wire JSON output into CLI + graph

## Objective

Add `--format` CLI flag to the pipeline and write `.json` output alongside `.md` (or instead of) in the pipeline graph.

## Context

The pipeline currently only writes `course-spec.md`. After VIS-05, we have a JSON renderer. We need to wire it into the pipeline execution and CLI so users can choose between `md`, `json`, or `both` output formats.

The default should be `both` to ensure backward compatibility while enabling the new JSON format.

## Scope

- **Edit**: `packages/pipeline/src/cli/index.ts` (add `--format` flag)
- **Edit**: `packages/pipeline/src/graph/index.ts` (call JSON writer, update options)
- **Exclusions**: No other files

## Acceptance Criteria

- [ ] `--format` CLI flag accepts `md`, `json`, or `both` (default: `both`)
- [ ] `--format json` produces only `.json` file
- [ ] `--format md` produces only `.md` file (existing behavior)
- [ ] `--format both` produces both files
- [ ] Pipeline report tracks both output paths
- [ ] Invalid `--format` value shows error and exits

## Technical Notes

### CLI changes (`packages/pipeline/src/cli/index.ts`):

Add to `CLIOptions`:
```typescript
interface CLIOptions {
  // ... existing
  format: 'md' | 'json' | 'both';
}
```

Default value: `'both'`

Add parsing:
```typescript
case '--format':
  const val = args[++i] || 'both';
  if (!['md', 'json', 'both'].includes(val)) {
    console.error(`Invalid format: ${val}. Use md, json, or both.`);
    process.exit(1);
  }
  options.format = val as 'md' | 'json' | 'both';
  break;
```

Add to help text and `--help` output.

### Graph changes (`packages/pipeline/src/graph/index.ts`):

Add `format` to `PipelineOptions`.

Update step 6 to:

```typescript
if (options.format === 'md' || options.format === 'both') {
  const result = writeCourseSpecOutput(...);
  filePaths.push(result.filePath);
}
if (options.format === 'json' || options.format === 'both') {
  const result = writeCourseSpecJSONOutput(...);
  filePaths.push(result.filePath);
}
```

Update `PipelineReport.filesWritten` to reflect the count of files actually written.

### Pipeline report:

The `filesWritten` field should be the count of successfully written files (1 for md-only, 1 for json-only, 2 for both).

The `outputPaths` field (already `string[]`) should include both paths.

## Deliverables

- [x] Implementation (CLI flag + graph wiring)
- [ ] Documentation updates (not needed — help text updated)

## Validation

```bash
pnpm --filter @open-edu/pipeline build
pnpm --filter @open-edu/pipeline test
```

Manual verification:
```bash
pnpm --filter @open-edu/pipeline curriculum:generate --pdf test.pdf --format both
# verify both .md and .json exist
pnpm --filter @open-edu/pipeline curriculum:generate --pdf test.pdf --format json
# verify only .json exists
```

## References

- Parent Epic: [VIS-EPIC](./VIS-EPIC.md)
- Depends on: [VIS-05](./VIS-05.md)
