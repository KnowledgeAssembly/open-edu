import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Readable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { StudioContextSnapshot } from '../context';

const mockStreamText = vi.fn();
const mockPipe = vi.fn();
const mockCreateUIMessageStream = vi.fn();
const mockToUIMessageStream = vi.fn((opts: { stream: unknown }) => opts.stream);
const mockDraftActivity = vi.fn();
const mockGenerateCourseDraftTool = vi.fn();
const mockCheckRateLimit = vi.fn();

vi.mock('ai', () => ({
  streamText: (...args: unknown[]) => mockStreamText(...args),
  pipeUIMessageStreamToResponse: (...args: unknown[]) => mockPipe(...args),
  createUIMessageStream: (opts: { execute: (writer: { write: (p: unknown) => void }) => void }) =>
    mockCreateUIMessageStream(opts),
  toUIMessageStream: (opts: { stream: unknown }) => mockToUIMessageStream(opts),
}));

vi.mock('@open-edu/llm-config', () => ({
  createModelFactoryFromEnv: vi.fn().mockReturnValue({
    getModel: vi.fn().mockReturnValue('mock-model'),
  }),
}));

vi.mock('../studioLlm', () => ({
  completeWithLlm: vi.fn().mockResolvedValue('compiled'),
}));

vi.mock('./tools', () => ({
  draftActivity: mockDraftActivity,
  generateCourseDraftTool: mockGenerateCourseDraftTool,
}));

vi.mock('./rateLimit', () => ({
  checkRateLimit: mockCheckRateLimit,
  resetRateLimits: vi.fn(),
}));

const { createStudioAssistantHandler } = await import('./handler');

const mockContext: Partial<StudioContextSnapshot> = {
  view: 'outline',
  locale: 'en',
  aiAvailable: true,
  course: {
    id: 'course-1',
    title: 'Course',
    activityCount: 2,
    outline: [
      { title: 'A', kind: 'lesson', path: 'nodes/a.md' },
      { title: 'B', kind: 'quiz', path: 'nodes/b.json' },
    ],
  },
};

function makeReq(body: unknown): IncomingMessage {
  const readable = Readable.from([JSON.stringify(body)]);
  return readable as unknown as IncomingMessage;
}

function makeRes() {
  let closeHandler: (() => void) | null = null;
  const res = {
    headersSent: false,
    writableEnded: false,
    statusCode: 200,
    written: [] as Array<{ status: number; headers: Record<string, string>; body: unknown }>,
    writeHead(status: number, headers: Record<string, string>) {
      this.headersSent = true;
      this.statusCode = status;
      this.written.push({ status, headers, body: undefined });
    },
    end(body?: unknown) {
      this.writableEnded = true;
      if (this.written.length > 0) {
        this.written[this.written.length - 1]!.body = body;
      } else {
        this.written.push({ status: 200, headers: {}, body });
      }
    },
    write() {
      return true;
    },
    once(event: string, handler: () => void) {
      if (event === 'close') closeHandler = handler;
    },
    emitClose() {
      closeHandler?.();
    },
  };
  return res as unknown as ServerResponse & {
    headersSent: boolean;
    writableEnded: boolean;
    statusCode: number;
    written: Array<{ status: number; headers: Record<string, string>; body: unknown }>;
    emitClose: () => void;
  };
}

const validRequest = {
  conversationId: 'test-conv',
  messages: [{ role: 'user' as const, content: 'Hello' }],
  context: mockContext,
};

