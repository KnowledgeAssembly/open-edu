import { useState, useEffect, useCallback, useMemo } from 'react';
import { z } from 'zod';
import type { WidgetDefinitionV2 } from '../../types';
import { LearningIntent } from '../../metadata/learning-intents';
import { Button } from '@open-edu/design-system';
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
  explanation: z.string().optional(),
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

type FeedbackState = {
  selectedIndex: number;
  correctIndex: number;
  isCorrect: boolean;
  explanation?: string;
} | null;

const MultipleChoiceStateSchema = z.object({
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

function MultipleChoiceComponent(props: {
  nodeId: string;
  config: Record<string, unknown>;
  emitInteraction: (data: Record<string, unknown>) => void;
  complete: (score?: number, state?: unknown) => void;
  storedState?: unknown;
}) {
  const { config: rawConfig, emitInteraction, complete, storedState } = props;

  const parsedState = useMemo(() => {
    const result = MultipleChoiceStateSchema.safeParse(storedState);
    return result.success ? result.data : null;
  }, [storedState]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(parsedState?.submitted ?? false);
  const [currentIndex, setCurrentIndex] = useState(parsedState?.currentIndex ?? 0);
  const [selections, setSelections] = useState<(number | null)[]>(parsedState?.selections ?? []);
  const [responses, setResponses] = useState<{ correct: boolean; selectedIndex: number }[]>(
    parsedState?.responses ?? [],
  );
  const [feedback, setFeedback] = useState<FeedbackState>(parsedState?.feedback ?? null);

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

  const isMultiObserve = multiParsed.success && !multiParsed.data.interactive;

  const { handleAcknowledge: handleObserveAcknowledge, showAcknowledgeButton } = useObserveMode({
    isObserve: isMultiObserve,
    onComplete: complete,
    onInteract: emitInteraction,
    widgetId: 'core.multiple-choice',
  });

  const handleLegacySubmit = useCallback(() => {
    if (!selectedId || submitted || !legacyParsed.success) return;
    setSubmitted(true);
    const correctOption = legacyParsed.data.options.find((o) => o.correct);
    const isCorrect = selectedId === correctOption?.id;
    const score = isCorrect ? 100 : 0;
    const selectedIdx = legacyParsed.data.options.findIndex((o) => o.id === selectedId);
    const correctIdx = legacyParsed.data.options.findIndex((o) => o.correct);
    emitInteraction({
      type: 'widget.interaction',
      widgetId: 'core.multiple-choice',
      action: 'submit',
      selectedId,
      score,
    });
    complete(score, {
      submitted: true,
      currentIndex: 0,
      selections: [selectedIdx],
      responses: [{ correct: isCorrect, selectedIndex: selectedIdx }],
      feedback: {
        selectedIndex: selectedIdx,
        correctIndex: correctIdx,
        isCorrect,
        explanation: legacyParsed.data.explanation,
      },
    });
  }, [selectedId, submitted, legacyParsed, emitInteraction, complete]);

  const handleMultiSelect = useCallback(
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

  const handleMultiNext = useCallback(() => {
    if (!multiParsed.success) return;
    const currentSelection = selections[currentIndex];
    if (currentSelection === null || currentSelection === undefined) return;

    const question = multiParsed.data.questions[currentIndex]!;
    if (!question) return;
    const isCorrect = currentSelection === question.correctIndex;

    const newResponses = [...responses, { correct: isCorrect, selectedIndex: currentSelection }];
    setResponses(newResponses);

    emitInteraction({
      type: 'widget.interaction',
      widgetId: 'core.multiple-choice',
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
  }, [multiParsed, selections, currentIndex, responses, emitInteraction]);

  const handleAdvanceAfterFeedback = useCallback(() => {
    if (!multiParsed.success) return;
    setFeedback(null);

    if (currentIndex < multiParsed.data.questions.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      const correctCount = responses.filter((r) => r.correct).length;
      const totalQuestions = multiParsed.data.questions.length;
      const accuracy = correctCount / totalQuestions;
      emitInteraction({
        type: 'widget.interaction',
        widgetId: 'core.multiple-choice',
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
  }, [multiParsed, currentIndex, selections, responses, emitInteraction, complete]);

  if (!legacyParsed.success && !multiParsed.success) {
    return (
      <div
        role="alert"
        data-testid="widget-config-error"
        className="border-outline-variant bg-surface-container-lowest p-md rounded-xl border text-center"
      >
        <p className="text-on-surface font-semibold">This activity could not be loaded.</p>
      </div>
    );
  }

  if (isLegacyMode && legacyParsed.success) {
    const cfg = legacyParsed.data;
    const correctOption = cfg.options.find((o) => o.correct);
    const isCorrect = submitted && selectedId === correctOption?.id;

    return (
      <div role="group" aria-label={cfg.prompt} data-testid="multiple-choice-practice">
        <p>{cfg.prompt}</p>
        {cfg.options.map((opt) => (
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
        <Button variant="default" onClick={handleLegacySubmit} disabled={!selectedId || submitted}>
          {submitted ? 'Submitted' : 'Submit'}
        </Button>
        {submitted && (
          <div role="status" aria-live="assertive" data-testid="feedback" className="mt-2">
            {isCorrect ? (
              <p className="text-success font-semibold">✓ Correct!</p>
            ) : (
              <p className="text-error font-semibold">✗ Incorrect</p>
            )}
          </div>
        )}
        {submitted && cfg.explanation && <p role="status">{cfg.explanation}</p>}
      </div>
    );
  }

  if (multiParsed.success) {
    const cfg = multiParsed.data;
    const question = cfg.questions[currentIndex]!;
    const isLastQuestion = currentIndex === cfg.questions.length - 1;
    const currentSelection = selections[currentIndex];
    const hasFeedback = feedback !== null;

    if (isMultiObserve && showAcknowledgeButton) {
      return (
        <div
          role="group"
          aria-label="Multiple choice activity"
          data-testid="multiple-choice-observe"
        >
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
                  aria-label={idx === question.correctIndex ? `Correct answer: ${opt}` : opt}
                />{' '}
                {opt}
                {idx === question.correctIndex && <span aria-hidden="true"> ✓</span>}
              </label>
            ))}
          </fieldset>
          {showAcknowledgeButton && (
            <div className="p-md border-outline-variant mt-md flex items-center justify-center border-t">
              <Button
                variant="default"
                onClick={handleObserveAcknowledge}
                data-testid="observe-acknowledge"
              >
                Mark as seen ✓
              </Button>
            </div>
          )}
        </div>
      );
    }

    if (isMultiObserve && !showAcknowledgeButton) {
      return (
        <div
          role="group"
          aria-label="Multiple choice activity"
          data-testid="multiple-choice-observe"
        >
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
                  aria-label={idx === question.correctIndex ? `Correct answer: ${opt}` : opt}
                />{' '}
                {opt}
                {idx === question.correctIndex && <span aria-hidden="true"> ✓</span>}
              </label>
            ))}
          </fieldset>
          <div role="status" aria-live="assertive" data-testid="observe-complete">
            <p>Content acknowledged.</p>
          </div>
        </div>
      );
    }

    if (submitted) {
      const correctCount = responses.filter((r) => r.correct).length;
      const totalQuestions = cfg.questions.length;

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
        {cfg.questions.length > 1 && (
          <p className="text-on-surface/70 mb-sm text-sm" data-testid="question-progress">
            Question {currentIndex + 1} of {cfg.questions.length}
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
                  name={`mc-option-${currentIndex}`}
                  value={idx}
                  checked={isSelected}
                  onChange={() => handleMultiSelect(idx)}
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
            <Button
              variant="default"
              onClick={handleMultiNext}
              disabled={currentSelection === null || currentSelection === undefined}
            >
              {isLastQuestion ? 'Submit' : 'Next'}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return null;
}

const MultipleChoiceWidget: WidgetDefinitionV2 = {
  id: 'core.multiple-choice',
  name: 'Multiple Choice',
  description: 'Select the correct answer from a list of options',
  domain: 'core',
  version: '0.1.0',
  render: MultipleChoiceComponent,
  learningIntents: [LearningIntent.Assess],
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
  },
  accessibility: {
    highContrast: true,
    keyboardOnly: true,
    screenReader: true,
    tts: true,
    focusManagement: true,
    ariaSupport: true,
  },
  analytics: {
    trackAttempts: true,
    trackCompletionTime: true,
    trackSuccessRate: true,
    trackMistakes: true,
  },
  reward: { completionXP: 10, confetti: true, positiveMessage: 'Correct!' },
  ai: {
    difficulty: 'medium',
    estimatedMinutes: 3,
    bloomsLevel: 'remember',
    cognitiveLoad: 'low',
    subjectTags: ['general'],
    authoringPrompt: 'Create a multiple-choice question with 3-4 options and one correct answer',
  },
  icon: 'circle-check',
  keywords: ['quiz', 'test', 'select', 'options', 'choice'],
  status: 'stable',
};

const LegacyChoiceWidget: WidgetDefinitionV2 = {
  id: 'open-edu.multiple-choice-practice',
  name: 'Multiple Choice Practice',
  description: 'Select the correct answer from a list of options',
  domain: 'core',
  version: '0.1.0',
  render: MultipleChoiceComponent,
  learningIntents: [LearningIntent.Practice],
  capabilities: MultipleChoiceWidget.capabilities,
  accessibility: MultipleChoiceWidget.accessibility,
  analytics: MultipleChoiceWidget.analytics,
  reward: MultipleChoiceWidget.reward,
  ai: MultipleChoiceWidget.ai,
  icon: MultipleChoiceWidget.icon,
  keywords: MultipleChoiceWidget.keywords,
  status: 'deprecated',
  deprecated: true,
  replacement: 'core.multiple-choice',
};

export { MultipleChoiceWidget as multipleChoice };
export { LegacyChoiceWidget as multipleChoicePractice };
export default MultipleChoiceWidget;
