# Stage 1 Extraction Framework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a pluggable extraction framework as Stage 0 of the pipeline that converts any source asset (PDF, DOCX, PPTX, Markdown, Images, ZIP) into canonical Markdown + manifest, with LiteParse (`@llamaindex/liteparse`) as the default extractor.

**Architecture:** A new `extraction/` module within `packages/pipeline/src/` provides an `Extractor` interface, an `ExtractorRouter` that dispatches by file type, a `MarkdownNormalizer` for canonical output, and a `LiteParseExtractor` that wraps the `@llamaindex/liteparse` CLI. LiteParse handles all document formats natively (PDF, DOCX, PPTX, images) with built-in OCR (Tesseract + optional PaddleOCR HTTP server) and built-in complexity detection (`lit is-complex`). A backward-compatible adapter converts the new extraction output into `PageContent[]` so existing Stages 2–8 continue working unchanged.

**Tech Stack:** TypeScript, Zod, `@llamaindex/liteparse` (Rust CLI + Node.js bindings via napi-rs), Vitest

---

## File Structure

```
packages/pipeline/src/
├── extraction/                          # NEW — pluggable extraction framework
│   ├── types.ts                         # Zod schemas: ExtractionInput, ExtractionResult, ExtractionManifest, etc.
│   ├── interface.ts                     # Extractor interface definition
│   ├── router.ts                        # ExtractorRouter — dispatches by file extension
│   ├── normalizer.ts                    # MarkdownNormalizer — heading, whitespace, asset, link normalization
│   ├── liteparse-extractor.ts           # LiteParseExtractor — wraps @llamaindex/liteparse CLI
│   ├── zip-handler.ts                   # ZIP unpacking + recursive extraction
│   ├── adapter.ts                       # Backward-compatible adapter: ExtractionResult → PageContent[]
│   ├── logger.ts                        # Structured extraction logger (console + JSON)
│   ├── index.ts                         # Public API: runExtraction(), registerExtractor()
│   └── __tests__/
│       ├── types.test.ts
│       ├── router.test.ts
│       ├── normalizer.test.ts
│       ├── liteparse-extractor.test.ts
│       ├── zip-handler.test.ts
│       ├── adapter.test.ts
│       └── integration.test.ts
```

---

## Task 1: Extraction Schemas and Types

**Files:**

- Create: `packages/pipeline/src/extraction/types.ts`
- Test: `packages/pipeline/src/extraction/__tests__/types.test.ts`

- [ ] **Step 1: Write the failing tests for extraction schemas**

Create `packages/pipeline/src/extraction/__tests__/types.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  ExtractionInputSchema,
  ExtractionResultSchema,
  ExtractionManifestSchema,
  ExtractionErrorSchema,
  ComplexityMetadataSchema,
  AssetInfoSchema,
} from '../types.js';

describe('ExtractionInputSchema', () => {
  it('validates a valid PDF input', () => {
    const input = { filePath: '/tmp/test.pdf', mimeType: 'application/pdf' };
    expect(() => ExtractionInputSchema.parse(input)).not.toThrow();
  });

  it('validates input without mimeType (auto-detect)', () => {
    const input = { filePath: '/tmp/test.docx' };
    expect(() => ExtractionInputSchema.parse(input)).not.toThrow();
  });

  it('rejects empty filePath', () => {
    expect(() => ExtractionInputSchema.parse({ filePath: '' })).toThrow();
  });

  it('accepts optional extractor override', () => {
    const input = { filePath: '/tmp/test.pdf', extractorId: 'custom-pdf' };
    expect(() => ExtractionInputSchema.parse(input)).not.toThrow();
  });

  it('accepts optional options', () => {
    const input = { filePath: '/tmp/test.pdf', options: { extractImages: false } };
    expect(() => ExtractionInputSchema.parse(input)).not.toThrow();
  });
});

describe('ExtractionResultSchema', () => {
  it('validates a complete result', () => {
    const result = {
      contentMd: '# Title\n\nBody text',
      manifest: {
        id: 'test-123',
        sourceType: 'pdf',
        extractor: 'liteparse',
        version: '1.0.0',
        pages: 10,
        images: 2,
        tables: 1,
        warnings: [],
        createdAt: '2026-01-01T00:00:00.000Z',
        complexity: 'low',
      },
      assets: [
        {
          filename: 'image-001.png',
          originalName: 'img.png',
          mediaType: 'image/png',
          sizeBytes: 1024,
        },
      ],
    };
    expect(() => ExtractionResultSchema.parse(result)).not.toThrow();
  });

  it('rejects empty contentMd', () => {
    const result = {
      contentMd: '',
      manifest: {
        id: 'x',
        sourceType: 'pdf',
        extractor: 'liteparse',
        version: '1.0.0',
        pages: 1,
        images: 0,
        tables: 0,
        warnings: [],
        createdAt: '2026-01-01T00:00:00.000Z',
        complexity: 'low',
      },
      assets: [],
    };
    expect(() => ExtractionResultSchema.parse(result)).toThrow();
  });

  it('validates result with no assets', () => {
    const result = {
      contentMd: '# Just text',
      manifest: {
        id: 'x',
        sourceType: 'markdown',
        extractor: 'liteparse',
        version: '1.0.0',
        pages: 1,
        images: 0,
        tables: 0,
        warnings: [],
        createdAt: '2026-01-01T00:00:00.000Z',
        complexity: 'low',
      },
      assets: [],
    };
    expect(() => ExtractionResultSchema.parse(result)).not.toThrow();
  });
});

describe('ExtractionManifestSchema', () => {
  it('validates a complete manifest', () => {
    const manifest = {
      id: 'abc-123',
      sourceType: 'pdf',
      extractor: 'liteparse',
      version: '1.0.0',
      pages: 42,
      images: 5,
      tables: 2,
      warnings: ['Low OCR confidence on page 3'],
      createdAt: '2026-07-27T00:00:00.000Z',
      complexity: 'medium',
    };
    expect(() => ExtractionManifestSchema.parse(manifest)).not.toThrow();
  });

  it('rejects invalid complexity', () => {
    const manifest = {
      id: 'x',
      sourceType: 'pdf',
      extractor: 'liteparse',
      version: '1.0.0',
      pages: 1,
      images: 0,
      tables: 0,
      warnings: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      complexity: 'very-high',
    };
    expect(() => ExtractionManifestSchema.parse(manifest)).toThrow();
  });
});

describe('ExtractionErrorSchema', () => {
  it('validates a recoverable error', () => {
    const error = { code: 'EXTRACTION_FAILED', message: 'Parse error', recoverable: true };
    expect(() => ExtractionErrorSchema.parse(error)).not.toThrow();
  });

  it('validates a non-recoverable error', () => {
    const error = { code: 'UNSUPPORTED_FORMAT', message: 'Cannot handle .xyz', recoverable: false };
    expect(() => ExtractionErrorSchema.parse(error)).not.toThrow();
  });
});

describe('AssetInfoSchema', () => {
  it('validates asset info', () => {
    const asset = {
      filename: 'image-001.png',
      originalName: 'screenshot.png',
      mediaType: 'image/png',
      sizeBytes: 2048,
    };
    expect(() => AssetInfoSchema.parse(asset)).not.toThrow();
  });

  it('rejects zero sizeBytes', () => {
    const asset = {
      filename: 'img.png',
      originalName: 'img.png',
      mediaType: 'image/png',
      sizeBytes: 0,
    };
    expect(() => AssetInfoSchema.parse(asset)).toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @open-edu/pipeline test -- extraction/types`
