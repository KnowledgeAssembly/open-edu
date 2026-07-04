import { type ReactNode } from 'react';

export interface DashboardLayoutProps {
  header?: ReactNode;
  sidebar?: ReactNode;
  children: ReactNode;
}

export function DashboardLayout({ header, sidebar, children }: DashboardLayoutProps): JSX.Element {
  return (
    <div className="flex h-screen flex-col">
      {header && <div className="shrink-0">{header}</div>}
      <div className="flex flex-1 overflow-hidden">
        {sidebar && (
          <div className="border-outline-variant w-64 shrink-0 overflow-y-auto border-r p-4">
            {sidebar}
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}
