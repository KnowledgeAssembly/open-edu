import { Badge } from '@open-edu/design-system';
import { MarkdownRenderer, RuntimeThemeProvider } from '@open-edu/runtime';
import { useTranslation } from '@open-edu/i18n';
import { Check } from 'lucide-react';
import { WidgetPreviewPanel } from '../../editor/WidgetPreviewPanel.js';
import { validateWidgetConfigForType } from '../../editor/WidgetValidator.js';
import { parseExerciseNode } from '../widgets/exerciseNode.js';
import type { DraftItem } from '../ai/types.js';

interface ParsedQuiz {
  question: string;
  options: Array<{ id: string; text: string; correct: boolean }>;
}

function parseQuiz(content: string): ParsedQuiz | null {
  try {
    const parsed = JSON.parse(content) as {
      question?: string;
      options?: Array<{ id?: string; text?: string; correct?: boolean }>;
    };
    if (typeof parsed.question !== 'string' || !Array.isArray(parsed.options)) return null;
    return {
      question: parsed.question,
      options: parsed.options.map((option, index) => ({
        id: option.id ?? String(index),
        text: option.text ?? '',
        correct: option.correct === true,
      })),
    };
  } catch {
    return null;
  }
}

function QuizDraftPreview({
  content,
  currentContent,
}: {
  content: string;
  currentContent?: string;
}) {
  const { t } = useTranslation();
  const draft = parseQuiz(content);
  const current = currentContent ? parseQuiz(currentContent) : null;

  if (!draft) {
    return (
      <pre className="text-on-surface-variant bg-surface border-outline-variant overflow-auto rounded-lg border p-4 text-xs">
        {content}
      </pre>
    );
  }

  const questionChanged = current !== null && current.question !== draft.question;

  return (
    <div className="bg-surface border-outline-variant space-y-3 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-on-surface text-sm font-medium">{draft.question}</p>
        {questionChanged ? (
          <Badge variant="outline" className="text-primary shrink-0">
            {t('studio.ai.item.questionChanged')}
          </Badge>
        ) : null}
      </div>
      <ul className="space-y-2">
        {draft.options.map((option, index) => {
          const currentOption = current?.options[index];
          const isNew = current === null || index >= current.options.length;
          const changed = !isNew && currentOption ? currentOption.text !== option.text : false;
          return (
            <li key={option.id}>
              <div
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                  isNew
                    ? 'border-primary bg-primary-container'
                    : changed
                      ? 'border-primary bg-surface'
                      : 'border-outline-variant bg-surface'
                }`}
              >
                <span className="text-on-surface-variant w-5 shrink-0">
                  {String.fromCharCode(65 + index)}.
                </span>
                <span className="text-on-surface flex-1">{option.text}</span>
                {option.correct ? (
                  <Check className="text-primary h-4 w-4 shrink-0" aria-hidden="true" />
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function ItemDraftPreview({
  item,
  currentContent,
}: {
  item: DraftItem;
  currentContent?: string;
}) {
  if (item.kind === 'lesson') {
    return (
      <div className="bg-surface border-outline-variant rounded-lg border p-4">
        <MarkdownRenderer content={item.content} />
      </div>
    );
  }

  if (item.kind === 'quiz') {
    return <QuizDraftPreview content={item.content} currentContent={currentContent} />;
  }

  const node = parseExerciseNode(item.content);
  if (!node) {
    return (
      <pre className="text-on-surface-variant bg-surface border-outline-variant overflow-auto rounded-lg border p-4 text-xs">
        {item.content}
      </pre>
    );
  }
  const validationErrors = validateWidgetConfigForType(node.widget, node.config);
  return (
    <RuntimeThemeProvider>
      <WidgetPreviewPanel
        widgetType={node.widget}
        widgetConfig={node.config}
        validationErrors={validationErrors}
      />
    </RuntimeThemeProvider>
  );
}