Expected: FAIL — module not found

- [ ] **Step 3: Write the schema implementations**

Create `packages/pipeline/src/extraction/types.ts`:

```typescript
import { z } from 'zod';

export const EXTRACTION_SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/markdown',
  'text/plain',
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/zip',
] as const;

export type ExtractionMimeType = (typeof EXTRACTION_SUPPORTED_MIME_TYPES)[number];

export const ExtractionInputSchema = z.object({
  filePath: z.string().min(1, 'filePath is required'),
  mimeType: z.enum(EXTRACTION_SUPPORTED_MIME_TYPES).optional(),
  extractorId: z.string().optional(),
  options: z
    .object({
      extractImages: z.boolean().default(true),
      preserveHeadings: z.boolean().default(true),
      preserveTables: z.boolean().default(true),
      ocrLanguage: z.string().default('en'),
    })
    .optional(),
});

export type ExtractionInput = z.infer<typeof ExtractionInputSchema>;

export const AssetInfoSchema = z.object({
  filename: z.string().min(1),
  originalName: z.string().min(1),
  mediaType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
});

export type AssetInfo = z.infer<typeof AssetInfoSchema>;

export const ComplexityMetadataSchema = z.enum(['low', 'medium', 'high']);

export type ComplexityLevel = z.infer<typeof ComplexityMetadataSchema>;

export const ExtractionManifestSchema = z.object({
  id: z.string().min(1),
  sourceType: z.string().min(1),
  extractor: z.string().min(1),
  version: z.string().min(1),
  pages: z.number().int().nonnegative(),
  images: z.number().int().nonnegative(),
  tables: z.number().int().nonnegative(),
  warnings: z.array(z.string()),
  createdAt: z.string().datetime(),
  complexity: ComplexityMetadataSchema,
});

export type ExtractionManifest = z.infer<typeof ExtractionManifestSchema>;

export const ExtractionResultSchema = z.object({
  contentMd: z.string().min(1, 'contentMd must not be empty'),
  manifest: ExtractionManifestSchema,
  assets: z.array(AssetInfoSchema),
});

export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;

export const ExtractionErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  recoverable: z.boolean(),
});

export type ExtractionError = z.infer<typeof ExtractionErrorSchema>;

export const EXTRACTION_ERROR_CODES = [
  'UNSUPPORTED_FORMAT',
  'FILE_NOT_FOUND',
  'EXTRACTION_FAILED',
  'OCR_FAILED',
  'ZIP_EXTRACTION_FAILED',
  'NORMALIZATION_FAILED',
] as const;

export type ExtractionErrorCode = (typeof EXTRACTION_ERROR_CODES)[number];
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @open-edu/pipeline test -- extraction/types`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/pipeline/src/extraction/types.ts packages/pipeline/src/extraction/__tests__/types.test.ts
git commit -m "feat(pipeline): add extraction framework Zod schemas"
```

---

## Task 2: Extractor Interface

**Files:**

- Create: `packages/pipeline/src/extraction/interface.ts`

- [ ] **Step 1: Create the Extractor interface**

Create `packages/pipeline/src/extraction/interface.ts`:

```typescript
import type { ExtractionInput, ExtractionResult } from './types.js';

export interface Extractor {
  readonly id: string;

  readonly supportedExtensions: string[];

  canHandle(input: ExtractionInput): boolean;

