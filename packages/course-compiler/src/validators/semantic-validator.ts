import type { CourseModel, CompilerDiagnostic } from '../schemas/index.js';
import { AnimationConfigSchema } from '@open-edu/schemas';

export function validateCourseModel(model: CourseModel): CompilerDiagnostic[] {
  const diagnostics: CompilerDiagnostic[] = [];

  validateDuplicateIds(model, diagnostics);
  validateRequiredFields(model, diagnostics);
  validateCrossReferences(model, diagnostics);
  validateDependencyLoops(model, diagnostics);
  validateQuizStructure(model, diagnostics);
  validateEmptyContent(model, diagnostics);
  validateAssets(model, diagnostics);
  validateAnimationConfigs(model, diagnostics);

  return diagnostics;
}

function addDiag(
  diagnostics: CompilerDiagnostic[],
  severity: 'error' | 'warning' | 'info',
  message: string,
  code: string,
  hint?: string,
) {
  diagnostics.push({ severity, message, code, hint });
}

function validateDuplicateIds(model: CourseModel, diagnostics: CompilerDiagnostic[]) {
  const moduleIdCount = new Map<string, number>();
  const lessonKeyCount = new Map<string, number>();
  const quizIdCount = new Map<string, number>();

  for (const mod of model.modules) {
    moduleIdCount.set(mod.id, (moduleIdCount.get(mod.id) ?? 0) + 1);

    for (const lesson of mod.lessons) {
      const lessonKey = `${mod.id}:${lesson.id}`;
      lessonKeyCount.set(lessonKey, (lessonKeyCount.get(lessonKey) ?? 0) + 1);

      if (lesson.quiz) {
        quizIdCount.set(lesson.quiz.id, (quizIdCount.get(lesson.quiz.id) ?? 0) + 1);
      }
    }
  }

  for (const [id, count] of moduleIdCount) {
    if (count > 1) {
      addDiag(
        diagnostics,
        'error',
        `Duplicate module ID: "${id}"`,
        'DUPLICATE_MODULE_ID',
        `Rename one of the modules with id "${id}"`,
      );
    }
  }

  for (const [key, count] of lessonKeyCount) {
    if (count > 1) {
      addDiag(
        diagnostics,
        'error',
        `Duplicate lesson ID within module: "${key}"`,
        'DUPLICATE_LESSON_ID',
        `Rename one of the lessons`,
      );
    }
  }

  for (const [id, count] of quizIdCount) {
    if (count > 1) {
      addDiag(
        diagnostics,
        'error',
        `Duplicate quiz ID: "${id}"`,
        'DUPLICATE_QUIZ_ID',
        `Rename one of the quizzes with id "${id}"`,
      );
    }
  }
}

function validateRequiredFields(model: CourseModel, diagnostics: CompilerDiagnostic[]) {
  for (const mod of model.modules) {
    if (!mod.title || mod.title.trim() === '') {
      addDiag(diagnostics, 'error', `Module "${mod.id}" is missing a title`, 'MISSING_TITLE');
    }

    for (const lesson of mod.lessons) {
      if (!lesson.title || lesson.title.trim() === '') {
        addDiag(
          diagnostics,
          'error',
          `Lesson "${lesson.id}" in module "${mod.id}" is missing a title`,
          'MISSING_TITLE',
        );
      }

      if (!lesson.objectives || lesson.objectives.length === 0) {
        addDiag(
          diagnostics,
          'warning',
          `Lesson "${lesson.id}" in module "${mod.id}" has no learning objectives`,
          'MISSING_OBJECTIVES',
          'Add at least one learning objective to this lesson',
        );
      }

      if (lesson.quiz) {
        if (!lesson.quiz.questions || lesson.quiz.questions.length === 0) {
          addDiag(
            diagnostics,
            'error',
            `Quiz "${lesson.quiz.id}" in lesson "${lesson.id}" has no questions`,
            'EMPTY_QUIZ',
            'Add at least one question to the quiz',
          );
        }

        for (const question of lesson.quiz.questions) {
          const prompt = question.type === 'fill-blank' ? question.template : question.prompt;
          if (!prompt || prompt.trim() === '') {
            addDiag(
              diagnostics,
              'error',
              `Question "${question.id}" in quiz "${lesson.quiz.id}" has no prompt`,
              'MISSING_QUESTION_PROMPT',
            );
          }
        }
      }
    }
  }
}

function validateCrossReferences(model: CourseModel, diagnostics: CompilerDiagnostic[]) {
  const moduleIds = new Set(model.modules.map((m) => m.id));

  for (const mod of model.modules) {
    if (mod.prerequisites) {
      for (const prereq of mod.prerequisites) {
        if (!moduleIds.has(prereq)) {
          addDiag(
            diagnostics,
            'error',
            `Module "${mod.id}" references prerequisite "${prereq}" which does not exist`,
            'BROKEN_PREREQUISITE',
            `Create a module with id "${prereq}" or remove this prerequisite`,
          );
        }
      }
    }
  }
}

