import { type ReactNode } from 'react';
import { cn } from '../lib/utils.js';
import { Pipili } from '../primitives/pipili.js';

export interface TutorMessageProps {
  role: 'user' | 'ai';
  children: ReactNode;
  className?: string;
}

export function TutorMessage({ role, children, className }: TutorMessageProps): JSX.Element {
  return (
    <div
      className={cn(
        'flex items-start gap-2',
        role === 'user' ? 'justify-end' : 'justify-start',
        className,
      )}
      data-testid="tutor-message"
    >
      {role === 'ai' && (
        <div className="bg-primary-container flex h-7 w-7 shrink-0 items-center justify-center rounded-full">
          <Pipili size="xs" mood="idle" />
        </div>
      )}
      <div
        className={cn(
          'max-w-[80%] px-3.5 py-2.5 text-xs leading-relaxed',
          role === 'ai'
            ? 'bg-surface-container text-on-surface rounded-[12px_12px_12px_4px]'
            : 'bg-primary text-on-primary rounded-[12px_12px_4px_12px]',
        )}
      >
        {children}
      </div>
    </div>
  );
}

TutorMessage.displayName = 'TutorMessage';