  extract(input: ExtractionInput): Promise<ExtractionResult>;
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/pipeline/src/extraction/interface.ts
git commit -m "feat(pipeline): add Extractor interface"
```

---

## Task 3: Extractor Router

**Files:**

- Create: `packages/pipeline/src/extraction/router.ts`
- Test: `packages/pipeline/src/extraction/__tests__/router.test.ts`

- [ ] **Step 1: Write failing tests for the router**

Create `packages/pipeline/src/extraction/__tests__/router.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { ExtractorRouter } from '../router.js';
import type { Extractor } from '../interface.js';
import type { ExtractionInput } from '../types.js';

function makeFakeExtractor(id: string, extensions: string[]): Extractor {
  return {
    id,
    supportedExtensions: extensions,
    canHandle: (input) => extensions.some((ext) => input.filePath.endsWith(ext)),
    extract: async () => ({
      contentMd: `# ${id} output`,
      manifest: {
        id: 'test',
        sourceType: 'test',
        extractor: id,
        version: '1.0.0',
        pages: 1,
        images: 0,
        tables: 0,
        warnings: [],
        createdAt: new Date().toISOString(),
        complexity: 'low' as const,
      },
      assets: [],
    }),
  };
}

describe('ExtractorRouter', () => {
  let router: ExtractorRouter;

  beforeEach(() => {
    router = new ExtractorRouter();
  });

  it('registers and retrieves extractors by extension', () => {
    const pdfExtractor = makeFakeExtractor('pdf-ext', ['.pdf']);
    router.register(pdfExtractor);

    const input: ExtractionInput = { filePath: '/tmp/test.pdf' };
    const extractor = router.resolve(input);
    expect(extractor.id).toBe('pdf-ext');
  });

  it('returns null for unregistered extensions', () => {
    const input: ExtractionInput = { filePath: '/tmp/test.xyz' };
    const extractor = router.resolve(input);
    expect(extractor).toBeNull();
  });

  it('prefers extractorId override when set', () => {
    const defaultExt = makeFakeExtractor('default', ['.pdf']);
    const customExt = makeFakeExtractor('custom', ['.pdf']);
    router.register(defaultExt);
    router.register(customExt);

    const input: ExtractionInput = { filePath: '/tmp/test.pdf', extractorId: 'custom' };
    const extractor = router.resolve(input);
    expect(extractor!.id).toBe('custom');
  });

  it('lists registered extractor IDs', () => {
    router.register(makeFakeExtractor('a', ['.pdf']));
    router.register(makeFakeExtractor('b', ['.docx']));
    expect(router.listExtractors()).toEqual(['a', 'b']);
  });

  it('clears all extractors', () => {
    router.register(makeFakeExtractor('a', ['.pdf']));
    router.clear();
    expect(router.listExtractors()).toEqual([]);
  });

  it('routes .docx to correct extractor', () => {
    router.register(makeFakeExtractor('docx-ext', ['.docx']));
    const input: ExtractionInput = { filePath: '/tmp/report.docx' };
    expect(router.resolve(input)!.id).toBe('docx-ext');
  });

  it('routes .pptx to correct extractor', () => {
    router.register(makeFakeExtractor('pptx-ext', ['.pptx']));
    const input: ExtractionInput = { filePath: '/tmp/slides.pptx' };
    expect(router.resolve(input)!.id).toBe('pptx-ext');
  });

  it('routes image extensions to OCR extractor', () => {
    router.register(makeFakeExtractor('ocr', ['.png', '.jpg', '.jpeg', '.webp']));
    expect(router.resolve({ filePath: '/tmp/img.png' })!.id).toBe('ocr');
    expect(router.resolve({ filePath: '/tmp/img.jpg' })!.id).toBe('ocr');
  });

  it('routes .zip recursively (handled at orchestration layer)', () => {
    router.register(makeFakeExtractor('zip', ['.zip']));
    const input: ExtractionInput = { filePath: '/tmp/archive.zip' };
    expect(router.resolve(input)!.id).toBe('zip');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @open-edu/pipeline test -- extraction/router`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the router**

Create `packages/pipeline/src/extraction/router.ts`:

```typescript
import type { Extractor } from './interface.js';
import type { ExtractionInput } from './types.js';

export class ExtractorRouter {
  private extractors = new Map<string, Extractor>();

  register(extractor: Extractor): void {
    this.extractors.set(extractor.id, extractor);
  }

  resolve(input: ExtractionInput): Extractor | null {
    if (input.extractorId) {
      return this.extractors.get(input.extractorId) ?? null;
    }

    for (const extractor of this.extractors.values()) {
      if (extractor.canHandle(input)) {
        return extractor;
      }
    }

    return null;
  }

  listExtractors(): string[] {
    return Array.from(this.extractors.keys());
  }

  clear(): void {
    this.extractors.clear();
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @open-edu/pipeline test -- extraction/router`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/pipeline/src/extraction/router.ts packages/pipeline/src/extraction/__tests__/router.test.ts
git commit -m "feat(pipeline): add ExtractorRouter with extension-based dispatch"
```

---

## Task 4: Markdown Normalizer

**Files:**

- Create: `packages/pipeline/src/extraction/normalizer.ts`
- Test: `packages/pipeline/src/extraction/__tests__/normalizer.test.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/pipeline/src/extraction/__tests__/normalizer.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { MarkdownNormalizer } from '../normalizer.js';

describe('MarkdownNormalizer', () => {
  const normalizer = new MarkdownNormalizer();

  describe('heading normalization', () => {
    it('converts setext headings to ATX', () => {
      const input = 'Heading\n=======\n\nBody';
      const result = normalizer.normalize(input);
      expect(result).toContain('# Heading');
      expect(result).not.toContain('=======');
    });

    it('converts setext h2', () => {
      const input = 'Subheading\n-----------\n\nBody';
      const result = normalizer.normalize(input);
      expect(result).toContain('## Subheading');
    });

    it('preserves existing ATX headings', () => {
      const input = '# Already ATX\n\n## Also ATX';
      const result = normalizer.normalize(input);
      expect(result).toContain('# Already ATX');
      expect(result).toContain('## Also ATX');
    });
  });

  describe('whitespace normalization', () => {
    it('removes duplicate blank lines', () => {
      const input = 'Para 1\n\n\n\n\nPara 2';
      const result = normalizer.normalize(input);
      expect(result).not.toMatch(/\n{3,}/);
    });

    it('removes trailing spaces from lines', () => {
      const input = 'Line one   \nLine two  ';
      const result = normalizer.normalize(input);
      expect(result).not.toMatch(/ +\n/);
    });

    it('trims leading/trailing whitespace from document', () => {
      const input = '\n\n# Title\n\nBody\n\n';
      const result = normalizer.normalize(input);
      expect(result.startsWith('# Title')).toBe(true);
    });
  });

  describe('asset normalization', () => {
    it('renames image references deterministically', () => {
      const input = '![Chart](IMG_1234.png)\n\n![Diagram](temp/image1.png)';
      const result = normalizer.normalize(input);
      expect(result).toMatch(/!\[Chart\]\(assets\/image-001\.png\)/);
      expect(result).toMatch(/!\[Diagram\]\(assets\/image-002\.png\)/);
    });

    it('preserves image alt text', () => {
      const input = '![My Chart](random_name.png)';
      const result = normalizer.normalize(input);
      expect(result).toContain('![My Chart]');
    });

    it('handles mixed asset references', () => {
      const input = '![](a.png)\n\n![](b.jpg)\n\n![](c.png)';
      const result = normalizer.normalize(input);
      expect(result).toContain('image-001.png');
      expect(result).toContain('image-002.jpg');
      expect(result).toContain('image-003.png');
    });
  });

  describe('link normalization', () => {
    it('converts relative asset paths to assets/ prefix', () => {
      const input = '![Image](temp/a.png)';
      const result = normalizer.normalize(input);
      expect(result).toContain('(assets/');
    });
  });

  describe('UTF-8 output', () => {
    it('preserves unicode characters', () => {
      const input = '# हिंदी शीर्षक\n\nयह एक परीक्षण है।';
      const result = normalizer.normalize(input);
      expect(result).toContain('हिंदी शीर्षक');
    });
  });

  describe('full normalization pipeline', () => {
    it('produces clean, deterministic output', () => {
      const messy = `
Title
=======


Para one   

![](ugly_NAME.png)



## Section
More content here   `;

      const result = normalizer.normalize(messy);
      expect(result).toMatch(/^# Title/m);
      expect(result).not.toMatch(/={5,}/);
      expect(result).not.toMatch(/\n{3,}/);
      expect(result).not.toMatch(/ +\n/);
      expect(result).toContain('assets/');
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @open-edu/pipeline test -- extraction/normalizer`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the normalizer**

Create `packages/pipeline/src/extraction/normalizer.ts`:

```typescript
const SETEXT_H1 = /^(.+)\n={3,}\s*$/gm;
const SETEXT_H2 = /^(.+)\n-{3,}\s*$/gm;
const DUPLICATE_BLANKS = /\n{3,}/g;
const TRAILING_SPACES = / +$/gm;
const IMAGE_REF = /!\[([^\]]*)\]\((?!assets\/)([^)]+)\)/g;

export class MarkdownNormalizer {
  normalize(raw: string): string {
    let md = raw;

    md = this.normalizeHeadings(md);
    md = this.normalizeWhitespace(md);
    md = this.normalizeAssets(md);

    return md.trim();
  }

  private normalizeHeadings(md: string): string {
    md = md.replace(SETEXT_H1, '# $1');
    md = md.replace(SETEXT_H2, '## $1');
    return md;
  }

  private normalizeWhitespace(md: string): string {
    md = md.replace(DUPLICATE_BLANKS, '\n\n');
    md = md.replace(TRAILING_SPACES, '');
    return md;
  }

  private normalizeAssets(md: string): string {
    const seen = new Map<string, string>();
    let counter = 0;

    return md.replace(IMAGE_REF, (_match, alt: string, originalPath: string) => {
      if (!seen.has(originalPath)) {
        counter++;
        const ext = originalPath.split('.').pop() || 'png';
        const newName = `image-${String(counter).padStart(3, '0')}.${ext}`;
        seen.set(originalPath, newName);
      }
      return `![${alt}](assets/${seen.get(originalPath)})`;
    });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @open-edu/pipeline test -- extraction/normalizer`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/pipeline/src/extraction/normalizer.ts packages/pipeline/src/extraction/__tests__/normalizer.test.ts
git commit -m "feat(pipeline): add MarkdownNormalizer for canonical output"
```

---

## Task 5: Structured Logger

**Files:**

- Create: `packages/pipeline/src/extraction/logger.ts`

- [ ] **Step 1: Implement the logger**

Create `packages/pipeline/src/extraction/logger.ts`:

```typescript
export interface ExtractionLogEntry {
  stage: 'extraction';
  extractor: string;
  file: string;
  durationMs: number;
  level: 'info' | 'warn' | 'error';
  message: string;
}

export type ExtractionLoggerOutput = 'console' | 'json';

export class ExtractionLogger {
  private entries: ExtractionLogEntry[] = [];
  private output: ExtractionLoggerOutput;
  private verbose: boolean;

  constructor(output: ExtractionLoggerOutput = 'console', verbose = false) {
    this.output = output;
    this.verbose = verbose;
  }

  info(extractor: string, file: string, durationMs: number, message: string): void {
    this.log('info', extractor, file, durationMs, message);
  }

  warn(extractor: string, file: string, durationMs: number, message: string): void {
    this.log('warn', extractor, file, durationMs, message);
  }

  error(extractor: string, file: string, durationMs: number, message: string): void {
    this.log('error', extractor, file, durationMs, message);
  }

  getEntries(): ExtractionLogEntry[] {
    return [...this.entries];
  }

  private log(
    level: ExtractionLogEntry['level'],
    extractor: string,
    file: string,
    durationMs: number,
    message: string,
  ): void {
    const entry: ExtractionLogEntry = {
      stage: 'extraction',
      extractor,
      file,
      durationMs,
      level,
      message,
    };
    this.entries.push(entry);

    if (this.output === 'json' || this.verbose) {
      const prefix = level === 'error' ? '[ERROR]' : level === 'warn' ? '[WARN]' : '[INFO]';
      console.log(`${prefix} [extraction:${extractor}] ${file} (${durationMs}ms) — ${message}`);
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/pipeline/src/extraction/logger.ts
git commit -m "feat(pipeline): add structured extraction logger"
```

---

## Task 6: LiteParse Extractor

**Files:**

- Create: `packages/pipeline/src/extraction/liteparse-extractor.ts`
- Test: `packages/pipeline/src/extraction/__tests__/liteparse-extractor.test.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/pipeline/src/extraction/__tests__/liteparse-extractor.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LiteParseExtractor } from '../liteparse-extractor.js';

vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

describe('LiteParseExtractor', () => {
  let extractor: LiteParseExtractor;

  beforeEach(() => {
    vi.clearAllMocks();
    extractor = new LiteParseExtractor();
  });

  it('has correct id and supported extensions', () => {
    expect(extractor.id).toBe('liteparse');
    expect(extractor.supportedExtensions).toContain('.pdf');
    expect(extractor.supportedExtensions).toContain('.docx');
    expect(extractor.supportedExtensions).toContain('.pptx');
    expect(extractor.supportedExtensions).toContain('.png');
    expect(extractor.supportedExtensions).toContain('.jpg');
    expect(extractor.supportedExtensions).toContain('.md');
    expect(extractor.supportedExtensions).toContain('.xlsx');
  });

  it('canHandle returns true for PDF', () => {
    expect(extractor.canHandle({ filePath: '/tmp/test.pdf' })).toBe(true);
  });

  it('canHandle returns true for DOCX', () => {
    expect(extractor.canHandle({ filePath: '/tmp/test.docx' })).toBe(true);
  });

  it('canHandle returns true for images (native LiteParse support)', () => {
    expect(extractor.canHandle({ filePath: '/tmp/test.png' })).toBe(true);
    expect(extractor.canHandle({ filePath: '/tmp/test.jpg' })).toBe(true);
    expect(extractor.canHandle({ filePath: '/tmp/test.webp' })).toBe(true);
  });

  it('canHandle returns true for XLSX', () => {
    expect(extractor.canHandle({ filePath: '/tmp/data.xlsx' })).toBe(true);
  });

  it('canHandle returns false for ZIP (handled by ZipHandler)', () => {
    expect(extractor.canHandle({ filePath: '/tmp/archive.zip' })).toBe(false);
  });

  it('extracts PDF via lit parse and produces valid result', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync)
      .mockReturnValueOnce(
        Buffer.from(
          '# Chapter 1\n\nSome text content\n\n![Diagram](img_p1_1.png)\n\n| A | B |\n|---|---|\n| 1 | 2 |',
        ),
      )
      .mockReturnValueOnce(
        Buffer.from(JSON.stringify([{ page_number: 1, needs_ocr: false, reasons: [] }])),
      );

    const result = await extractor.extract({ filePath: '/tmp/test.pdf' });
    expect(result.contentMd).toBeTruthy();
    expect(result.manifest.extractor).toBe('liteparse');
    expect(result.manifest.sourceType).toBe('pdf');
    expect(result.manifest.complexity).toMatch(/^(low|medium|high)$/);
  });

  it('extracts DOCX via lit parse (converts through LibreOffice)', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync)
      .mockReturnValueOnce(Buffer.from('# DOCX Title\n\nDOCX content here'))
      .mockReturnValueOnce(
        Buffer.from(JSON.stringify([{ page_number: 1, needs_ocr: false, reasons: [] }])),
      );

    const result = await extractor.extract({ filePath: '/tmp/test.docx' });
    expect(result.contentMd).toContain('DOCX Title');
    expect(result.manifest.sourceType).toBe('docx');
  });

  it('extracts images via lit parse (native OCR)', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync)
      .mockReturnValueOnce(Buffer.from('Scanned text from image via Tesseract'))
      .mockReturnValueOnce(
        Buffer.from(JSON.stringify([{ page_number: 1, needs_ocr: true, reasons: ['scanned'] }])),
      );

    const result = await extractor.extract({ filePath: '/tmp/scan.png' });
    expect(result.contentMd).toContain('Scanned text');
    expect(result.manifest.sourceType).toBe('image');
  });

  it('extracts markdown files directly (no lit parse needed)', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const tmpFile = path.join('/tmp', `test-${Date.now()}.md`);
    fs.writeFileSync(tmpFile, '# Hello\n\nWorld');

    const result = await extractor.extract({ filePath: tmpFile });
    expect(result.contentMd).toContain('# Hello');
    expect(result.manifest.sourceType).toBe('markdown');
    expect(result.manifest.pages).toBe(1);

    fs.unlinkSync(tmpFile);
  });

  it('uses complexity data from lit is-complex', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync)
      .mockReturnValueOnce(Buffer.from('Simple content'))
      .mockReturnValueOnce(
        Buffer.from(
          JSON.stringify([
            { page_number: 1, needs_ocr: false, reasons: [] },
            { page_number: 2, needs_ocr: true, reasons: ['scanned'] },
          ]),
        ),
      );

    const result = await extractor.extract({ filePath: '/tmp/mixed.pdf' });
    expect(result.manifest.complexity).toBe('high');
  });

  it('configures OCR server URL when provided', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync)
      .mockReturnValueOnce(Buffer.from('OCR text'))
      .mockReturnValueOnce(
        Buffer.from(JSON.stringify([{ page_number: 1, needs_ocr: true, reasons: ['scanned'] }])),
      );

    await extractor.extract({
      filePath: '/tmp/scan.pdf',
      options: { ocrServerUrl: 'http://localhost:8080' },
    });

    const ocrCall = vi
      .mocked(execSync)
      .mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('--ocr-server-url'),
      );
    expect(ocrCall).toBeTruthy();
  });

  it('extracts images to disk when extractImages option is true', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync)
      .mockReturnValueOnce(Buffer.from('# Doc\n\n![Chart](img_p1_1.png)'))
      .mockReturnValueOnce(
        Buffer.from(JSON.stringify([{ page_number: 1, needs_ocr: false, reasons: [] }])),
      );

    const result = await extractor.extract({
      filePath: '/tmp/test.pdf',
      options: { extractImages: true },
    });

    const extractCall = vi
      .mocked(execSync)
      .mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('--extract-images'),
      );
    expect(extractCall).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @open-edu/pipeline test -- extraction/liteparse`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the LiteParse extractor**

Create `packages/pipeline/src/extraction/liteparse-extractor.ts`:

```typescript
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import type { Extractor } from './interface.js';
import type { ExtractionInput, ExtractionResult, ExtractionManifest, AssetInfo } from './types.js';