describe('createStudioAssistantHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockReturnValue(false);
    mockPipe.mockResolvedValue(undefined);
  });

  it('streams an explain response via streamText + pipeUIMessageStreamToResponse', async () => {
    mockStreamText.mockReturnValue({ stream: new ReadableStream() });
    const res = makeRes();
    await createStudioAssistantHandler(makeReq(validRequest), res, {});

    expect(mockStreamText).toHaveBeenCalledOnce();
    expect(mockToUIMessageStream).toHaveBeenCalledOnce();
    expect(mockPipe).toHaveBeenCalledOnce();
    const pipeArgs = mockPipe.mock.calls[0]![0] as { status: number; response: ServerResponse };
    expect(pipeArgs.status).toBe(200);
    expect(pipeArgs.response).toBe(res);
  });

  it('passes the system prompt via the `system` option, never as a system message', async () => {
    mockStreamText.mockReturnValue({ stream: new ReadableStream() });
    const res = makeRes();
    await createStudioAssistantHandler(makeReq(validRequest), res, {});

    const args = mockStreamText.mock.calls[0]![0] as {
      system?: string;
      messages: Array<{ role: string }>;
    };
    expect(args.system).toBeTypeOf('string');
    expect(args.messages.some((m) => m.role === 'system')).toBe(false);
  });

  it('aborts the explain stream only when the response closes before completion', async () => {
    mockStreamText.mockReturnValue({ stream: new ReadableStream() });
    const res = makeRes();
    const done = createStudioAssistantHandler(makeReq(validRequest), res, {});
    await new Promise((r) => setTimeout(r, 0));

    const args = mockStreamText.mock.calls[0]![0] as { abortSignal?: AbortSignal };
    expect(args.abortSignal).toBeDefined();
    expect(args.abortSignal!.aborted).toBe(false);

    // Premature close (client disconnect / Stop) must abort the LLM call.
    res.emitClose();
    expect(args.abortSignal!.aborted).toBe(true);

    await done;
  });

  it('does not abort when the request body is fully read (close fires only on res, not req)', async () => {
    mockStreamText.mockReturnValue({ stream: new ReadableStream() });
    const res = makeRes();
    await createStudioAssistantHandler(makeReq(validRequest), res, {});

    const args = mockStreamText.mock.calls[0]![0] as { abortSignal?: AbortSignal };
    expect(args.abortSignal!.aborted).toBe(false);

    // Normal completion: response ends before the socket closes — no abort.
    res.end('done');
    res.emitClose();
    expect(args.abortSignal!.aborted).toBe(false);
  });

  it('emits a draft message with metadata on finish for a lesson draft request', async () => {
    mockDraftActivity.mockResolvedValue({
      ok: true,
      items: [{ kind: 'lesson', title: 'L', content: '# L' }],
    });

    const res = makeRes();
    const written: Array<Record<string, unknown>> = [];
    mockCreateUIMessageStream.mockImplementation(
      (opts: {
        execute: (w: { writer: { write: (p: Record<string, unknown>) => void } }) => void;
      }) => {
        opts.execute({ writer: { write: (p) => written.push(p) } });
        return new ReadableStream();
      },
    );

    await createStudioAssistantHandler(
      makeReq({
        ...validRequest,
        messages: [{ role: 'user', content: 'Create a lesson about fractions' }],
      }),
      res,
      { packageDir: '/pkg' },
    );

    expect(mockPipe).toHaveBeenCalledOnce();
    const finish = written.find((p) => p.type === 'finish') as {
      messageMetadata: { mode: string; drafts: unknown[] };
    };
    expect(finish).toBeDefined();
    expect(finish.messageMetadata.mode).toBe('draft');
    expect(finish.messageMetadata.drafts).toHaveLength(1);
    const text = written
      .filter((p) => p.type === 'text-delta')
      .map((p) => p.delta)
      .join('');
    expect(text).toContain('draft');
  });

  it('emits a course draft message with courseDraft metadata', async () => {
    mockGenerateCourseDraftTool.mockResolvedValue({
      ok: true,
      courseDraft: {
        success: true,
        title: 'My Course',
        outlinePreview: [],
        quality: [],
        draftId: 'draft-1',
      },
    });

    const res = makeRes();
    const written: Array<Record<string, unknown>> = [];
    mockCreateUIMessageStream.mockImplementation(
      (opts: {
        execute: (w: { writer: { write: (p: Record<string, unknown>) => void } }) => void;
      }) => {
        opts.execute({ writer: { write: (p) => written.push(p) } });
        return new ReadableStream();
      },
    );

    await createStudioAssistantHandler(
      makeReq({
        ...validRequest,
        messages: [
          {
            role: 'user',
            content:
              'Create a course about fractions for grade 4. Students should learn how to identify numerators and denominators, compare fractions with like denominators, and add simple fractions. Include two lessons and a quiz.',
          },
        ],
      }),
      res,
      { packageDir: '/pkg' },
    );

    const finish = written.find((p) => p.type === 'finish') as {
      messageMetadata: {
        mode: string;
        courseDraft: { draftId: string };
        suggestedNextSteps: string[];
      };
    };
    expect(finish.messageMetadata.mode).toBe('course_draft');
    expect(finish.messageMetadata.courseDraft.draftId).toBe('draft-1');
    expect(finish.messageMetadata.suggestedNextSteps.length).toBeGreaterThan(0);
  });

  it('returns 400 for invalid request body', async () => {
    const res = makeRes();
    await createStudioAssistantHandler(makeReq({ messages: [] }), res, {});
    expect(res.statusCode).toBe(400);
    expect(res.headersSent).toBe(true);
  });

  it('returns 400 when messages exceed MAX_MESSAGES', async () => {
    const tooMany = Array.from({ length: 51 }, (_, i) => ({
      role: 'user' as const,
      content: `Message ${i}`,
    }));
    const res = makeRes();
    await createStudioAssistantHandler(makeReq({ ...validRequest, messages: tooMany }), res, {});
    expect(res.statusCode).toBe(400);
  });

  it('returns 429 when rate limited', async () => {
    mockCheckRateLimit.mockReturnValue(true);
    const res = makeRes();
    await createStudioAssistantHandler(makeReq(validRequest), res, {});
    expect(res.statusCode).toBe(429);
  });

  it('returns 500 with safe message on explain LLM failure', async () => {
    mockStreamText.mockImplementation(() => {
      throw new Error('provider auth failed');
    });
    const res = makeRes();
    await createStudioAssistantHandler(makeReq(validRequest), res, {});
    expect(res.statusCode).toBe(500);
    const body = JSON.parse(res.written[0]!.body as string) as { error: string };
    expect(body.error).toBe('An error occurred');
  });
});
