import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import type { Extractor } from './interface.js';
import type { ExtractionInput, ExtractionResult, ExtractionManifest } from './types.js';

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff', '.webp'];

export class OcrExtractor implements Extractor {
  readonly id = 'ocr';
  readonly supportedExtensions = [...IMAGE_EXTENSIONS];

  canHandle(input: ExtractionInput): boolean {
    return IMAGE_EXTENSIONS.some((ext) => input.filePath.toLowerCase().endsWith(ext));
  }

  async extract(input: ExtractionInput): Promise<ExtractionResult> {
    const filePath = input.filePath;
    const opts = input.options;

    const parts = ['lit', 'parse', `"${filePath}"`, '--format', 'markdown'];
    if (opts?.ocrLanguage) parts.push('--ocr-language', opts.ocrLanguage);
    if (opts?.ocrServerUrl) parts.push('--ocr-server-url', opts.ocrServerUrl);
    if (opts?.noOcr) parts.push('--no-ocr');
    parts.push('-q');

    const markdown = execSync(parts.join(' '), {
      encoding: 'utf-8',
      timeout: 120_000,
      maxBuffer: 50 * 1024 * 1024,
    });

    const ext = this.getExtension(filePath);

    const manifest: ExtractionManifest = {
      id: this.generateId(filePath),
      sourceType: 'image',
      extractor: this.id,
      version: '1.0.0',
      pages: 1,
      images: 1,
      tables: 0,
      warnings: [],
      createdAt: new Date().toISOString(),
      complexity: 'low',
    };

    return {
      contentMd: markdown.trim(),
      manifest,
      assets: [
        {
          filename: ext ? `image-001${ext}` : 'image-001.png',
          originalName: filePath.split('/').pop() || filePath,
          mediaType: `image/${ext?.replace('.', '') || 'png'}`,
          sizeBytes: 0,
        },
      ],
    };
  }

  private getExtension(filePath: string): string | null {
    const lower = filePath.toLowerCase();
    for (const ext of IMAGE_EXTENSIONS) {
      if (lower.endsWith(ext)) return ext;
    }
    return null;
  }

  private generateId(filePath: string): string {
    return createHash('sha256').update(filePath).digest('hex').slice(0, 12);
  }
}
