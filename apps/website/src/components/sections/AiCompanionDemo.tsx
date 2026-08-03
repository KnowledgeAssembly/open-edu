import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Pipili } from '@open-edu/design-system';
import { useTranslation } from '@open-edu/i18n';
import { ChatBubbleDemo, type ChatMessage } from '../../ui/ChatBubbleDemo';

type SuggestedQuestion = 'sky' | 'volcanoes';

interface QuestionOption {
  labelKey: string;
  userTextKey: string;
  responseKey: string;
}

const QUESTIONS: Record<SuggestedQuestion, QuestionOption> = {
  sky: {
    labelKey: 'website.ai.question_sky',
    userTextKey: 'website.ai.user_question_sky',
    responseKey: 'website.ai.response_sky',
  },
  volcanoes: {
    labelKey: 'website.ai.question_volcanoes',
    userTextKey: 'website.ai.user_question_volcanoes',
    responseKey: 'website.ai.response_volcanoes',
  },
};

const REPLY_DELAY_MS = 1100;

export function AiCompanionDemo(): JSX.Element {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'greeting', role: 'ai', text: t('website.ai.greeting') },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const idRef = useRef(0);

  const clearPendingTimer = useCallback((): void => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => clearPendingTimer, [clearPendingTimer]);

  const sendQuestion = useCallback(
    (question: SuggestedQuestion): void => {
      if (isTyping) return;

      const option = QUESTIONS[question];
      const userMessage: ChatMessage = {
        id: `user-${question}-${++idRef.current}`,
        role: 'user',
        text: t(option.userTextKey),
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsTyping(true);

      clearPendingTimer();
      timeoutRef.current = window.setTimeout(() => {
        const response: ChatMessage = {
          id: `ai-${question}-${++idRef.current}`,
          role: 'ai',
          text: t(option.responseKey),
        };
        setMessages((prev) => [...prev, response]);
        setIsTyping(false);
        timeoutRef.current = null;
      }, REPLY_DELAY_MS);
    },
    [clearPendingTimer, isTyping, t],
  );

  return (
    <section aria-labelledby="ai-heading" className="bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="max-w-2xl">
          <p className="text-primary text-sm font-semibold uppercase tracking-wide">
            {t('website.ai.eyebrow')}
          </p>
          <h2
            id="ai-heading"
            className="text-on-surface mt-4 text-3xl font-bold tracking-tight sm:text-4xl"
          >
            {t('website.ai.title')}
          </h2>
          <p className="text-on-surface-variant mt-4 text-lg">{t('website.ai.subtitle')}</p>
        </div>

        <div className="mx-auto mt-12 max-w-2xl">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Pipili size="sm" />
                <CardTitle className="text-lg">{t('website.ai.eyebrow')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ChatBubbleDemo messages={messages} isTyping={isTyping} />
            </CardContent>
          </Card>

          <div className="mt-6">
            <p id="ai-suggested-label" className="text-on-surface-variant text-sm font-medium">
              {t('website.ai.suggested_title')}
            </p>
            <div
              role="group"
              aria-labelledby="ai-suggested-label"
              className="mt-3 flex flex-wrap gap-2"
            >
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => sendQuestion('sky')}
                disabled={isTyping}
              >
                {t('website.ai.question_sky')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => sendQuestion('volcanoes')}
                disabled={isTyping}
              >
                {t('website.ai.question_volcanoes')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

AiCompanionDemo.displayName = 'AiCompanionDemo';
