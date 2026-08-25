import { z } from 'zod';

export interface FallbackAdapter {
  inputSchema: z.ZodType;
  outputSchema: z.ZodType;
  transform: (config: unknown) => unknown;
}

export function applyFallbackConfig(adapter: FallbackAdapter, config: unknown): unknown {
  const input = adapter.inputSchema.safeParse(config);
  if (!input.success) throw new Error('fallback-input-invalid');
  const out = adapter.transform(input.data);
  const output = adapter.outputSchema.safeParse(out);
  if (!output.success) throw new Error('fallback-output-invalid');
  return output.data;
}

const counterInputSchema = z.object({ prompt: z.string() }).passthrough();

const multipleChoiceOutputSchema = z.object({
  question: z.string(),
  options: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        correct: z.boolean(),
      }),
    )
    .min(2),
});

export const communityCounterToMultipleChoice: FallbackAdapter = {
  inputSchema: counterInputSchema,
  outputSchema: multipleChoiceOutputSchema,
  transform: (config: unknown) => {
    const prompt = (config as { prompt: string }).prompt;
    return {
      question: prompt,
      options: [
        { id: 'a', text: 'OK', correct: true },
        { id: 'b', text: 'Skip', correct: false },
      ],
    };
  },
};

export const FALLBACK_ADAPTERS: Record<string, FallbackAdapter> = {
  'community.example.counter': communityCounterToMultipleChoice,
};
