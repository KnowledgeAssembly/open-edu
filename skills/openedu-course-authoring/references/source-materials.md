# Source Materials Integration

When a user supplies source materials (PDFs, textbooks, curriculum documents), the skill can leverage `@open-edu/pipeline` for AI-driven content extraction and course spec generation.

## Detection

Source materials are detected during the input interview. Common signals:

- User provides a `.pdf` file path
- User mentions a textbook or curriculum document
- User uploads or references a document

## Pipeline Integration

### When Pipeline is Available

1. **Resolve Profile:** Use `resolveProfile({ subject, curriculum })` to select the appropriate profile.
   - `--subject math` → math profile
   - `--subject science` → science profile
   - `--subject nios` or `--curriculum nios` → nios profile
   - anything else → generic profile

2. **Run Pipeline:**

   ```bash
   pnpm --filter @open-edu/pipeline curriculum:generate --pdf <file> --subject <subject>
   ```

3. **Additional Pipeline Options:**

   ```bash
   # Full pipeline with specific profile
   pnpm --filter @open-edu/pipeline curriculum:generate --pdf textbook.pdf --profile math

   # Single chapter only
   pnpm --filter @open-edu/pipeline curriculum:generate --pdf textbook.pdf --profile math --scope chapter-index:1

   # JSON-only output
   pnpm --filter @open-edu/pipeline curriculum:generate --pdf textbook.pdf --format json
   ```

4. **Preserve Pipeline Artifacts:**
   - Source inventory (list of chapters/sections found)
   - Concept map (extracted concepts and relationships)
   - Blueprint (lesson and activity plan)
   - Coverage report (which sections were processed)

### When Pipeline is Unavailable

1. Use the supplied material as context for LLM-based generation
2. Read the PDF/source content directly where possible
3. Mark source extraction as **manual/unverified** in the quality report
4. Provide the pipeline command that the user could run later

## Profile Selection Guide

| Subject/Context | Profile   | Key Features                                         |
| --------------- | --------- | ---------------------------------------------------- |
| Mathematics     | `math`    | CPA teaching style, math widgets, 11 asset renderers |
| Science         | `science` | Process/classification concepts, science widgets     |
| NIOS Curriculum | `nios`    | Bilingual (Hindi/English) taxonomy, NIOS structure   |
| Anything else   | `generic` | Scaffolded discovery, core widgets only              |

## Pipeline Output Integration

When the pipeline produces output:

1. **course-spec.md** → convert to `course-spec.json` following the artifact contract
2. **Concept map** → use to validate objective coverage
3. **Blueprint** → save as `lesson-blueprints.json`
4. **Coverage report** → include in `quality-report.json`

## Handling Pipeline Errors

- If the pipeline fails, report the error clearly and fall back to manual generation
- If the pipeline is not built, suggest `pnpm build` in the pipeline package
- If LLM provider is not configured, explain the `.env` setup required
