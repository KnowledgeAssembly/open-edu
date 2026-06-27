import { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';
import type { WidgetDefinition } from '../../types';
import { ThemedButton } from '../../themed-button';
import { useObserveMode } from '../../use-observe-mode';

const questionSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string()).min(2),
  correctIndex: z.number().int().min(0),
});

const storyQuestionSchema = z
  .object({
    scenario: z.string().min(1).optional(),
    story: z.string().min(1).optional(),
    questions: z.array(questionSchema).min(1),
    visual: z.string().optional(),
    interactive: z.boolean().optional().default(false),
  })
  .refine((data) => data.scenario || data.story, {
    message: 'Either scenario or story field is required',
  });

function StoryQuestionComponent(props: {
  nodeId: string;
  config: Record<string, unknown>;
  emitInteraction: (data: Record<string, unknown>) => void;
  complete: (score?: number) => void;
}) {
  const { config: rawConfig, emitInteraction, complete } = props;

  const parsed = storyQuestionSchema.safeParse(rawConfig);

  const [submitted, setSubmitted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selections, setSelections] = useState<(number | null)[]>([]);
  const [responses, setResponses] = useState<{ correct: boolean }[]>([]);

  const content = parsed.success ? parsed.data : null;
  const questionCount = content?.questions.length ?? 0;

  const story = content?.scenario ?? content?.story ?? '';
  const visual = content?.visual;
  const isInteractive = content?.interactive ?? false;

  useEffect(() => {
    if (questionCount > 0) {
      setSelections(new Array(questionCount).fill(null));
    }
  }, [questionCount]);

  const { handleAcknowledge: handleObserveAcknowledge, showAcknowledgeButton } = useObserveMode({
    isObserve: parsed.success && !isInteractive,
    onComplete: complete,
    onInteract: emitInteraction,
    widgetId: 'open-edu.story-question',
  });

  const handleSelect = useCallback(
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

  const handleNext = useCallback(() => {
    if (!content) return;
    const currentSelection = selections[currentIndex];
    if (currentSelection === null || currentSelection === undefined) return;

    const question = content.questions[currentIndex]!;
    if (!question) return;
    const isCorrect = currentSelection === question.correctIndex;

    const newResponses = [...responses, { correct: isCorrect }];
    setResponses(newResponses);

    if (currentIndex < content.questions.length - 1) {
      emitInteraction({
        type: 'widget.interaction',
        widgetId: 'open-edu.story-question',
        action: 'answer',
        questionIndex: currentIndex,
        selectedIndex: currentSelection,
        correct: isCorrect,
      });
      setCurrentIndex((i) => i + 1);
    } else {
      const correctCount = newResponses.filter((r) => r.correct).length;
      const totalQuestions = content.questions.length;
      const accuracy = correctCount / totalQuestions;
      emitInteraction({
        type: 'widget.interaction',
        widgetId: 'open-edu.story-question',
        action: 'submit',
        responses: newResponses,
        correctCount,
        totalQuestions,
        accuracy,
      });
      complete(accuracy * 100);
      setSubmitted(true);
    }
  }, [content, selections, currentIndex, responses, emitInteraction, complete]);

  if (!parsed.success) {
    return (
      <div
        role="alert"
        data-testid="widget-config-error"
        className="rounded-lg border border-error bg-error/10 p-lg text-on-surface"
      >
        <p className="font-semibold text-error">Invalid story question configuration.</p>
        <p className="mt-xs text-sm text-on-surface/70">
          Please check that your story has a scenario or story field and at least one question.
        </p>
      </div>
    );
  }

  const { questions } = parsed.data;

  if (!isInteractive) {
    const question = questions[0]!;

    return (
      <div data-testid="story-question-observe">
        <article aria-label={visual ? `${visual} Story` : 'Story'}>
          {visual && <span aria-hidden="true">{visual} </span>}
          <p>{story}</p>
        </article>
        <fieldset>
          <legend>{question.question}</legend>
          {question.options.map((opt, idx) => (
            <label key={idx} style={{ display: 'block', margin: '0.5em 0' }}>
              <input
                type="radio"
                name="sq-observe"
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
          <ThemedButton variant="primary" onClick={handleObserveAcknowledge}>
            Acknowledge
          </ThemedButton>
        )}
        {!showAcknowledgeButton && (
          <div role="status" aria-live="assertive" data-testid="observe-complete">
            <p>Content acknowledged.</p>
          </div>
        )}
      </div>
    );
  }

  if (submitted) {
    const correctCount = responses.filter((r) => r.correct).length;
    const totalQuestions = questions.length;

    return (
      <div data-testid="story-question">
        <article aria-label={visual ? `${visual} Story` : 'Story'}>
          {visual && <span aria-hidden="true">{visual} </span>}
          <p>{story}</p>
        </article>
        <div role="status" aria-live="assertive" data-testid="story-result">
          <p>
            You got {correctCount} of {totalQuestions} correct.
          </p>
        </div>
      </div>
    );
  }

  const question = questions[currentIndex]!;
  const isLastQuestion = currentIndex === questions.length - 1;
  const currentSelection = selections[currentIndex];
  const canAdvance = currentSelection !== null && currentSelection !== undefined;

  return (
    <div data-testid="story-question">
      <article aria-label={visual ? `${visual} Story` : 'Story'}>
        {visual && <span aria-hidden="true">{visual} </span>}
        <p>{story}</p>
      </article>
      <fieldset>
        <legend>{question.question}</legend>
        {question.options.map((opt, idx) => (
          <label key={idx} style={{ display: 'block', margin: '0.5em 0' }}>
            <input
              type="radio"
              name={`sq-option-${currentIndex}`}
              value={idx}
              checked={currentSelection === idx}
              onChange={() => handleSelect(idx)}
              disabled={submitted}
              aria-label={opt}
            />{' '}
            {opt}
          </label>
        ))}
      </fieldset>
      <ThemedButton variant="primary" onClick={handleNext} disabled={!canAdvance}>
        {isLastQuestion ? 'Submit' : 'Next'}
      </ThemedButton>
    </div>
  );
}

const StoryQuestionWidget: WidgetDefinition = {
  id: 'open-edu.story-question',
  version: '0.1.0',
  render: StoryQuestionComponent,
};

export { StoryQuestionWidget as storyQuestion };
export default StoryQuestionWidget;
