import { cn } from '@open-edu/design-system';
import { AssistantDraftCard } from './AssistantDraftCard';
import type { DraftItem } from '../ai/types';

interface ChatMessageMetadata {
  mode?: 'explain' | 'draft';
  drafts?: DraftItem[];
}

export function StudioAssistantMessage({
  role,
  content,
  metadata,
  onUseDraft,
  onDiscardDraft,
  onOpenDraft,
  isDirty,
}: {
  role: 'user' | 'assistant';
  content: string;
  metadata?: ChatMessageMetadata;
  onUseDraft?: (item: DraftItem) => void;
  onDiscardDraft?: (item: DraftItem) => void;
  onOpenDraft?: (item: DraftItem) => void;
  isDirty?: boolean;
}) {
  const drafts = metadata?.drafts;

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
      {drafts && drafts.length > 0 ? (
        <div className="mt-3 space-y-3">
          {drafts.map((item, i) => (
            <AssistantDraftCard
              key={`${item.kind}-${i}`}
              item={item}
              index={i}
              total={drafts.length}
              onUse={(draft) => onUseDraft?.(draft)}
              onDiscard={(draft) => onDiscardDraft?.(draft)}
              onOpen={onOpenDraft}
              isDirty={isDirty}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}