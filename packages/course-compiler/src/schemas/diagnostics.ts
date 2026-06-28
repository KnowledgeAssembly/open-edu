import { z } from 'zod';

export const DiagnosticSeveritySchema = z.enum(['error', 'warning', 'info']);

export type DiagnosticSeverity = z.infer<typeof DiagnosticSeveritySchema>;

export const SourceLocationSchema = z.object({
  line: z.number(),
  column: z.number().optional(),
  offset: z.number().optional(),
  file: z.string().optional(),
});

export type SourceLocation = z.infer<typeof SourceLocationSchema>;

export const CompilerDiagnosticSchema = z.object({
  severity: DiagnosticSeveritySchema,
  message: z.string(),
  code: z.string().optional(),
  location: SourceLocationSchema.optional(),
  hint: z.string().optional(),
});

export type CompilerDiagnostic = z.infer<typeof CompilerDiagnosticSchema>;
