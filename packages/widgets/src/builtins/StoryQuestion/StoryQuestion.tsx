import { useState, useEffect, useCallback, useMemo } from 'react';
import { z } from 'zod';
import type { WidgetDefinitionV2 } from '../../types';
import { LearningIntent } from '../../metadata/learning-intents';
import { Button } from '@open-edu/design-system';
import { useObserveMode } from '../../use-observe-mode';

const questionSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string()).min(2),
  correctIndex: z.number().int().min(0),
  explanation: z.string().optional(),
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

type FeedbackState = {
  selectedIndex: number;
  correctIndex: number;
  isCorrect: boolean;
  explanation?: string;
} | null;

type ResponseRecord = {
  correct: boolean;
  selectedIndex: number;
};

const StoryQuestionStateSchema = z.object({
  submitted: z.boolean(),
  currentIndex: z.number(),
  selections: z.array(z.number().nullable()),
  responses: z.array(z.object({ correct: z.boolean(), selectedIndex: z.number() })),
  feedback: z
    .object({
      selectedIndex: z.number(),
      correctIndex: z.number(),
      isCorrect: z.boolean(),
      explanation: z.string().optional(),
    })
    .nullable(),
});

function StoryQuestionComponent(props: {
  nodeId: string;
  config: Record<string, unknown>;
  emitInteraction: (data: Record<string, unknown>) => void;
  complete: (score?: number, state?: unknown) => void;
  storedState?: unknown;
}) {
  const { config: rawConfig, emitInteraction, complete, storedState } = props;

  const parsed = storyQuestionSchema.safeParse(rawConfig);

  const parsedState = useMemo(() => {
    const result = StoryQuestionStateSchema.safeParse(storedState);
    return result.success ? result.data : null;
  }, [storedState]);

  const [submitted, setSubmitted] = useState(parsedState?.submitted ?? false);
  const [currentIndex, setCurrentIndex] = useState(parsedState?.currentIndex ?? 0);
  const [selections, setSelections] = useState<(number | null)[]>(parsedState?.selections ?? []);
  const [responses, setResponses] = useState<ResponseRecord[]>(parsedState?.responses ?? []);
  const [feedback, setFeedback] = useState<FeedbackState>(parsedState?.feedback ?? null);

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
    widgetId: 'core.story-question',
  });

  const handleSelect = useCallback(
    (optionIndex: number) => {
      if (submitted || feedback) return;
      setSelections((prev) => {
        const next = [...prev];
        next[currentIndex] = optionIndex;
        return next;
      });
    },
    [submitted, feedback, currentIndex],
  );

  const handleNext = useCallback(() => {
    if (!content) return;
    const currentSelection = selections[currentIndex];
    if (currentSelection === null || currentSelection === undefined) return;

    const question = content.questions[currentIndex]!;
    if (!question) return;
    const isCorrect = currentSelection === question.correctIndex;

    const newResponses = [...responses, { correct: isCorrect, selectedIndex: currentSelection }];
    setResponses(newResponses);

    emitInteraction({
      type: 'widget.interaction',
      widgetId: 'core.story-question',
      action: 'answer',
      questionIndex: currentIndex,
      selectedIndex: currentSelection,
      correct: isCorrect,
    });

    setFeedback({
      selectedIndex: currentSelection,
      correctIndex: question.correctIndex,
      isCorrect,
      explanation: question.explanation,
    });
  }, [content, selections, currentIndex, responses, emitInteraction]);

  const handleAdvanceAfterFeedback = useCallback(() => {
    if (!content) return;
    setFeedback(null);

    if (currentIndex < content.questions.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      const correctCount = responses.filter((r) => r.correct).length;
      const totalQuestions = content.questions.length;
      const accuracy = correctCount / totalQuestions;
      emitInteraction({
        type: 'widget.interaction',
        widgetId: 'core.story-question',
        action: 'submit',
        responses,
        correctCount,
        totalQuestions,
        accuracy,
      });
      complete(accuracy * 100, {
        submitted: true,
        currentIndex,
        selections,
        responses,
        feedback: null,
      });
      setSubmitted(true);
    }
  }, [content, currentIndex, selections, responses, emitInteraction, complete]);

  if (!parsed.success) {
    return (
      <div
        role="alert"
        data-testid="widget-config-error"
        className="border-error bg-error/10 p-lg text-on-surface rounded-lg border"
      >
        <p className="text-error font-semibold">Invalid story question configuration.</p>
        <p className="mt-xs text-on-surface/70 text-sm">
          Please check that your story has a scenario or story field and at least one question.
        </p>
      </div>
    );
  }

  const { questions } = parsed.data;

  const storyCallout = (
    <div className="bg-primary-container/20 p-md border-primary mb-lg rounded-lg border-l-4">
      {visual && (
        <span className="mr-sm text-3xl" aria-hidden="true">
          {visual}
        </span>
      )}
      <article aria-label={visual ? `${visual} Story` : 'Story'}>
        <p>{story}</p>
      </article>
    </div>
  );

  if (!isInteractive) {
    const question = questions[0]!;

    return (
      <div data-testid="story-question-observe">
        {storyCallout}
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
                aria-label={idx === question.correctIndex ? `Correct answer: ${opt}` : opt}
              />{' '}
              {opt}
              {idx === question.correctIndex && <span aria-hidden="true"> ✓</span>}
            </label>
          ))}
        </fieldset>
        {showAcknowledgeButton && (
          <Button variant="default" onClick={handleObserveAcknowledge}>
            Acknowledge
          </Button>
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
        {storyCallout}
        <div
          role="status"
          aria-live="assertive"
          data-testid="story-result"
          className="mb-lg p-md bg-surface-container border-outline-variant rounded-lg border"
        >
          <p className="text-lg font-semibold">
            You got {correctCount} of {totalQuestions} correct.
          </p>
        </div>
        {questions.map((q, qIdx) => {
          const response = responses[qIdx];
          if (!response) return null;
          return (
            <div key={qIdx} className="mb-lg">
              <p className="mb-xs font-semibold">
                Question {qIdx + 1}: {q.question}
              </p>
              {q.options.map((opt, optIdx) => {
                const isSelected = response.selectedIndex === optIdx;
                const isCorrectOption = optIdx === q.correctIndex;
                const isWrongSelected = isSelected && !isCorrectOption;

                return (
                  <div
                    key={optIdx}
                    className={`my-xs p-sm rounded-lg ${
                      isCorrectOption
                        ? 'border-success border-2 opacity-100'
                        : isWrongSelected
                          ? 'border-error border-2 opacity-60'
                          : 'opacity-60'
                    }`}
                  >
                    {isCorrectOption && <span aria-hidden="true">✓ </span>}
                    {isWrongSelected && <span aria-hidden="true">✗ </span>}
                    {opt}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  }

  const question = questions[currentIndex]!;
  const isLastQuestion = currentIndex === questions.length - 1;
  const currentSelection = selections[currentIndex];
  const canAdvance = currentSelection !== null && currentSelection !== undefined;
  const hasFeedback = feedback !== null;

  return (
    <div data-testid="story-question">
      {storyCallout}
      {questions.length > 1 && (
        <p className="text-on-surface/70 mb-sm text-sm" data-testid="question-progress">
          Question {currentIndex + 1} of {questions.length}
        </p>
      )}
      <fieldset>
        <legend>{question.question}</legend>
        {question.options.map((opt, idx) => {
          const isSelected = currentSelection === idx;
          const isCorrectOption = idx === question.correctIndex;
          const showResult = hasFeedback;
          const isWrongSelected = showResult && isSelected && !isCorrectOption;
          const isCorrectShown = showResult && isCorrectOption;

          let optionClasses = '';
          if (showResult) {
            if (isCorrectOption) {
              optionClasses = 'opacity-100 border-2 border-success rounded-lg p-sm';
            } else if (isSelected) {
              optionClasses = 'opacity-60 border-2 border-error rounded-lg p-sm';
            } else {
              optionClasses = 'opacity-60';
            }
          }

          return (
            <label
              key={idx}
              className={`my-xs block ${optionClasses}`}
              data-testid={isCorrectShown ? 'correct-option' : undefined}
            >
              <input
                type="radio"
                name={`sq-option-${currentIndex}`}
                value={idx}
                checked={isSelected}
                onChange={() => handleSelect(idx)}
                disabled={showResult}
                aria-label={opt}
              />{' '}
              {showResult && isCorrectOption && <span aria-hidden="true">✓ </span>}
              {showResult && isWrongSelected && <span aria-hidden="true">✗ </span>}
              {opt}
            </label>
          );
        })}
      </fieldset>

      {hasFeedback && feedback && (
        <div
          role="status"
          aria-live="assertive"
          data-testid="question-feedback"
          className="mt-md p-md border-outline-variant bg-surface-container rounded-lg border"
        >
          {feedback.isCorrect ? (
            <p className="text-success font-semibold">✓ Correct!</p>
          ) : (
            <div>
              <p className="text-error font-semibold">✗ Incorrect</p>
              <p className="mt-xs text-on-surface/70">
                The correct answer is: {question.options[feedback.correctIndex]}
              </p>
            </div>
          )}
          {feedback.explanation && (
            <p className="mt-sm text-on-surface/70">{feedback.explanation}</p>
          )}
        </div>
      )}

      <div className="mt-md">
        {hasFeedback ? (
          <Button
            variant="default"
            onClick={handleAdvanceAfterFeedback}
            data-testid="feedback-next"
          >
            {isLastQuestion ? 'See Results' : 'Next'}
          </Button>
        ) : (
          <Button variant="default" onClick={handleNext} disabled={!canAdvance}>
            {isLastQuestion ? 'Submit' : 'Next'}
          </Button>
        )}
      </div>
    </div>
  );
}

const StoryQuestionWidget: WidgetDefinitionV2 = {
  id: 'core.story-question',
  name: 'Story Question',
  description: 'Reading comprehension with story-based questions',
  domain: 'core',
  version: '0.1.0',
  render: StoryQuestionComponent,
  learningIntents: [LearningIntent.Assess, LearningIntent.Reflect],
  capabilities: {
    supportsKeyboard: true,
    supportsScreenReader: true,
    supportsHints: true,
    supportsRetry: true,
    supportsScoring: true,
    supportsTouch: true,
    supportsMouse: true,
    supportsAnalytics: true,
    supportsRewards: true,
    supportsAccessibility: true,
    supportsOffline: true,
    supportsObserveMode: true,
  },
  accessibility: {
    highContrast: true,
    keyboardOnly: true,
    screenReader: true,
    tts: true,
    captions: true,
    easyLanguage: true,
    focusManagement: true,
    ariaSupport: true,
  },
  analytics: {
    trackAttempts: true,
    trackCompletionTime: true,
    trackSuccessRate: true,
    trackHints: true,
    trackRetries: true,
  },
  reward: { completionXP: 10, confetti: true, achievement: 'first-story' },
  ai: {
    difficulty: 'medium',
    estimatedMinutes: 5,
    bloomsLevel: 'understand',
    cognitiveLoad: 'moderate',
    subjectTags: ['language', 'reading'],
    authoringPrompt: 'Create a story-based comprehension question',
    recommendedAge: [6, 14],
    readingLevel: 'grade-2',
    learningObjectives: [
      'Comprehend a short story and identify key details',
      'Distinguish between facts stated in the text and opinions',
      'Make simple inferences based on story context',
    ],
    commonMisconceptions: [
      'Selecting an answer without reading the full story',
      "Confusing the narrator's perspective with objective facts",
      'Choosing answers that are generally true but not supported by the text',
    ],
    generationHints: [
      'Keep stories under 150 words for focused comprehension',
      'Include a clear narrative with a beginning, middle, and end',
      'Make distractors plausible but clearly contradicted by the text',
    ],
    exampleConfigs: [
      {
        story: 'The cat sat on the mat. It was a sunny day.',
        questions: [
          {
            prompt: 'Where did the cat sit?',
            options: ['On the mat', 'On the rug', 'Under the table'],
            correct: 0,
          },
        ],
      },
    ],
  },
  icon: 'book-open',
  keywords: ['story', 'reading', 'comprehension', 'question'],
  status: 'stable',
};

export { StoryQuestionWidget as storyQuestion };
export default StoryQuestionWidget;
