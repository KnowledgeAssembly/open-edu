import { useState } from 'react';
import { cn, Button } from '@open-edu/design-system';
import { useTranslation } from '@open-edu/i18n';
import { AssistantDraftCard } from './AssistantDraftCard';
import { AssistantCourseDraftCard } from './AssistantCourseDraftCard';
import type { DraftItem, CourseDraftResult } from '../ai/types';
import type { DraftApplyMode } from '../ai/StudioAssistantProvider';

interface ChatMessageMetadata {
  mode?: 'explain' | 'draft' | 'course_draft';
  drafts?: DraftItem[];
  courseDraft?: CourseDraftResult;
  applyMode?: DraftApplyMode;
}

export function StudioAssistantMessage({
  role,
  content,
  metadata,
  onUseDraft,
  onUseAll,
  onDiscardDraft,
  onOpenDraft,
  onAcceptCourseDraft,
  onDiscardCourseDraft,
  isDirty,
  applying,
  courseDraftAccepting,
}: {
  role: 'user' | 'assistant';
  content: string;
  metadata?: ChatMessageMetadata;
  onUseDraft?: (item: DraftItem, siblings: DraftItem[]) => void;
  onUseAll?: (items: DraftItem[]) => void;
  onDiscardDraft?: (item: DraftItem) => void;
  onOpenDraft?: (item: DraftItem) => void;
  onAcceptCourseDraft?: (force: boolean) => void;
  onDiscardCourseDraft?: () => void;
  isDirty?: boolean;
  applying?: boolean;
  courseDraftAccepting?: boolean;
}) {
  const { t } = useTranslation();
  const drafts = metadata?.drafts;
  const courseDraft = metadata?.courseDraft;
  const [expanded, setExpanded] = useState(false);

  const visibleDrafts =
    drafts && drafts.length > 1 && !expanded ? drafts.slice(0, 1) : drafts ?? [];

  return (
    <div
      className={cn(
        'max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm',
        role === 'user'
          ? 'bg-primary text-on-primary ml-auto'
          : 'bg-surface-container text-on-surface mr-auto',
      )}
    >
      {content}
      {courseDraft ? (
        <div className="mt-3">
          <AssistantCourseDraftCard
            courseDraft={courseDraft}
            onAccept={(force) => onAcceptCourseDraft?.(force)}
            onDiscard={() => onDiscardCourseDraft?.()}
            accepting={courseDraftAccepting}
          />
        </div>
      ) : null}
      {drafts && drafts.length > 0 ? (
        <div className="mt-3 space-y-3">
          {drafts.length > 1 ? (
            <div className="flex items-center justify-between gap-2">
              <p className="text-on-surface-variant text-xs">
                {t('studio.assistant.draft.batchCount', { count: String(drafts.length) })}
              </p>
              <div className="flex gap-1">
                {onUseAll ? (
                  <Button
                    variant="default"
                    size="sm"
                    className="text-[11px]"
                    disabled={applying}
                    onClick={() => onUseAll(drafts)}
                  >
                    {t('studio.assistant.draft.use')}
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[11px]"
                  onClick={() => setExpanded((v) => !v)}
                >
                  {expanded
                    ? t('studio.assistant.draft.batchCollapse')
                    : t('studio.assistant.draft.batchExpand')}
                </Button>
              </div>
            </div>
          ) : null}
          {visibleDrafts.map((item, i) => (
            <AssistantDraftCard
              key={`${item.kind}-${i}-${item.title}`}
              item={item}
              index={i}
              total={drafts.length}
              onUse={(draft) => onUseDraft?.(draft, drafts)}
              onDiscard={(draft) => onDiscardDraft?.(draft)}
              onOpen={onOpenDraft}
              isDirty={isDirty && metadata?.applyMode !== 'file'}
              disabled={applying}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
