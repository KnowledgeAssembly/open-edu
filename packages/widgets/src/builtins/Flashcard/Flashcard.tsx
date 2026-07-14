import { useState, useCallback, useMemo } from 'react';
import { z } from 'zod';
import type { WidgetDefinitionV2 } from '../../types';
import { LearningIntent } from '../../metadata/learning-intents';
import { Button } from '@open-edu/design-system';
import { useObserveMode } from '../../use-observe-mode';

const cardSchema = z.object({
  front: z.string().min(1),
  back: z.string().min(1),
  image: z.string().optional(),
  audio: z.string().optional(),
  hint: z.string().optional(),
  category: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
});

const flashcardSchema = z.object({
  cards: z.array(cardSchema).min(1),
  mode: z.enum(['flip', 'multiple', 'spaced']).optional().default('flip'),
  interactive: z.boolean().optional().default(false),
  shuffle: z.boolean().optional().default(false),
});

const FlashcardStateSchema = z.object({
  currentIndex: z.number(),
  flipped: z.array(z.number()),
  correct: z.array(z.number()),
  incorrect: z.array(z.number()),
  confidence: z.record(z.number(), z.number()).optional(),
});

function shuffleArray<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  let s = seed;
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

function FlashcardComponent(props: {
  nodeId: string;
  config: Record<string, unknown>;
  emitInteraction: (data: Record<string, unknown>) => void;
  complete: (score?: number, state?: unknown) => void;
  storedState?: unknown;
}) {
  const { config: rawConfig, emitInteraction, complete, storedState } = props;
  const parsed = flashcardSchema.safeParse(rawConfig);
  const parsedState = useMemo(() => {
    const result = FlashcardStateSchema.safeParse(storedState);
    return result.success ? result.data : null;
  }, [storedState]);

  const [currentIndex, setCurrentIndex] = useState(parsedState?.currentIndex ?? 0);
  const [flipped, setFlipped] = useState(parsedState?.flipped ?? []);
  const [correctCards, setCorrectCards] = useState<number[]>(parsedState?.correct ?? []);
  const [incorrectCards, setIncorrectCards] = useState<number[]>(parsedState?.incorrect ?? []);
  const [showHint, setShowHint] = useState(false);

  const isObserve = parsed.success && !parsed.data.interactive;
  const { handleAcknowledge, showAcknowledgeButton } = useObserveMode({
    isObserve,
    onComplete: complete,
    onInteract: emitInteraction,
    widgetId: 'language.flashcard',
  });

  const cards = useMemo(() => {
    if (!parsed.success) return [];
    return parsed.data.shuffle ? shuffleArray(parsed.data.cards, 42) : parsed.data.cards;
  }, [parsed]);

  const currentCard = cards[currentIndex];
  const isFlipped = flipped.includes(currentIndex);
  const totalCards = cards.length;
  const allReviewed = correctCards.length + incorrectCards.length >= totalCards;

  const handleFlip = useCallback(() => {
    if (isObserve) return;
    setFlipped((prev) => prev.includes(currentIndex) ? prev : [...prev, currentIndex]);
    emitInteraction({
      type: 'widget.interaction',
      widgetId: 'language.flashcard',
      action: 'flip',
      cardIndex: currentIndex,
    });
  }, [currentIndex, isObserve, emitInteraction]);

  const handleSelfAssess = useCallback(
    (isCorrect: boolean) => {
      const list = isCorrect ? correctCards : incorrectCards;
      if (!list.includes(currentIndex)) {
        if (isCorrect) setCorrectCards((prev) => [...prev, currentIndex]);
        else setIncorrectCards((prev) => [...prev, currentIndex]);
      }
      emitInteraction({
        type: 'widget.interaction',
        widgetId: 'language.flashcard',
        action: isCorrect ? 'correct' : 'incorrect',
        cardIndex: currentIndex,
      });
      if (currentIndex < totalCards - 1) {
        setCurrentIndex(currentIndex + 1);
        setShowHint(false);
      } else {
        const score = ((correctCards.length + (isCorrect ? 1 : 0)) / totalCards) * 100;
        complete(score, {
          currentIndex,
          flipped,
          correct: isCorrect ? [...correctCards, currentIndex] : correctCards,
          incorrect: isCorrect ? incorrectCards : [...incorrectCards, currentIndex],
        });
      }
    },
    [currentIndex, correctCards, incorrectCards, flipped, totalCards, emitInteraction, complete],
  );

  const handleRetryIncorrect = useCallback(() => {
    const incorrectIndices = incorrectCards;
    if (incorrectIndices.length > 0) {
      setCurrentIndex(incorrectIndices[0]!);
      setFlipped((prev) => prev.filter((i) => !incorrectIndices.includes(i)));
      setIncorrectCards([]);
      setShowHint(false);
    }
  }, [incorrectCards]);

  if (!parsed.success || !currentCard) {
    return (
      <div role="alert" data-testid="widget-config-error" className="border-outline-variant bg-surface-container-lowest p-md rounded-xl border text-center">
        <p className="text-on-surface font-semibold">This activity could not be loaded.</p>
      </div>
    );
  }

  if (isObserve) {
    return (
      <div role="group" aria-label="Flashcard activity" data-testid="flashcard-observe">
        {cards.map((card, idx) => (
          <div key={idx} className="border-outline-variant bg-surface-container-lowest mb-sm rounded-lg border p-md">
            <p className="text-on-surface font-semibold">{card.front}</p>
            <p className="text-on-surface/70 mt-xs">{card.back}</p>
          </div>
        ))}
        {showAcknowledgeButton && (
          <div className="p-md border-outline-variant mt-md flex items-center justify-center border-t">
            <Button variant="default" onClick={handleAcknowledge} data-testid="observe-acknowledge">
              Mark as seen ✓
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div role="group" aria-label="Flashcard activity" data-testid="flashcard">
      <p className="text-on-surface/70 mb-sm text-sm">
        Card {currentIndex + 1} of {totalCards}
      </p>

      <div
        className={`border-outline-variant bg-surface-container-lowest rounded-xl border p-lg text-center min-h-[200px] flex flex-col items-center justify-center cursor-pointer`}
        onClick={handleFlip}
        role="button"
        aria-label={isFlipped ? 'Card back: ' + currentCard.back : 'Card front: ' + currentCard.front + '. Click to flip.'}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleFlip(); } }}
        data-testid="flashcard-card"
      >
        {currentCard.image && (
          <img src={currentCard.image} alt="" className="mb-sm max-h-32 rounded" aria-hidden="true" />
        )}
        <p className="text-on-surface text-lg font-medium">
          {isFlipped ? currentCard.back : currentCard.front}
        </p>
        {!isFlipped && <p className="text-on-surface/50 mt-sm text-sm">Click to flip</p>}
      </div>

      {currentCard.hint && !isFlipped && (
        <div className="mt-sm text-center">
          <Button variant="ghost" size="sm" onClick={() => setShowHint(!showHint)}>
            {showHint ? 'Hide Hint' : 'Show Hint'}
          </Button>
          {showHint && <p className="text-on-surface/70 mt-xs text-sm">{currentCard.hint}</p>}
        </div>
      )}

      {isFlipped && (
        <div className="mt-md flex gap-sm justify-center">
          <Button variant="outline" onClick={() => handleSelfAssess(false)} data-testid="btn-incorrect">
            ✗ Incorrect
          </Button>
          <Button variant="default" onClick={() => handleSelfAssess(true)} data-testid="btn-correct">
            ✓ Correct
          </Button>
        </div>
      )}

      {allReviewed && (
        <div role="status" aria-live="assertive" data-testid="flashcard-complete" className="mt-md text-center">
          <p className="text-on-surface font-semibold">
            Done! {correctCards.length} correct, {incorrectCards.length} incorrect.
          </p>
          {incorrectCards.length > 0 && (
            <Button variant="outline" onClick={handleRetryIncorrect} className="mt-sm" data-testid="btn-retry">
              Retry Incorrect
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

const FlashcardWidget: WidgetDefinitionV2 = {
  id: 'language.flashcard',
  name: 'Flashcard',
  description: 'Vocabulary and memory practice with flip cards',
  domain: 'language',
  version: '1.0.0',
  render: FlashcardComponent,
  learningIntents: [LearningIntent.Practice, LearningIntent.Recall],
  capabilities: {
    supportsObserveMode: true,
    supportsKeyboard: true,
    supportsScreenReader: true,
    supportsHints: true,
    supportsRetry: true,
    supportsTouch: true,
    supportsMouse: true,
    supportsAnalytics: true,
    supportsRewards: true,
    supportsAccessibility: true,
    supportsOffline: true,
    supportsLocalization: true,
  },
  accessibility: {
    highContrast: true,
    keyboardOnly: true,
    screenReader: true,
    ariaSupport: true,
    focusManagement: true,
  },
  analytics: {
    trackAttempts: true,
    trackCompletionTime: true,
    trackHints: true,
    trackSuccessRate: true,
    trackConfidence: true,
    trackInteractions: true,
    trackMistakes: true,
    trackRetries: true,
  },
  reward: {
    completionXP: 15,
    confetti: true,
    positiveMessage: 'Great memorization!',
    achievement: 'first-flashcard',
  },
  ai: {
    difficulty: 'easy',
    estimatedMinutes: 5,
    bloomsLevel: 'remember',
    cognitiveLoad: 'low',
    recommendedAge: [6, 18],
    readingLevel: 'grade-2',
    subjectTags: ['language', 'vocabulary'],
    learningObjectives: [
      'Recall vocabulary or concepts from flashcards',
      'Self-assess understanding through flip interaction',
      'Practice retrieval through spaced repetition metadata',
    ],
    commonMisconceptions: [
      'Confusing similar-looking words or concepts',
      'Overconfidence after seeing the answer',
    ],
    generationHints: [
      'Keep card fronts concise (1-5 words)',
      'Write clear, specific backs',
      'Add images for concrete nouns',
      'Include pronunciation guides for language cards',
    ],
    authoringPrompt: 'Create flashcard sets for vocabulary or concept memorization',
    exampleConfigs: [
      {
        cards: [
          { front: 'Hola', back: 'Hello', hint: 'Spanish greeting', category: 'Greetings' },
          { front: 'Gracias', back: 'Thank you', category: 'Greetings' },
          { front: 'Adios', back: 'Goodbye', category: 'Greetings' },
        ],
        mode: 'flip',
        interactive: true,
        shuffle: true,
      },
    ],
  },
  icon: 'layers',
  keywords: ['flashcard', 'vocabulary', 'memory', 'recall', 'flip', 'quiz'],
  status: 'stable',
};

export { FlashcardWidget as flashcard };
export default FlashcardWidget;
