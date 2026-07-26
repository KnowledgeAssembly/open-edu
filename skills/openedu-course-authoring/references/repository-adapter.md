# Repository Adapter

This reference describes how the skill detects and interfaces with an Open-Edu repository.

## Discovery

The script `scripts/discover-openedu.mjs` walks upward from the working directory looking for:

- `pnpm-workspace.yaml` → repository root
- `packages/course-compiler/` → compiler available
- `packages/cli/` → CLI available
- `packages/widgets/` → widget catalog available
- `packages/pipeline/` → PDF pipeline available
- `packages/core/src/widget-catalog-data.json` → catalog data available

## Output JSON

```json
{
  "mode": "repository" | "portable",
  "repoRoot": "/path/to/root" | null,
  "capabilities": {
    "compiler": true | false,
    "cli": true | false,
    "widgetCatalog": true | false,
    "pipeline": true | false,
    "examples": true | false
  },
  "commands": {
    "compile": "edu compile {spec} --output {dir} --validate" | null,
    "validate": "edu validate {dir}" | null,
    "lintContent": "edu lint-content {dir}" | null,
    "dev": "edu dev {dir}" | null,
    "generateCatalog": "pnpm --filter @open-edu/widgets generate:catalog" | null,
    "pipelineGenerate": "pnpm --filter @open-edu/pipeline curriculum:generate ..." | null
  },
  "paths": {
    "compilerRoot": "/path/to/course-compiler" | null,
    "cliRoot": "/path/to/cli" | null,
    "widgetsRoot": "/path/to/widgets" | null,
    "pipelineRoot": "/path/to/pipeline" | null,
    "catalogData": "/path/to/widget-catalog-data.json" | null,
    "examplesDir": "/path/to/examples" | null
  },
  "unavailable": ["compiler", "pipeline"]
}
```

## Command Execution Rules

When in repository mode:

1. **Compile:** Run `edu compile <course-spec.json> --output <package-dir> --validate`
   - Capture exit code, stdout, stderr
   - Non-zero exit = failure

2. **Validate:** Run `edu validate <package-dir>`
   - Capture exit code, stdout, stderr
   - Non-zero exit = failure

3. **Lint:** Run `edu lint-content <package-dir>`
   - Capture exit code, stdout, stderr
   - Non-zero exit = failure (errors found)

4. **Dev:** Suggest `edu dev <package-dir>`, but do NOT claim visual verification unless actually running the command

## Package Safety Rules

- Create a new output directory by default (do not overwrite)
- If the output directory exists, prompt the user before overwriting
- Keep all generated assets within the output directory
- Verify `package.json` or `bundle.json` manifest exists after compilation
- Verify workflow references resolve before reporting success

## Catalog Discovery

The widget catalog is generated from `packages/widgets/src/widget-catalog-source.ts` into `packages/core/src/widget-catalog-data.json`. If the JSON file exists, parse it. If not, suggest running:

```bash
pnpm --filter @open-edu/widgets generate:catalog
```

If the catalog cannot be loaded, the skill MUST NOT invent widget IDs or configurations.

## Pipeline Integration

When source materials (PDFs, textbooks) are supplied:

1. Check if `@open-edu/pipeline` is available (via discovery)
2. Resolve a profile: `--subject <subject>` or `--profile <id>`
3. Run: `pnpm --filter @open-edu/pipeline curriculum:generate --pdf <file> --subject <subject>`
4. Preserve pipeline output artifacts: source inventory, concept map, blueprint
5. If pipeline unavailable: use supplied material as context only, mark source extraction as manual/unverified

## Profile Resolution

The pipeline supports four built-in profiles:

- `generic` — fallback for any subject
- `math` — triggered by `--subject math` or `--subject mathematics`
- `science` — triggered by `--subject science`
- `nios` — triggered by `--curriculum nios`

When using the pipeline, use the profile that matches the user's subject. The registry auto-resolves via `resolveProfile({ subject: "mathematics" })` → math profile.
