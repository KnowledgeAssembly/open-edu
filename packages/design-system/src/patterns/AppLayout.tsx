import { type ReactNode } from 'react';

export interface AppLayoutProps {
  topBar?: ReactNode;
  sidebar?: ReactNode;
  children: ReactNode;
}

export function AppLayout({ topBar, sidebar, children }: AppLayoutProps): JSX.Element {
  return (
    <div className="flex flex-col h-screen w-full">
      {topBar && <div className="shrink-0">{topBar}</div>}
      <div className="flex flex-1 overflow-hidden">
        {sidebar && <div className="shrink-0">{sidebar}</div>}
        <main className="flex-1 overflow-auto relative z-[1]">{children}</main>
      </div>
    </div>
  );
}