const SUPPORTED_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.docm',
  '.odt',
  '.rtf',
  '.ppt',
  '.pptx',
  '.pptm',
  '.odp',
  '.key',
  '.xls',
  '.xlsx',
  '.xlsm',
  '.ods',
  '.csv',
  '.tsv',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.bmp',
  '.tiff',
  '.webp',
  '.svg',
  '.md',
  '.markdown',
  '.txt',
];

interface ComplexityPage {
  page_number: number;
  needs_ocr: boolean;
  reasons: string[];
}

export class LiteParseExtractor implements Extractor {
  readonly id = 'liteparse';
  readonly supportedExtensions = [...SUPPORTED_EXTENSIONS];

  canHandle(input: ExtractionInput): boolean {
    return SUPPORTED_EXTENSIONS.some((ext) => input.filePath.toLowerCase().endsWith(ext));
  }

  async extract(input: ExtractionInput): Promise<ExtractionResult> {
    const ext = this.getExtension(input.filePath);

    if (['.md', '.markdown', '.txt'].includes(ext)) {
      return this.extractMarkdown(input.filePath);
    }

    return this.extractViaLiteParse(input);
  }

  private extractMarkdown(filePath: string): ExtractionResult {
    const contentMd = readFileSync(filePath, 'utf-8');

    const manifest: ExtractionManifest = {
      id: this.generateId(filePath),
      sourceType: 'markdown',
      extractor: this.id,
      version: '1.0.0',
      pages: 1,
      images: 0,
      tables: 0,
      warnings: [],
      createdAt: new Date().toISOString(),
      complexity: 'low',
    };

    return { contentMd, manifest, assets: [] };
  }

