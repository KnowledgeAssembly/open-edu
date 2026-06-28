import type { ReactNode } from 'react';
import { cn } from '../lib/utils.js';
import { Card, CardHeader, CardTitle, CardContent } from '../primitives/card.js';

export interface LessonProps {
  title: string;
  children: ReactNode;
  icon?: string;
  className?: string;
}

export function Lesson({ title, children, icon, className }: LessonProps): JSX.Element {
  return (
    <Card data-testid="lesson" className={cn('w-full', className)}>
      <CardHeader className="flex flex-row items-center gap-3 pb-4">
        {icon && (
          <span className="text-2xl shrink-0" aria-hidden="true">
            {icon}
          </span>
        )}
        <CardTitle className="text-xl font-bold text-on-surface">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-on-surface font-body-md">{children}</CardContent>
    </Card>
  );
}
