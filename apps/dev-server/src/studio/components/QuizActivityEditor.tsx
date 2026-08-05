import { useEffect, useState } from 'react';
import { Button, Input, RadioGroup, RadioGroupItem, Textarea } from '@open-edu/design-system';
import { Check } from 'lucide-react';
import { useTranslation } from '@open-edu/i18n';
import type { StudioApi } from '../studioApi.js';

interface OptionDraft {
  id: string;
  text: string;
}

function freshOption(prefix: string, text: string): OptionDraft {
  return { id: `${prefix}-${Math.random().toString(36).slice(2, 7)}`, text };
}

function serializeQuiz(
  question: string,
  options: OptionDraft[],
  correctIndex: number | null,
): string {
  return JSON.stringify(
    {
      type: 'quiz',
      question,
      options: options.map((option, index) => ({
        id: option.id,
        text: option.text,
        correct: index === correctIndex,
      })),
    },
    null,
    2,
  );
}

export function QuizActivityEditor({
  api,
  path,
  onSaved,
  onError,
}: {
  api: StudioApi;
  path: string;
  onSaved: () => void;
  onError: (message: string) => void;
}) {
  const { t } = useTranslation();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<OptionDraft[]>([
    freshOption('a', ''),
    freshOption('b', ''),
  ]);
  const [correctIndex, setCorrectIndex] = useState<number | null>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .readFile(path)
      .then((file) => {
        if (cancelled) return;
        try {
          const parsed = JSON.parse(file.content) as {
            question?: string;
            options?: Array<{ id?: string; text?: string; correct?: boolean }>;
          };
          setQuestion(parsed.question ?? '');
          const parsedOptions = parsed.options ?? [];
          if (parsedOptions.length > 0) {
            setOptions(
              parsedOptions.map((o) => ({ id: o.id ?? '', text: o.text ?? '' })) as OptionDraft[],
            );
            const correct = parsedOptions.findIndex((o) => o.correct === true);
            setCorrectIndex(correct >= 0 ? correct : null);
          }
        } catch {
          // keep defaults on unparseable content
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!cancelled) onError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [api, path, onError]);

  const handleAddOption = () => {
    setOptions((prev) => [...prev, freshOption('opt', '')]);
  };

  const handleOptionText = (index: number, text: string) => {
    setOptions((prev) => prev.map((o, i) => (i === index ? { ...o, text } : o)));
  };

  const handleCorrect = (value: string) => {
    setCorrectIndex(Number(value));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const content = serializeQuiz(question, options, correctIndex);
      await api.writeFile(path, content);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
      onSaved();
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="p-6 text-sm">…</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <label className="text-on-surface block text-sm font-medium">
        {t('studio.editor.quiz.questionLabel')}
        <Textarea
          className="mt-2"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          aria-label={t('studio.editor.quiz.questionLabel')}
        />
      </label>

      <fieldset className="space-y-2">
        <legend className="text-on-surface mb-2 text-sm font-medium">
          {t('studio.editor.quiz.optionsLabel')}
        </legend>
        <RadioGroup
          value={correctIndex != null ? String(correctIndex) : undefined}
          onValueChange={handleCorrect}
        >
          {options.map((option, index) => (
            <div
              key={option.id}
              className="border-outline-variant bg-surface flex items-center gap-2 rounded-lg border px-3 py-2"
            >
              <RadioGroupItem
                value={String(index)}
                id={`option-${index}`}
                aria-label={t('studio.editor.quiz.option', { number: String(index + 1) })}
              />
              <Input
                className="flex-1"
                value={option.text}
                onChange={(e) => handleOptionText(index, e.target.value)}
                aria-label={t('studio.editor.quiz.option', { number: String(index + 1) })}
                placeholder={t('studio.editor.quiz.option', { number: String(index + 1) })}
              />
              {correctIndex === index ? (
                <Check className="text-primary h-4 w-4" aria-hidden="true" />
              ) : null}
            </div>
          ))}
        </RadioGroup>
      </fieldset>

      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={handleAddOption}>
          {t('studio.editor.quiz.addOption')}
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={() => void handleSave()}
          disabled={saving || correctIndex === null}
        >
          {t('studio.editor.save')}
        </Button>
        {correctIndex === null ? (
          <span className="text-error text-sm">{t('studio.editor.quiz.noCorrectSelected')}</span>
        ) : null}
        {saved ? (
          <span className="text-on-surface-variant text-sm">{t('studio.editor.saved')}</span>
        ) : null}
      </div>
    </div>
  );
}
