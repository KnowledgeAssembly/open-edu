import { parseMarkdown } from './markdown-ast.js';
import { parseSemantic } from './semantic-parser.js';
import type { CourseModel, CompilerDiagnostic } from '../schemas/index.js';

export function parseCourseSpec(markdown: string): {
  model: CourseModel | null;
  diagnostics: CompilerDiagnostic[];
} {
  const { ast, frontmatter } = parseMarkdown(markdown);
  return parseSemantic({ ast, frontmatter });
}

export * from './markdown-ast.js';
export * from './semantic-parser.js';
