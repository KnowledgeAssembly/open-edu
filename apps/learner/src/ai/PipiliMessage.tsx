import * as React from 'react';
import type { UIMessage } from 'ai';
import type { PipiliResponseMetadata } from '@open-edu/ai-companion';
import {
  TutorMessage,
  Citation as CitationCmp,
  cn,
  MarkdownText,
  NativeEmojiPack,
  createOpenMojiPack,
  type EmojiPack,
} from '@open-edu/design-system';
import { useTranslation } from '@open-edu/i18n';
import { useCompanion } from './CompanionProvider.js';
import type { EmojiMode } from './CompanionProvider.js';

export interface PipiliMessageProps {
  role: 'user' | 'assistant' | 'system';
  parts: UIMessage['parts'];
  metadata?: PipiliResponseMetadata;
  isStreaming?: boolean;
}

const openMojiPack = createOpenMojiPack();

function resolveEmojiPack(emojiMode: EmojiMode | undefined): EmojiPack {
  return emojiMode === 'openmoji' ? openMojiPack : NativeEmojiPack;
}

/**
 * Rich renderer for a single AI SDK v7 `UIMessage`. Reads text from
 * `message.parts` (v7 `UIMessage` has no `content` string) and renders the
 * validated `PipiliResponseMetadata` (citations / hint level / mode / next
 * steps) that the server attaches as AI SDK message metadata.
 */
export const PipiliMessage = React.forwardRef<HTMLDivElement, PipiliMessageProps>(
  function PipiliMessage({ role, parts, metadata, isStreaming }, ref): JSX.Element {
    const { t } = useTranslation();
    const { emojiMode } = useCompanion();
    const textParts = parts.filter((p): p is { type: 'text'; text: string } => p.type === 'text');
    const visibleText = textParts.map((p) => p.text).join('');

    return (
      <div ref={ref} className="space-y-2" data-testid="pipili-message">
        <TutorMessage role={role === 'assistant' ? 'ai' : 'user'}>
          <span className={cn(isStreaming && 'opacity-95')}>
            {role === 'assistant' ? (
              <MarkdownText content={visibleText} emojiPack={resolveEmojiPack(emojiMode)} />
            ) : (
              visibleText
            )}
            {isStreaming && (
              <span
                aria-hidden="true"
                className="inline-block h-4 w-1.5 animate-pulse bg-current align-middle"
              />
            )}
          </span>
        </TutorMessage>

        {metadata?.hintLevel && (
          <div className="text-on-surface-muted text-caption ml-8" data-testid="pipili-hint-level">
            {t('learner.pipili.hint_level', { level: String(metadata.hintLevel) })}
          </div>
        )}

        {metadata?.mode && metadata.mode !== 'tutor' && (
          <div className="text-on-surface-muted text-caption ml-8 italic" data-testid="pipili-mode">
            {t(`learner.pipili.mode.${metadata.mode}`)}
          </div>
        )}

        {metadata?.citations && metadata.citations.length > 0 && (
          <div className="ml-8 space-y-1" data-testid="pipili-citations">
            {metadata.citations.map((c, i) => (
              <CitationCmp key={`${c.referenceId ?? i}`} source={c.source}>
                {c.text}
              </CitationCmp>
            ))}
          </div>
        )}

        {metadata?.suggestedNextSteps && metadata.suggestedNextSteps.length > 0 && !isStreaming && (
          <div className="ml-8 mt-2" data-testid="pipili-next-steps">
            <span className="text-label font-medium">{t('learner.pipili.next_steps')}</span>
            <ul className="text-on-surface-muted text-caption list-disc pl-4">
              {metadata.suggestedNextSteps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  },
);
PipiliMessage.displayName = 'PipiliMessage';