  private extractViaLiteParse(input: ExtractionInput): ExtractionResult {
    const filePath = input.filePath;
    const opts = input.options;
    const ext = this.getExtension(filePath);
    const sourceType = this.getSourceType(ext);

    const litArgs = this.buildLitArgs(filePath, opts);
    const markdown = execSync(litArgs, {
      encoding: 'utf-8',
      timeout: 120_000,
      maxBuffer: 50 * 1024 * 1024,
    });

    const complexity = this.checkComplexity(filePath);
    const assets = this.extractAssetRefs(markdown);
    const tableCount = this.countTables(markdown);
    const pageCount = this.countPages(filePath, complexity);
    const warnings = this.buildWarnings(complexity);

    const manifest: ExtractionManifest = {
      id: this.generateId(filePath),
      sourceType,
      extractor: this.id,
      version: '1.0.0',
      pages: pageCount,
      images: assets.length,
      tables: tableCount,
      warnings,
      createdAt: new Date().toISOString(),
      complexity: this.deriveComplexity(complexity),
    };

    return { contentMd: markdown.trim(), manifest, assets };
  }

  private buildLitArgs(filePath: string, opts?: ExtractionInput['options']): string {
    const parts = ['lit', 'parse', `"${filePath}"`, '--format', 'markdown'];

    if (opts?.noOcr) parts.push('--no-ocr');
    if (opts?.ocrLanguage) parts.push('--ocr-language', opts.ocrLanguage);
    if (opts?.ocrServerUrl) parts.push('--ocr-server-url', opts.ocrServerUrl);
    if (opts?.extractImages) parts.push('--extract-images');
    if (opts?.imageMode) parts.push('--image-mode', opts.imageMode);
    if (opts?.targetPages) parts.push('--target-pages', opts.targetPages);
    if (opts?.maxPages) parts.push('--max-pages', String(opts.maxPages));
    parts.push('-q');

    return parts.join(' ');
  }

  private checkComplexity(filePath: string): ComplexityPage[] {
    try {
      const cmd = `lit is-complex "${filePath}" --compact -q`;
      const output = execSync(cmd, { encoding: 'utf-8', timeout: 30_000 });
      return JSON.parse(output);
    } catch {
      return [];
    }
  }

  private deriveComplexity(pages: ComplexityPage[]): 'low' | 'medium' | 'high' {
    if (pages.length === 0) return 'low';
    const ocrPages = pages.filter((p) => p.needs_ocr).length;
    const ratio = ocrPages / pages.length;
    if (ratio > 0.5 || pages.length > 50) return 'high';
    if (ratio > 0.1 || pages.length > 15) return 'medium';
    return 'low';
  }

  private extractAssetRefs(markdown: string): AssetInfo[] {
    const assets: AssetInfo[] = [];
    const pattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let match;
    while ((match = pattern.exec(markdown)) !== null) {
      const originalName = match[2];
      if (originalName.startsWith('http')) continue;
      const ext = originalName.split('.').pop() || 'png';
      assets.push({
        filename: `image-${String(assets.length + 1).padStart(3, '0')}.${ext}`,
        originalName,
        mediaType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
        sizeBytes: 0,
      });
    }
    return assets;
  }

  private countTables(markdown: string): number {
    const tableRows = markdown.match(/^\|.*\|$/gm) || [];
    return Math.floor(tableRows.length / 3);
  }

  private countPages(filePath: string, complexity: ComplexityPage[]): number {
    if (complexity.length > 0) {
      return Math.max(...complexity.map((p) => p.page_number));
    }
    return 1;
  }

  private buildWarnings(complexity: ComplexityPage[]): string[] {
    const warnings: string[] = [];
    const ocrPages = complexity.filter((p) => p.needs_ocr);
    if (ocrPages.length > 0) {
      warnings.push(
        `${ocrPages.length} page(s) require OCR: pages ${ocrPages.map((p) => p.page_number).join(', ')}`,
      );
    }
    return warnings;
  }

