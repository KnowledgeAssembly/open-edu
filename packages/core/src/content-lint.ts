import type { LoadedPackage, LoadedNode } from './types.js';

export interface LintWarning {
  file: string;
  message: string;
  detail?: string;
}

export interface LintResult {
  warnings: LintWarning[];
  errors: LintWarning[];
}

const HEADING_RE = /^(#{1,6})\s/gm;

function checkHeadingStructure(node: LoadedNode): LintWarning[] {
  const warnings: LintWarning[] = [];
  const matches: { level: number; index: number }[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(HEADING_RE.source, 'gm');

  while ((m = re.exec(node.content)) !== null) {
    const level = m[1]!.length;
    matches.push({ level, index: m.index });
  }

  if (matches.length === 0) {
    warnings.push({
      file: node.relativePath,
      message: 'Document has no heading structure',
      detail: 'Add at least one heading (#, ##, etc.) to the document',
    });
    return warnings;
  }

  const first = matches[0]!;
  if (first.level !== 1) {
    warnings.push({
      file: node.relativePath,
      message: 'Document does not start with an H1 heading',
      detail: `First heading is H${first.level} but should be H1`,
    });
  }

  for (let i = 1; i < matches.length; i++) {
    const prev = matches[i - 1]!.level;
    const curr = matches[i]!.level;
    if (curr > prev + 1) {
      warnings.push({
        file: node.relativePath,
        message: `Heading level skipped: H${prev} to H${curr}`,
        detail: `Change heading to H${prev + 1} or add intermediate headings`,
      });
    }
  }

  return warnings;
}

function checkQuiz(node: LoadedNode): LintWarning[] {
  if (node.node.type !== 'quiz') return [];
  const warnings: LintWarning[] = [];
  const quiz = node.node;

  const allCorrect = quiz.options.every((o) => o.correct);
  if (allCorrect) {
    warnings.push({
      file: node.relativePath,
      message: 'All quiz options are marked correct',
      detail: 'A quiz should have at least one incorrect option to be meaningful',
    });
  }

  const hasExplanatoryText = quiz.options.some((o) => o.text.length > 60);
  if (!hasExplanatoryText) {
    warnings.push({
      file: node.relativePath,
      message: 'Quiz has no explanation-like feedback in options',
      detail:
        'Consider adding explanatory text to option descriptions (text > 60 chars) to help learners understand each choice',
    });
  }

  return warnings;
}

function checkReflection(node: LoadedNode): LintWarning[] {
  if (node.node.type !== 'reflection') return [];
  const warnings: LintWarning[] = [];

  if (node.node.prompt.length < 20) {
    warnings.push({
      file: node.relativePath,
      message: 'Reflection prompt is too short',
      detail: `Prompt (${node.node.prompt.length} chars): "${node.node.prompt}" — minimum recommended length is 20 characters`,
    });
  }

  return warnings;
}

function checkReachability(pkg: LoadedPackage): LintWarning[] {
  const warnings: LintWarning[] = [];
  if (!pkg.workflow) return warnings;

  const routing = pkg.workflow.routing;
  const entry = pkg.manifest.entry;

  const visited = new Set<string>();
  const queue = [entry];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    const route = routing[current];
    if (!route) continue;

    if ('onComplete' in route && route.onComplete && route.onComplete !== 'COMPLETED') {
      queue.push(route.onComplete);
    }

    if ('conditions' in route && Array.isArray(route.conditions)) {
      for (const cond of route.conditions) {
        if (cond.then && cond.then !== 'COMPLETED') {
          queue.push(cond.then);
        }
      }
    }
  }

  for (const routeKey of Object.keys(routing)) {
    if (!visited.has(routeKey)) {
      warnings.push({
        file: 'workflow.json',
        message: `Workflow node "${routeKey}" is unreachable from entry "${entry}"`,
        detail: `Add a route to "${routeKey}" from an existing reachable node or remove it if unused`,
      });
    }
  }

  return warnings;
}

export function lintPackage(pkg: LoadedPackage): LintResult {
  const warnings: LintWarning[] = [];
  const errors: LintWarning[] = [];

  for (const node of pkg.nodes) {
    if (node.node.type === 'lesson' || node.content) {
      const headingIssues = checkHeadingStructure(node);
      warnings.push(...headingIssues);
    }

    const quizIssues = checkQuiz(node);
    warnings.push(...quizIssues);

    const reflectionIssues = checkReflection(node);
    warnings.push(...reflectionIssues);
  }

  if (pkg.workflow) {
    const reachabilityIssues = checkReachability(pkg);
    warnings.push(...reachabilityIssues);
  }

  return { warnings, errors };
}
