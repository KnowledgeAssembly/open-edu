# OpenEdu Stage 1 Extraction Pipeline — Implementation Prompt Specification

## Context

You are implementing Stage 1 of the OpenEdu Content Pipeline.

The purpose of Stage 1 is to convert arbitrary educational source assets into a canonical intermediate representation that can be processed by downstream OpenEdu stages.

The system must prioritize:

- Local-first execution
- Open-source tooling
- Offline capability
- Cross-platform support
- Contributor friendliness
- Deterministic output
- Markdown as the primary intermediate format

This stage must NOT perform pedagogical transformations, lesson generation, summarization, question generation, or AI rewriting.

Its responsibility is extraction only.

---

# Goal

Build a pluggable extraction framework with LiteParse as the default extractor.

The framework should support future extractors such as:

- Docling
- MinerU
- LlamaParse
- Custom OCR pipelines

without changing downstream code.

---

# Pipeline Architecture

```text
Source Asset
    ↓
Extractor Router
    ↓
Extractor
    ↓
Raw Markdown
    ↓
Normalizer
    ↓
Canonical Markdown
    ↓
Extraction Manifest
```

---

# Supported Input Types

## MVP

### Documents

- PDF
- DOCX
- PPTX
- Markdown

### Images

- PNG
- JPG
- JPEG
- WEBP

### Archives

- ZIP

---

# Output Contract

Every extraction must produce:

```text
/output

content.md

manifest.json

assets/
```

Example:

```text
output/
├── content.md
├── manifest.json
└── assets/
    ├── image-001.png
    ├── image-002.png
    └── image-003.png
```

---

# Canonical Markdown Format

All extractors must normalize into:

```md
# Document Title

## Section

Paragraph text

### Subsection

More content

![Image](assets/image-001.png)

| Column A | Column B |
| -------- | -------- |
| Value    | Value    |
```

Requirements:

- UTF-8 only
- Git friendly
- Human editable
- Stable ordering
- Deterministic output

---

# Manifest Schema

Create:

```json
{
  "id": "",
  "sourceType": "",
  "extractor": "",
  "version": "",
  "pages": 0,
  "images": 0,
  "tables": 0,
  "warnings": [],
  "createdAt": ""
}
```

Purpose:

- Auditing
- Debugging
- Reprocessing
- Provenance tracking

---

# Extractor Interface

Create a common interface.

```ts
interface Extractor {
  canHandle(input: FileInfo): boolean;

  extract(input: ExtractionInput): Promise<ExtractionResult>;
}
```

All extractors must implement this contract.

---

# LiteParse Extractor

Implement:

```text
LiteParseExtractor
```

Responsibilities:

- Parse PDFs
- Parse DOCX
- Parse PPTX
- Extract images
- Produce markdown

Configuration:

```ts
{
  extractImages: true,
  preserveHeadings: true,
  preserveTables: true
}
```

LiteParse should be the default extractor.

---

# OCR Support

For image-based documents:

Use:

```text
PaddleOCR
```

Requirements:

- Automatic detection
- No user intervention
- Multilingual support
- English first
- Future Indian language support

Pipeline:

```text
Image
  ↓
PaddleOCR
  ↓
Markdown
```

---

# Extractor Router

Implement routing logic.

Pseudo:

```ts
if (pdf)
  use LiteParse

if (docx)
  use LiteParse

if (pptx)
  use LiteParse

if (image)
  use OCR

if (zip)
  unpack and recurse
```

Router must be configurable.

Future extractors must be injectable.

---

# ZIP Package Handling

When ZIP files are supplied:

1. Extract archive
2. Scan contents
3. Process recursively
4. Merge results

Supported:

```text
book.zip
 ├ pdf
 ├ images
 └ docs
```

---

# Markdown Normalization

Create normalization layer.

Responsibilities:

### Heading normalization

Convert:

```md
# Heading
```

to

```md
# Heading
```

---

### Whitespace normalization

Remove:

- Duplicate blank lines
- Trailing spaces

---

### Asset normalization

Rename:

```text
image1.png
IMG_1234.png
```

to

```text
image-001.png
image-002.png
```

Deterministically.

---

### Link normalization

Convert relative asset references.

Example:

```md
![Image](temp/a.png)
```

becomes:

```md
![Image](assets/image-001.png)
```

---

# Complexity Detection

Implement lightweight analysis.

Metrics:

- Page count
- Table density
- Image density
- OCR confidence

Output:

```json
{
  "complexity": "low"
}
```

or

```json
{
  "complexity": "high"
}
```

Purpose:

Future routing to Docling or MinerU.

Do not implement fallback yet.

Only emit metadata.

---

# Error Handling

Extraction must never crash the pipeline.

Return structured errors:

```json
{
  "code": "EXTRACTION_FAILED",
  "message": "...",
  "recoverable": true
}
```

Requirements:

- Log warnings
- Continue processing where possible
- Preserve partial output

---

# Observability

Provide structured logs.

Example:

```json
{
  "stage": "extraction",
  "extractor": "liteparse",
  "file": "science.pdf",
  "durationMs": 1200
}
```

Support:

- Console logger
- JSON logger

---

# Testing Requirements

Create tests for:

## Unit

- Router
- Normalizer
- Manifest generation

## Integration

- PDF extraction
- DOCX extraction
- PPTX extraction
- OCR extraction
- ZIP extraction

## Golden Tests

Input document

↓

Expected markdown snapshot

Purpose:

Prevent extraction regressions.

---

# Non-Goals

Do NOT implement:

- Chunking
- Embeddings
- AI summarization
- Learning objective generation
- Quiz generation
- Course authoring
- Knowledge graph generation

Those belong to later OpenEdu pipeline stages.

---

# Success Criteria

The implementation is successful when:

1. A PDF can be converted into canonical markdown.
2. Images are extracted into assets/.
3. A manifest is generated.
4. Output is deterministic.
5. Extractors are pluggable.
6. OCR works for scanned pages.
7. ZIP packages are supported.
8. Future Docling/MinerU integration requires no downstream changes.

Deliver production-ready TypeScript code, tests, architecture documentation, and examples.
