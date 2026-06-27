import { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';
import type { WidgetDefinition } from '../../types';
import { ThemedButton } from '../../themed-button';
import { useObserveMode } from '../../use-observe-mode';

const optionSchema = z.object({
  id: z.string(),
  text: z.string(),
  correct: z.boolean().optional(),
});

const questionSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string()).min(2),
  correctIndex: z.number().int().min(0),
});

const legacyConfigSchema = z.object({
  prompt: z.string().min(1),
  options: z.array(optionSchema).min(1),
  explanation: z.string().optional(),
});

const multiConfigSchema = z.object({
  questions: z.array(questionSchema).min(1),
  interactive: z.boolean().optional().default(false),
});

function MultipleChoiceComponent(props: {
  nodeId: string;
  config: Record<string, unknown>;
  emitInteraction: (data: Record<string, unknown>) => void;
  complete: (score?: number) => void;
}) {
  const { config: rawConfig, emitInteraction, complete } = props;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selections, setSelections] = useState<(number | null)[]>([]);
  const [responses, setResponses] = useState<{ correct: boolean }[]>([]);

  const config: Record<string, unknown> = rawConfig || {};
  const hasPrompt = typeof config.prompt === 'string' && config.prompt.length > 0;
  const isLegacyMode = hasPrompt;

  const legacyParsed = legacyConfigSchema.safeParse(config);
  const multiParsed = multiConfigSchema.safeParse(config);

  const questionCount = multiParsed.success ? multiParsed.data.questions.length : 0;

  useEffect(() => {
    if (questionCount > 0) {
      setSelections(new Array(questionCount).fill(null));
    }
  }, [questionCount]);

  const isMultiInteractive = multiParsed.success && multiParsed.data.interactive;
  const isMultiObserve = multiParsed.success && !multiParsed.data.interactive;

  const { handleAcknowledge: handleObserveAcknowledge, showAcknowledgeButton } = useObserveMode({
    isObserve: isMultiObserve,
    onComplete: complete,
    onInteract: emitInteraction,
    widgetId: 'open-edu.multiple-choice',
  });

  const handleLegacySubmit = useCallback(() => {
    if (!selectedId || submitted || !legacyParsed.success) return;
    setSubmitted(true);
    const correctOption = legacyParsed.data.options.find((o) => o.correct);
    const isCorrect = selectedId === correctOption?.id;
    const score = isCorrect ? 100 : 0;
    emitInteraction({
      type: 'widget.interaction',
      widgetId: 'open-edu.multiple-choice',
      action: 'submit',
      selectedId,
      score,
    });
    complete(score);
  }, [selectedId, submitted, legacyParsed, emitInteraction, complete]);

  const handleMultiSelect = useCallback(
    (optionIndex: number) => {
      if (submitted) return;
      setSelections((prev) => {
        const next = [...prev];
        next[currentIndex] = optionIndex;
        return next;
      });
    },
    [submitted, currentIndex],
  );

  const handleMultiNext = useCallback(() => {
    if (!multiParsed.success) return;
    const currentSelection = selections[currentIndex];
    if (currentSelection === null || currentSelection === undefined) return;

    const question = multiParsed.data.questions[currentIndex];
    if (!question) return;
    const isCorrect = currentSelection === question.correctIndex;

    const newResponses = [...responses, { correct: isCorrect }];
    setResponses(newResponses);

    if (currentIndex < multiParsed.data.questions.length - 1) {
      emitInteraction({
        type: 'widget.interaction',
        widgetId: 'open-edu.multiple-choice',
        action: 'answer',
        questionIndex: currentIndex,
        selectedIndex: currentSelection,
        correct: isCorrect,
      });
      setCurrentIndex((i) => i + 1);
    } else {
      const correctCount = newResponses.filter((r) => r.correct).length;
      const totalQuestions = multiParsed.data.questions.length;
      const accuracy = correctCount / totalQuestions;
      emitInteraction({
        type: 'widget.interaction',
        widgetId: 'open-edu.multiple-choice',
        action: 'submit',
        responses: newResponses,
        correctCount,
        totalQuestions,
        accuracy,
      });
      complete(accuracy * 100);
      setSubmitted(true);
    }
  }, [multiParsed, selections, currentIndex, responses, emitInteraction, complete]);

  if (!legacyParsed.success && !multiParsed.success) {
    return (
      <div role="alert" data-testid="widget-config-error" className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md text-center">
        <p className="text-on-surface font-semibold">This activity could not be loaded.</p>
      </div>
    );
  }

  if (isLegacyMode && legacyParsed.success) {
    const config = legacyParsed.data;
    const correctOption = config.options.find((o) => o.correct);
    const isCorrect = submitted && selectedId === correctOption?.id;

    return (
      <div role="group" aria-label={config.prompt} data-testid="multiple-choice-practice">
        <p>{config.prompt}</p>
        {config.options.map((opt) => (
          <label key={opt.id} style={{ display: 'block', margin: '0.5em 0' }}>
            <input
              type="radio"
              name="practice-choice"
              value={opt.id}
              checked={selectedId === opt.id}
              onChange={() => !submitted && setSelectedId(opt.id)}
              disabled={submitted}
              aria-label={opt.text}
            />{' '}
            {opt.text}
          </label>
        ))}
        <ThemedButton variant="primary" onClick={handleLegacySubmit} disabled={!selectedId || submitted}>
          {submitted ? (isCorrect ? 'Correct!' : 'Incorrect') : 'Submit'}
        </ThemedButton>
        {submitted && config.explanation && <p role="status">{config.explanation}</p>}
      </div>
    );
  }

  if (multiParsed.success && isMultiObserve && showAcknowledgeButton) {
    const config = multiParsed.data;
    const question = config.questions[0]!;

    return (
      <div role="group" aria-label="Multiple choice activity" data-testid="multiple-choice-observe">
        <fieldset>
          <legend>{question.question}</legend>
          {question.options.map((opt, idx) => (
            <label key={idx} style={{ display: 'block', margin: '0.5em 0' }}>
              <input
                type="radio"
                name="mc-observe"
                value={idx}
                checked={idx === question.correctIndex}
                disabled
                aria-label={opt}
              />{' '}
              {opt}
              {idx === question.correctIndex && <span> ✓</span>}
            </label>
          ))}
        </fieldset>
        {showAcknowledgeButton && (
          <div className="flex items-center justify-center p-md border-t border-outline-variant mt-md">
            <ThemedButton variant="primary" onClick={handleObserveAcknowledge} data-testid="observe-acknowledge">
              Mark as seen ✓
            </ThemedButton>
          </div>
        )}
      </div>
    );
  }

  if (multiParsed.success && isMultiObserve && !showAcknowledgeButton) {
    const config = multiParsed.data;
    const question = config.questions[0]!;

    return (
      <div role="group" aria-label="Multiple choice activity" data-testid="multiple-choice-observe">
        <fieldset>
          <legend>{question.question}</legend>
          {question.options.map((opt, idx) => (
            <label key={idx} style={{ display: 'block', margin: '0.5em 0' }}>
              <input
                type="radio"
                name="mc-observe"
                value={idx}
                checked={idx === question.correctIndex}
                disabled
                aria-label={opt}
              />{' '}
              {opt}
              {idx === question.correctIndex && <span> ✓</span>}
            </label>
          ))}
        </fieldset>
        <div role="status" aria-live="assertive" data-testid="observe-complete">
          <p>Content acknowledged.</p>
        </div>
      </div>
    );
  }

  if (multiParsed.success && isMultiInteractive) {
    const config = multiParsed.data;
    const question = config.questions[currentIndex]!;
    const isLastQuestion = currentIndex === config.questions.length - 1;
    const currentSelection = selections[currentIndex];
    const canAdvance = currentSelection !== null && currentSelection !== undefined;

    if (submitted) {
      const correctCount = responses.filter((r) => r.correct).length;
      const totalQuestions = config.questions.length;

      return (
        <div role="group" aria-label="Multiple choice activity" data-testid="multiple-choice">
          <div role="status" aria-live="assertive" data-testid="multi-result">
            <p>
              You got {correctCount} of {totalQuestions} correct.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div role="group" aria-label="Multiple choice activity" data-testid="multiple-choice">
        <fieldset>
          <legend>{question.question}</legend>
          {question.options.map((opt, idx) => (
            <label key={idx} style={{ display: 'block', margin: '0.5em 0' }}>
              <input
                type="radio"
                name={`mc-option-${currentIndex}`}
                value={idx}
                checked={currentSelection === idx}
                onChange={() => handleMultiSelect(idx)}
                disabled={submitted}
                aria-label={opt}
              />{' '}
              {opt}
            </label>
          ))}
        </fieldset>
        <ThemedButton variant="primary" onClick={handleMultiNext} disabled={!canAdvance}>
          {isLastQuestion ? 'Submit' : 'Next'}
        </ThemedButton>
      </div>
    );
  }

  return null;
}

const MultipleChoiceWidget: WidgetDefinition = {
  id: 'open-edu.multiple-choice',
  version: '0.1.0',
  render: MultipleChoiceComponent,
};

const LegacyChoiceWidget: WidgetDefinition = {
  id: 'open-edu.multiple-choice-practice',
  version: '0.1.0',
  render: MultipleChoiceComponent,
};

export { MultipleChoiceWidget as multipleChoice };
export { LegacyChoiceWidget as multipleChoicePractice };
export default MultipleChoiceWidget;
