import {
  generateCoursePackage,
  type CourseSpecSource,
} from '../studio/ai/generateCoursePackage.js';
import { completeWithLlm } from '../studio/ai/studioLlm.js';
import type { GenerateDraftRequest, GenerateDraftResponse } from './requestSchema.js';
import { MAX_GENERATED_FILES } from './requestSchema.js';
import { GatewayError } from './errors.js';

export interface GenerateDraftDeps {
  completeText?: (prompt: string) => Promise<string>;
  isAvailable?: () => boolean;
}

/**
 * Stateless draft generation for the hosted gateway. Compiles a course from
 * notes or an uploaded spec, reads the complete file set into memory, and
 * returns it encoded for JSON transport. There is no server-side draft
 * registry; the browser owns the returned files.
 */
export async function generateDraft(
  request: GenerateDraftRequest,
  requestId: string,
  deps: GenerateDraftDeps = {},
): Promise<GenerateDraftResponse> {
  const isAvailable = deps.isAvailable ?? (() => true);
  if (!isAvailable()) {
    throw new GatewayError(
      'missing-config',
      'AI is not configured. Add a provider key on the server.',
      requestId,
      503,
    );
  }

  const completeText = deps.completeText ?? completeWithLlm;
  const source: CourseSpecSource =
    request.notes !== undefined
      ? { kind: 'notes', notes: request.notes, completeText }
      : { kind: 'spec', spec: request.spec!, extension: request.specExt! };

  try {
    const compiled = await generateCoursePackage(source, {
      compile: undefined,
    });

    const files = Array.from(compiled.files.entries()).map(([path, content]) => ({
      path,
      content,
      encoding: 'utf8' as const,
    }));

    if (files.length > MAX_GENERATED_FILES) {
      throw new GatewayError(
        'generation-error',
        `Generated too many files (${files.length}). Try a simpler course.`,
        requestId,
        422,
      );
    }

    return {
      requestId,
      success: true,
      title: compiled.title,
      files,
      outlinePreview: compiled.outlinePreview,
      quality: compiled.quality,
    };
  } catch (err) {
    if (err instanceof GatewayError) throw err;
    const code = (err as { code?: string }).code;
    const status =
      code === 'llm' || code === 'provider-error' ? 502 : code === 'compile' ? 422 : 400;
    const safeMessage =
      code === 'llm' || code === 'provider-error'
        ? 'The AI provider could not be reached.'
        : code === 'compile'
          ? 'Course compilation failed.'
          : code === 'parse'
            ? 'Could not parse the generated output.'
            : 'Invalid request.';
    throw new GatewayError(
      code === 'llm'
        ? 'provider-error'
        : code === 'compile'
          ? 'generation-error'
          : 'invalid-request',
      safeMessage,
      requestId,
      status,
    );
  }
}
