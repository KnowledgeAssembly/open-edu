import { type ReactNode } from 'react';
import { cn } from '../lib/utils.js';

export interface TutorMessageProps {
  role: 'user' | 'ai';
  children: ReactNode;
  className?: string;
}

export function TutorMessage({ role, children, className }: TutorMessageProps): JSX.Element {
  return (
    <div
      className={cn(
        'flex gap-2 items-start',
        role === 'user' ? 'justify-end' : 'justify-start',
        className,
      )}
      data-testid="tutor-message"
    >
      {role === 'ai' && (
        <span
          className="w-7 h-7 rounded-full bg-primary-container flex items-center justify-center text-sm shrink-0"
          aria-hidden="true"
        >
          {'🤖'}
        </span>
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
