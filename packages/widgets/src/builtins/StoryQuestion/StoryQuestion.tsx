import { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';
import type { WidgetDefinition } from '../../types';

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

  useEffect(() => {
    if (!parsed.success) return;
    if (isInteractive || submitted) return;
    const timer = setTimeout(() => {
      emitInteraction({
        type: 'widget.interaction',
        widgetId: 'open-edu.story-question',
        action: 'observe',
        observed: true,
        correct: true,
      });
      complete(100);
      setSubmitted(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, [parsed.success, isInteractive, submitted, emitInteraction, complete]);

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
      <div role="alert" data-testid="widget-config-error">
        <p>Invalid story question configuration.</p>
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
        {submitted && (
          <div role="status" aria-live="assertive" data-testid="observe-complete">
            <p>Completed.</p>
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
      <button onClick={handleNext} disabled={!canAdvance}>
        {isLastQuestion ? 'Submit' : 'Next'}
      </button>
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