  private getExtension(filePath: string): string {
    const lower = filePath.toLowerCase();
    for (const ext of SUPPORTED_EXTENSIONS) {
      if (lower.endsWith(ext)) return ext;
    }
    return '';
  }

  private getSourceType(ext: string): string {
    if (ext === '.pdf') return 'pdf';
    if (['.doc', '.docx', '.docm', '.odt', '.rtf'].includes(ext)) return 'docx';
    if (['.ppt', '.pptx', '.pptm', '.odp', '.key'].includes(ext)) return 'pptx';
    if (['.xls', '.xlsx', '.xlsm', '.ods', '.csv', '.tsv'].includes(ext)) return 'spreadsheet';
    if (['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff', '.webp', '.svg'].includes(ext))
      return 'image';
    return 'unknown';
  }

  private generateId(filePath: string): string {
    return createHash('sha256').update(filePath).digest('hex').slice(0, 12);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @open-edu/pipeline test -- extraction/liteparse`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/pipeline/src/extraction/liteparse-extractor.ts packages/pipeline/src/extraction/__tests__/liteparse-extractor.test.ts
git commit -m "feat(pipeline): add LiteParseExtractor for PDF/DOCX/PPTX/Markdown"
```

---

## Task 7: ZIP Handler

**Files:**

- Create: `packages/pipeline/src/extraction/zip-handler.ts`
- Test: `packages/pipeline/src/extraction/__tests__/zip-handler.test.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/pipeline/src/extraction/__tests__/zip-handler.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ZipHandler } from '../zip-handler.js';
import { ExtractorRouter } from '../router.js';
import { LiteParseExtractor } from '../liteparse-extractor.js';
import type { Extractor } from '../interface.js';

function makeFakeExtractor(id: string, extensions: string[]): Extractor {
  return {
    id,
    supportedExtensions: extensions,
    canHandle: (input) => extensions.some((ext) => input.filePath.endsWith(ext)),
    extract: async (input) => ({
      contentMd: `# ${id} output for ${input.filePath}`,
      manifest: {
        id: 'test',
        sourceType: 'test',
        extractor: id,
        version: '1.0.0',
        pages: 1,
        images: 0,
        tables: 0,
        warnings: [],
        createdAt: new Date().toISOString(),
        complexity: 'low' as const,
      },
      assets: [],
    }),
  };
}