function validateDependencyLoops(model: CourseModel, diagnostics: CompilerDiagnostic[]) {
  const moduleMap = new Map(model.modules.map((m) => [m.id, m.prerequisites ?? []]));

  function hasCycle(node: string, visited: Set<string>, stack: Set<string>): boolean {
    if (stack.has(node)) return true;
    if (visited.has(node)) return false;

    visited.add(node);
    stack.add(node);

    const deps = moduleMap.get(node) ?? [];
    for (const dep of deps) {
      if (hasCycle(dep, visited, stack)) return true;
    }

    stack.delete(node);
    return false;
  }

  for (const [id] of moduleMap) {
    const visited = new Set<string>();
    const stack = new Set<string>();
    if (hasCycle(id, visited, stack)) {
      addDiag(
        diagnostics,
        'error',
        `Circular dependency detected involving module "${id}"`,
        'CYCLE_DETECTED',
        'Remove the circular prerequisite chain',
      );
      break;
    }
  }
}

function validateQuizStructure(model: CourseModel, diagnostics: CompilerDiagnostic[]) {
  for (const mod of model.modules) {
    for (const lesson of mod.lessons) {
      if (!lesson.quiz) continue;

      for (const question of lesson.quiz.questions) {
        if (question.type === 'multiple-choice') {
          if (!question.options || question.options.length < 2) {
            addDiag(
              diagnostics,
              'error',
              `Multiple-choice question "${question.id}" in quiz "${lesson.quiz.id}" has fewer than 2 options`,
              'INVALID_QUESTION_OPTIONS',
              'Add at least 2 options to the multiple-choice question',
            );
          }
          const hasCorrect = question.options.some((o) => o.correct);
          if (!hasCorrect) {
            addDiag(
              diagnostics,
              'warning',
              `Multiple-choice question "${question.id}" in quiz "${lesson.quiz.id}" has no correct option marked`,
              'MISSING_CORRECT_OPTION',
              'Mark at least one option as correct',
            );
          }
        }
      }
    }
  }
}

function validateEmptyContent(model: CourseModel, diagnostics: CompilerDiagnostic[]) {
  for (const mod of model.modules) {
    if (!mod.lessons || mod.lessons.length === 0) {
      addDiag(
        diagnostics,
        'error',
        `Module "${mod.id}" has no lessons`,
        'EMPTY_MODULE',
        'Add at least one lesson to this module',
      );
    }

    for (const lesson of mod.lessons) {
      if (
        (!lesson.content || lesson.content.trim() === '') &&
        (!lesson.activities || lesson.activities.length === 0)
      ) {
        addDiag(
          diagnostics,
          'warning',
          `Lesson "${lesson.id}" in module "${mod.id}" has no content and no activities`,
          'EMPTY_LESSON',
          'Add lesson content or activities',
        );
      }
    }
  }
}

function validateAssets(model: CourseModel, diagnostics: CompilerDiagnostic[]) {
  for (const mod of model.modules) {
    for (const lesson of mod.lessons) {
      if (!lesson.assets) continue;
      for (const asset of lesson.assets) {
        if (asset.placeholderGenerated) {
          addDiag(
            diagnostics,
            'info',
            `Asset "${asset.id}" at "${asset.path}" is a generated placeholder`,
            'PLACEHOLDER_ASSET',
            'Replace the placeholder with the actual asset file',
          );
        }
      }
    }
  }
}

function normalizeAssetPath(path: string): string {
  return path
    .replace(/\\/g, '/')
    .replace(/^\.?\//, '')
    .replace(/^assets\//, '');
}

function validateAnimationConfigs(model: CourseModel, diagnostics: CompilerDiagnostic[]) {
  for (const mod of model.modules) {
    for (const lesson of mod.lessons) {
      const activities = lesson.activities ?? [];
      for (const activity of activities) {
        if (activity.type !== 'widget') continue;
        const animation = activity.config?.animation;
        if (animation === undefined) continue;

        const parsed = AnimationConfigSchema.safeParse(animation);
        if (!parsed.success) {
          addDiag(
            diagnostics,
            'error',
            `Widget activity "${activity.id}" has an invalid animation config`,
            'INVALID_ANIMATION_CONFIG',
            `Invalid fields: ${parsed.error.issues
              .map((issue) => issue.path.join('.'))
              .filter(Boolean)
              .join(', ')}`,
          );
          continue;
        }

        const src = parsed.data.src;
        if (src && lesson.assets && lesson.assets.length > 0) {
          const normalizedSrc = normalizeAssetPath(src);
          const declared = lesson.assets.some(
            (asset) => normalizeAssetPath(asset.path) === normalizedSrc,
          );
          if (!declared) {
            addDiag(
              diagnostics,
              'warning',
              `Animation "${src}" in widget activity "${activity.id}" is not declared in lesson assets`,
              'UNDECLARED_ANIMATION_ASSET',
              'Declare the asset in the lesson assets or place it under assets/',
            );
          }
        }
      }
    }
  }
}
