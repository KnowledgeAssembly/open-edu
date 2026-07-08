import { z } from 'zod';
import type {
  AIProvider,
  AIResponse,
  ExplanationRequest,
  LearningContext,
} from '@open-edu/ai-companion';
import { createLlmProvider } from '@open-edu/llm-config';
import type { LlmProvider } from '@open-edu/llm-config';

const responseSchema = z.object({
  text: z.string(),
  citations: z
    .array(z.object({ source: z.string(), text: z.string() }))
    .optional()
    .default([]),
});

export class AIProviderImpl implements AIProvider {
  private provider: LlmProvider | null;

  constructor(provider?: LlmProvider) {
    try {
      this.provider = provider ?? createLlmProvider();
    } catch {
      this.provider = null;
    }
  }

  async explain(request: ExplanationRequest): Promise<AIResponse> {
    if (!this.provider) {
      return {
        text: 'AI assistant is not configured. Please set up your LLM API key.',
        citations: [],
        timestamp: Date.now(),
      };
    }
    const prompt = this.buildExplainPrompt(request);
    const result = await this.provider.generateStructured(prompt, responseSchema);
    return { text: result.text, citations: result.citations ?? [], timestamp: Date.now() };
  }

  async ask(question: string, context: LearningContext): Promise<AIResponse> {
    if (!this.provider) {
      return {
        text: 'AI assistant is not configured. Please set up your LLM API key.',
        citations: [],
        timestamp: Date.now(),
      };
    }
    const prompt = this.buildAskPrompt(question, context);
    const result = await this.provider.generateStructured(prompt, responseSchema);
    return { text: result.text, citations: result.citations ?? [], timestamp: Date.now() };
  }

  async simplify(text: string, level: string): Promise<string> {
    if (!this.provider) return text;
    const prompt = `Simplify the following text for reading level "${level}".\n\n${text}`;
    const result = await this.provider.generateStructured(
      prompt,
      z.object({ simplified: z.string() }),
    );
    return result.simplified;
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
