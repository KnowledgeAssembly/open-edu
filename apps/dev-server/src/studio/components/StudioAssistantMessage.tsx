import { cn } from '@open-edu/design-system';

export function StudioAssistantMessage({
  role,
  content,
}: {
  role: 'user' | 'assistant';
  content: string;
}) {
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
    </div>
  );
}
