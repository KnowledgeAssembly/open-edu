import { type ReactNode } from 'react';

export interface AppLayoutProps {
  topBar?: ReactNode;
  sidebar?: ReactNode;
  children: ReactNode;
}

export function AppLayout({ topBar, sidebar, children }: AppLayoutProps): JSX.Element {
  return (
    <div className="flex h-screen w-full flex-col">
      {topBar && <div className="shrink-0">{topBar}</div>}
      <div className="flex flex-1 overflow-hidden">
        {sidebar && <div className="shrink-0">{sidebar}</div>}
        <main className="relative z-[1] flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
