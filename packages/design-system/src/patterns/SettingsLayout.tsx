import { type ReactNode } from 'react';

export interface SettingsLayoutProps {
  sidebar?: ReactNode;
  children: ReactNode;
}

export function SettingsLayout({ sidebar, children }: SettingsLayoutProps): JSX.Element {
  return (
    <div className="flex h-full max-w-5xl mx-auto">
      {sidebar && (
        <nav className="w-60 shrink-0 border-r border-outline-variant p-4 overflow-y-auto">
          {sidebar}
        </nav>
      )}
      <main className="flex-1 min-w-0 p-6 overflow-y-auto">{children}</main>
    </div>
  );
}
