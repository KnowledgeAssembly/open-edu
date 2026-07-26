/**
 * @deprecated Use server-side Pipili orchestration via usePipiliChat() instead.
 * This provider will be removed once the migration to the Pipili endpoint is complete.
 */

import { z } from 'zod';
import type {
  AIProvider,
  AIResponse,
  ExplanationRequest,
  LearningContext,
} from '@open-edu/ai-companion';

const responseSchema = z.object({
  text: z.string(),
  citations: z
    .array(z.object({ source: z.string(), text: z.string() }))
    .optional()
    .default([]),
});

const simplifySchema = z.object({ simplified: z.string() });

function getProxyUrl(): string {
  return (
    (typeof import.meta !== 'undefined'
      ? (import.meta.env.VITE_LLM_PROXY_URL as string | undefined)
      : undefined) || '/api/llm/chat'
  );
}

async function callLlmProxy(
  prompt: string,
  options?: { maxTokens?: number; temperature?: number },
): Promise<string> {
  const url = getProxyUrl();
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, ...options }),
    signal: AbortSignal.timeout(65_000),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const message = errorBody?.error ?? `LLM proxy returned status ${response.status}`;
    throw new Error(message);
  }

  const data = await response.json();
  const content = data.content as string | undefined;
  if (!content) {
    throw new Error('LLM proxy returned empty response');
  }
  return content;
}

export class AIProviderImpl implements AIProvider {
  async explain(request: ExplanationRequest): Promise<AIResponse> {
    try {
      const prompt = this.buildExplainPrompt(request);
      const raw = await callLlmProxy(prompt);
      const parsed = JSON.parse(raw);
      const result = responseSchema.parse(parsed);
      return { text: result.text, citations: result.citations ?? [], timestamp: Date.now() };
    } catch {
      return {
        text: 'AI assistant is not available. Please ensure the LLM proxy is running.',
        citations: [],
        timestamp: Date.now(),
      };
    }
  }

  async ask(question: string, context: LearningContext): Promise<AIResponse> {
    try {
      const prompt = this.buildAskPrompt(question, context);
      const raw = await callLlmProxy(prompt);
      const parsed = JSON.parse(raw);
      const result = responseSchema.parse(parsed);
      return { text: result.text, citations: result.citations ?? [], timestamp: Date.now() };
    } catch {
      return {
        text: 'AI assistant is not available. Please ensure the LLM proxy is running.',
        citations: [],
        timestamp: Date.now(),
      };
    }
  }

  async simplify(text: string, level: string): Promise<string> {
    try {
      const prompt = `Simplify the following text for reading level "${level}".\n\n${text}`;
      const raw = await callLlmProxy(prompt);
      const parsed = JSON.parse(raw);
      const result = simplifySchema.parse(parsed);
      return result.simplified;
    } catch {
      return text;
    }
  }

  private buildExplainPrompt(request: ExplanationRequest): string {
    const styleGuide: Record<string, string> = {
      simple: 'Use simple language suitable for a beginner.',
      detailed: 'Provide a thorough, detailed explanation.',
      child_friendly: 'Explain as if talking to a young child. Use simple words and examples.',
      autism_friendly: 'Use clear, literal language. Avoid metaphors. Be precise and structured.',
      exam: 'Provide a concise, exam-ready answer with key points.',
    };

    return [
      'You are an AI learning companion helping a student understand educational content.',
      '',
      `Style: ${styleGuide[request.style] ?? styleGuide.simple}`,
      request.readingLevel ? `Reading level: ${request.readingLevel}` : '',
      '',
      request.context.courseTitle ? `Course: ${request.context.courseTitle}` : '',
      request.context.lessonTitle ? `Lesson: ${request.context.lessonTitle}` : '',
      request.context.pageContent ? `Current page content:\n${request.context.pageContent}` : '',
      '',
      `Student asks: ${request.text}`,
      '',
      'Respond with a JSON object:',
      '{ "text": "your explanation here", "citations": [{ "source": "source name", "text": "cited text" }] }',
    ]
      .filter(Boolean)
      .join('\n');
  }

  private buildAskPrompt(question: string, context: LearningContext): string {
    return [
      'You are an AI learning companion helping a student.',
      '',
      context.courseTitle ? `Course: ${context.courseTitle}` : '',
      context.lessonTitle ? `Lesson: ${context.lessonTitle}` : '',
      context.pageContent ? `Current page content:\n${context.pageContent}` : '',
      '',
      `Student asks: ${question}`,
      '',
      'Respond with a JSON object:',
      '{ "text": "your answer here", "citations": [{ "source": "source name", "text": "cited text" }] }',
    ]
      .filter(Boolean)
      .join('\n');
  }
}
