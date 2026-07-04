import { type ReactNode } from 'react';

export interface SettingsLayoutProps {
  sidebar?: ReactNode;
  children: ReactNode;
}

export function SettingsLayout({ sidebar, children }: SettingsLayoutProps): JSX.Element {
  return (
    <div className="mx-auto flex h-full max-w-5xl">
      {sidebar && (
        <nav className="border-outline-variant w-60 shrink-0 overflow-y-auto border-r p-4">
          {sidebar}
        </nav>
      )}
      <main className="min-w-0 flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