describe('ZipHandler', () => {
  let router: ExtractorRouter;
  let handler: ZipHandler;

  beforeEach(() => {
    router = new ExtractorRouter();
    router.register(makeFakeExtractor('liteparse', ['.pdf', '.docx', '.pptx', '.png', '.jpg']));
    handler = new ZipHandler(router);
  });

  it('canHandle returns true for .zip files', () => {
    expect(handler.canHandle({ filePath: '/tmp/archive.zip' })).toBe(true);
  });

  it('canHandle returns false for non-zip files', () => {
    expect(handler.canHandle({ filePath: '/tmp/doc.pdf' })).toBe(false);
  });

  it('lists extractable files from a zip (mocked)', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const { execSync } = await import('node:child_process');

    const tmpDir = `/tmp/zip-test-${Date.now()}`;
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'readme.txt'), 'hello');
    fs.writeFileSync(path.join(tmpDir, 'doc.pdf'), 'fake pdf');

    const zipPath = `/tmp/test-${Date.now()}.zip`;
    execSync(`cd "${tmpDir}" && zip "${zipPath}" *.txt *.pdf`);

    const files = handler.listZipContents(zipPath);
    expect(files).toContain('readme.txt');
    expect(files).toContain('doc.pdf');

    fs.rmSync(tmpDir, { recursive: true });
    fs.unlinkSync(zipPath);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @open-edu/pipeline test -- extraction/zip`
Expected: FAIL — module not found

- [ ] **Step 3: Implement ZIP handler**

Create `packages/pipeline/src/extraction/zip-handler.ts`:

```typescript
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readdirSync, unlinkSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { ExtractorRouter } from './router.js';
import type { ExtractionInput, ExtractionResult, ExtractionManifest, AssetInfo } from './types.js';

export class ZipHandler {
  private router: ExtractorRouter;

  constructor(router: ExtractorRouter) {
    this.router = router;
  }

  canHandle(input: ExtractionInput): boolean {
    return input.filePath.toLowerCase().endsWith('.zip');
  }

  listZipContents(zipPath: string): string[] {
    const output = execSync(`unzip -l "${zipPath}"`, { encoding: 'utf-8' });
    const lines = output.split('\n');
    const files: string[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (
        !trimmed ||
        trimmed.startsWith('Archive:') ||
        trimmed.startsWith('Length') ||
        trimmed.startsWith('---')
      )
        continue;
      const parts = trimmed.split(/\s+/);
      const name = parts[parts.length - 1];
      if (name && !name.endsWith('/')) {
        files.push(name);
      }
    }
    return files;
  }

  async extract(input: ExtractionInput): Promise<ExtractionResult> {
    const tmpDir = join(tmpdir(), `oep-zip-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });

    try {
      execSync(`unzip -o "${input.filePath}" -d "${tmpDir}"`, { encoding: 'utf-8' });
    } catch {
      throw new Error(`Failed to extract ZIP: ${input.filePath}`);
    }

    const files = readdirSync(tmpDir, { recursive: true }) as string[];
    const allContent: string[] = [];
    const allAssets: AssetInfo[] = [];
    const allWarnings: string[] = [];
    let totalPages = 0;
    let totalImages = 0;
    let totalTables = 0;

    for (const file of files) {
      const filePath = join(tmpDir, file);
      const ext = file.toLowerCase();

      if (
        ext.endsWith('.png') ||
        ext.endsWith('.jpg') ||
        ext.endsWith('.jpeg') ||
        ext.endsWith('.webp')
      ) {
        totalImages++;
        continue;
      }

      if (
        ext.endsWith('.pdf') ||
        ext.endsWith('.docx') ||
        ext.endsWith('.pptx') ||
        ext.endsWith('.md') ||
        ext.endsWith('.txt')
      ) {
        const extractionInput: ExtractionInput = { filePath };
        const extractor = this.router.resolve(extractionInput);
        if (extractor) {
          try {
            const result = await extractor.extract(extractionInput);
            allContent.push(result.contentMd);
            allAssets.push(...result.assets);
            allWarnings.push(...result.manifest.warnings);
            totalPages += result.manifest.pages;
            totalImages += result.manifest.images;
            totalTables += result.manifest.tables;
          } catch {
            allWarnings.push(`Failed to extract: ${file}`);
          }
        }
      }
    }

    rmSync(tmpDir, { recursive: true, force: true });

    const manifest: ExtractionManifest = {
      id: `zip-${Date.now()}`,
      sourceType: 'zip',
      extractor: 'zip-handler',
      version: '1.0.0',
      pages: totalPages,
      images: totalImages,
      tables: totalTables,
      warnings: allWarnings,
      createdAt: new Date().toISOString(),
      complexity: 'medium',
    };

    return {
      contentMd: allContent.join('\n\n'),
      manifest,
      assets: allAssets,
    };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @open-edu/pipeline test -- extraction/zip`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/pipeline/src/extraction/zip-handler.ts packages/pipeline/src/extraction/__tests__/zip-handler.test.ts
git commit -m "feat(pipeline): add ZipHandler for recursive archive extraction"
```

---

## Task 8: Backward-Compatible Adapter

**Files:**

- Create: `packages/pipeline/src/extraction/adapter.ts`
- Test: `packages/pipeline/src/extraction/__tests__/adapter.test.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/pipeline/src/extraction/__tests__/adapter.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { toPageContent } from '../adapter.js';
import type { ExtractionResult } from '../types.js';

function makeResult(contentMd: string, pageCount: number = 5): ExtractionResult {
  return {
    contentMd,
    manifest: {
      id: 'test',
      sourceType: 'pdf',
      extractor: 'liteparse',
      version: '1.0.0',
      pages: pageCount,
      images: 0,
      tables: 0,
      warnings: [],
      createdAt: new Date().toISOString(),
      complexity: 'low',
    },
    assets: [],
  };
}

describe('toPageContent adapter', () => {
  it('splits markdown by form-feed into pages', () => {
    const result = makeResult('Page 1 content\n\fPage 2 content\n\fPage 3 content');
    const pages = toPageContent(result);
    expect(pages).toHaveLength(3);
    expect(pages[0].pageNum).toBe(1);
    expect(pages[0].text).toBe('Page 1 content');
    expect(pages[2].pageNum).toBe(3);
  });

  it('splits by double newline when no form-feed', () => {
    const result = makeResult('Paragraph one\n\nParagraph two\n\nParagraph three');
    const pages = toPageContent(result);
    expect(pages.length).toBeGreaterThan(0);
  });

  it('creates single page for short content', () => {
    const result = makeResult('Just a short doc');
    const pages = toPageContent(result);
    expect(pages).toHaveLength(1);
    expect(pages[0].pageNum).toBe(1);
  });

  it('skips empty pages', () => {
    const result = makeResult('Page 1\n\f\n\fPage 3');
    const pages = toPageContent(result);
    expect(pages).toHaveLength(2);
    expect(pages[0].text).toBe('Page 1');
    expect(pages[1].text).toBe('Page 3');
  });

  it('preserves text content faithfully', () => {
    const text = '# Chapter 1\n\nThis is content with **bold** and *italic*';
    const result = makeResult(text);
    const pages = toPageContent(result);
    expect(pages[0].text).toContain('# Chapter 1');
    expect(pages[0].text).toContain('**bold**');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @open-edu/pipeline test -- extraction/adapter`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the adapter**

Create `packages/pipeline/src/extraction/adapter.ts`:

```typescript
import type { ExtractionResult } from './types.js';
import type { PageContent } from '../source/inventory.js';

export function toPageContent(result: ExtractionResult): PageContent[] {
  const chunks = result.contentMd.split(/\f/);

  if (chunks.length <= 1) {
    return splitByParagraphs(result.contentMd);
  }

  const pages: PageContent[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const text = chunks[i]!.trim();
    if (text.length > 0) {
      pages.push({ pageNum: i + 1, text });
    }
  }
  return pages;
}

function splitByParagraphs(content: string): PageContent[] {
  const paragraphs = content.split(/\n{2,}/).filter((p) => p.trim().length > 0);

  if (paragraphs.length === 0) {
    return [{ pageNum: 1, text: content.trim() }];
  }

  const pages: PageContent[] = [];
  let pageNum = 1;
  let currentText = '';

  for (const para of paragraphs) {
    if (currentText.length + para.length > 2000 && currentText.length > 0) {
      pages.push({ pageNum, text: currentText.trim() });
      pageNum++;
      currentText = para;
    } else {
      currentText += (currentText ? '\n\n' : '') + para;
    }
  }

  if (currentText.trim().length > 0) {
    pages.push({ pageNum, text: currentText.trim() });
  }

  return pages;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @open-edu/pipeline test -- extraction/adapter`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/pipeline/src/extraction/adapter.ts packages/pipeline/src/extraction/__tests__/adapter.test.ts
git commit -m "feat(pipeline): add backward-compatible PageContent adapter"
```

---

## Task 9: Public API and Integration

**Files:**

- Create: `packages/pipeline/src/extraction/index.ts`
- Test: `packages/pipeline/src/extraction/__tests__/integration.test.ts`

- [ ] **Step 1: Write integration tests**

Create `packages/pipeline/src/extraction/__tests__/integration.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runExtraction, createDefaultRouter } from '../index.js';
import type { ExtractionInput } from '../types.js';

vi.mock('node:child_process', () => ({
  execSync: vi
    .fn()
    .mockReturnValueOnce(
      Buffer.from('# Chapter 1\n\nContent\n\n![Image](img.png)\n\n| A | B |\n|---|---|\n| 1 | 2 |'),
    )
    .mockReturnValueOnce(Buffer.from('[]')),
}));

describe('runExtraction', () => {
  it('extracts a PDF using default router', async () => {
    const input: ExtractionInput = { filePath: '/tmp/test.pdf' };
    const result = await runExtraction(input);
    expect(result.contentMd).toBeTruthy();
    expect(result.manifest.extractor).toBe('liteparse');
    expect(result.manifest.sourceType).toBe('pdf');
  });

  it('adapter converts result to PageContent[]', async () => {
    const input: ExtractionInput = { filePath: '/tmp/test.pdf' };
    const result = await runExtraction(input);
    const { toPageContent } = await import('../adapter.js');
    const pages = toPageContent(result);
    expect(pages.length).toBeGreaterThan(0);
    expect(pages[0].pageNum).toBe(1);
  });
});

describe('createDefaultRouter', () => {
  it('creates router with built-in extractors', () => {
    const router = createDefaultRouter();
    const ids = router.listExtractors();
    expect(ids).toContain('liteparse');
    expect(ids).toContain('ocr');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @open-edu/pipeline test -- extraction/integration`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the public API**

Create `packages/pipeline/src/extraction/index.ts`:

```typescript
import type { ExtractionInput, ExtractionResult } from './types.js';
import { ExtractionInputSchema } from './types.js';
import { ExtractorRouter } from './router.js';
import { LiteParseExtractor } from './liteparse-extractor.js';
import { ZipHandler } from './zip-handler.js';
import { MarkdownNormalizer } from './normalizer.js';
import { ExtractionLogger } from './logger.js';
import type { Extractor } from './interface.js';

let defaultRouter: ExtractorRouter | null = null;
let normalizer: MarkdownNormalizer | null = null;
let logger: ExtractionLogger | null = null;

export function createDefaultRouter(): ExtractorRouter {
  const router = new ExtractorRouter();
  router.register(new LiteParseExtractor());
  return router;
}

export function getDefaultRouter(): ExtractorRouter {
  if (!defaultRouter) {
    defaultRouter = createDefaultRouter();
  }
  return defaultRouter;
}

export function registerExtractor(extractor: Extractor): void {
  getDefaultRouter().register(extractor);
}

export function getNormalizer(): MarkdownNormalizer {
  if (!normalizer) {
    normalizer = new MarkdownNormalizer();
  }
  return normalizer;
}

export function getLogger(): ExtractionLogger {
  if (!logger) {
    logger = new ExtractionLogger('console', false);
  }
  return logger;
}

export function setLogger(newLogger: ExtractionLogger): void {
  logger = newLogger;
}

export async function runExtraction(input: ExtractionInput): Promise<ExtractionResult> {
  const validatedInput = ExtractionInputSchema.parse(input);
  const router = getDefaultRouter();
  const norm = getNormalizer();

  if (validatedInput.filePath.toLowerCase().endsWith('.zip')) {
    const zipHandler = new ZipHandler(router);
    const rawResult = await zipHandler.extract(validatedInput);
    return {
      ...rawResult,
      contentMd: norm.normalize(rawResult.contentMd),
    };
  }

  const extractor = router.resolve(validatedInput);
  if (!extractor) {
    throw new Error(`No extractor found for: ${validatedInput.filePath}`);
  }

  const startTime = Date.now();
  const log = getLogger();

  try {
    const rawResult = await extractor.extract(validatedInput);
    const durationMs = Date.now() - startTime;
    log.info(extractor.id, validatedInput.filePath, durationMs, 'Extraction complete');

    const normalizedContent = norm.normalize(rawResult.contentMd);
    const detector = getComplexityDetector();
    const complexity = detector.analyze({
      pageCount: rawResult.manifest.pages,
      tableCount: rawResult.manifest.tables,
      imageCount: rawResult.manifest.images,
      ocrConfidence: 0.9,
      averagePageLength: normalizedContent.length / Math.max(rawResult.manifest.pages, 1),
    });

    return {
      ...rawResult,
      contentMd: normalizedContent,
      manifest: {
        ...rawResult.manifest,
        complexity: complexity.complexity,
      },
    };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    log.error(extractor.id, validatedInput.filePath, durationMs, String(err));
    throw err;
  }
}

export { ExtractorRouter } from './router.js';
export { MarkdownNormalizer } from './normalizer.js';
export { ComplexityDetector } from './complexity.js';
export { ExtractionLogger } from './logger.js';
export { LiteParseExtractor } from './liteparse-extractor.js';
export { OcrExtractor } from './ocr-extractor.js';
export { ZipHandler } from './zip-handler.js';
export { toPageContent } from './adapter.js';
export type { Extractor } from './interface.js';
export type {
  ExtractionInput,
  ExtractionResult,
  ExtractionManifest,
  ExtractionError,
  AssetInfo,
  ComplexityLevel,
} from './types.js';
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @open-edu/pipeline test -- extraction/integration`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/pipeline/src/extraction/index.ts packages/pipeline/src/extraction/__tests__/integration.test.ts
git commit -m "feat(pipeline): add extraction public API and integration"
```

---

## Task 10: Wire into runPipelineV2

**Files:**

- Modify: `packages/pipeline/src/graph/index.ts`
- Modify: `packages/pipeline/src/cli/index.ts`

- [ ] **Step 1: Update runPipelineV2 to use new extraction framework**

In `packages/pipeline/src/graph/index.ts`, replace the Stage 1 block (lines 134–139) with:

```typescript
// Stage 1: Extract (pluggable extraction framework)
if (options.verbose) console.log('[1/8] Extracting content...');
let pages: PageContent[] = [];
let pdfMeta = { metadata: { title: options.subject } };

if (!options.dryRun) {
  const { runExtraction, toPageContent } = await import('../extraction/index.js');
  const extractionResult = await runExtraction({ filePath: options.pdfPath });
  pages = toPageContent(extractionResult);
  pdfMeta = { metadata: { title: extractionResult.manifest.sourceType || options.subject } };
}
```

- [ ] **Step 2: Update CLI to accept multi-format input**

In `packages/pipeline/src/cli/index.ts`, find where the `--pdf` option is defined and add a more general description. Also add `.docx`, `.pptx`, `.zip` to the supported file types in help text.

- [ ] **Step 3: Run full pipeline tests**

Run: `pnpm --filter @open-edu/pipeline test`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add packages/pipeline/src/graph/index.ts packages/pipeline/src/cli/index.ts
git commit -m "feat(pipeline): wire extraction framework into runPipelineV2"
```

---

## Task 11: Package.json Updates

**Files:**

- Modify: `packages/pipeline/package.json`

- [ ] **Step 1: Add LiteParse dependency**

Add to `dependencies`:

```json
{
  "@llamaindex/liteparse": "^2.8.0"
}
```

- [ ] **Step 2: Install dependencies**

Run: `pnpm install`
Expected: Successful install

- [ ] **Step 3: Run full typecheck**

Run: `pnpm --filter @open-edu/pipeline typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/pipeline/package.json pnpm-lock.yaml
git commit -m "chore(pipeline): add @llamaindex/liteparse for document extraction"
```

---

## Task 12: End-to-End Verification

- [ ] **Step 1: Run all pipeline tests**

Run: `pnpm --filter @open-edu/pipeline test`
Expected: All tests pass

- [ ] **Step 2: Run full lint**

Run: `pnpm lint`
Expected: No lint errors

- [ ] **Step 3: Run full typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 4: Run formatting check**

Run: `pnpm format:check`
Expected: PASS

- [ ] **Step 5: Verify extraction works end-to-end**

Create a test markdown file and run extraction:

```bash
echo "# Test Document\n\n## Section 1\n\nContent here\n\n![Image](test.png)" > /tmp/test-extract.md
pnpm --filter @open-edu/pipeline test -- extraction/integration
```

Expected: All integration tests pass

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat(pipeline): complete Stage 1 extraction framework"
```

---

## Spec Coverage Checklist

| Spec Section                                                 | Task                 |
| ------------------------------------------------------------ | -------------------- |
| Pluggable extractor interface                                | Task 2               |
| Extractor Router                                             | Task 3               |
| LiteParse Extractor (PDF/DOCX/PPTX/XLSX/Images)              | Task 6               |
| OCR Support (Tesseract + PaddleOCR)                          | Built into LiteParse |
| ZIP Package Handling                                         | Task 7               |
| Markdown Normalization (headings, whitespace, assets, links) | Task 4               |
| Canonical Markdown Format                                    | Tasks 4 + 6          |
| Manifest Schema                                              | Task 1               |
| Complexity Detection                                         | Built into LiteParse |
| Error Handling (structured errors)                           | Tasks 1 + 6 + 7      |
| Observability (structured logs)                              | Task 5               |
| Backward-compatible adapter                                  | Task 8               |
| Public API                                                   | Task 9               |
| Pipeline integration                                         | Task 10              |
| Unit tests (router, normalizer, manifest)                    | Tasks 1–5            |
| Integration tests (PDF, DOCX, PPTX, ZIP)                     | Tasks 6–7, 9         |
| Golden tests (deterministic output)                          | Tasks 4 + 6          |

---

## Non-Goals (Confirmed)

Per spec §Non-Goals, this plan does NOT implement:

- Chunking / embeddings
- AI summarization or rewriting
- Learning objective generation
- Quiz generation
- Course authoring
- Knowledge graph generation

These remain in Stages 2–8 of the existing pipeline.
