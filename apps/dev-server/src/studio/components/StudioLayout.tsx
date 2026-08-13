import { type ReactNode } from 'react';
import { cn } from '@open-edu/design-system';

interface StudioLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  className?: string;
}

export function StudioLayout({ 
  children, 
  sidebar, 
  className 
}: StudioLayoutProps) {
  return (
    <div className={cn('flex flex-1 min-h-0 overflow-hidden', className)}>
      <main className="flex flex-1 flex-col min-w-0 overflow-auto">
        {children}
      </main>
      {sidebar}
    </div>
  );
}