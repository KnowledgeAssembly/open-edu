import { type ReactNode } from 'react';

export interface DashboardLayoutProps {
  header?: ReactNode;
  sidebar?: ReactNode;
  children: ReactNode;
}

export function DashboardLayout({ header, sidebar, children }: DashboardLayoutProps): JSX.Element {
  return (
    <div className="flex flex-col h-screen">
      {header && <div className="shrink-0">{header}</div>}
      <div className="flex flex-1 overflow-hidden">
        {sidebar && (
          <aside className="w-64 shrink-0 border-r border-outline-variant p-4 overflow-y-auto">
            {sidebar}
          </aside>
        )}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}
