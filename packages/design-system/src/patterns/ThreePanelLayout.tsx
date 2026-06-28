import { type ReactNode } from 'react';

export interface ThreePanelLayoutProps {
  leftNav?: ReactNode;
  content: ReactNode;
  rightPanel?: ReactNode;
}

export function ThreePanelLayout({
  leftNav,
  content,
  rightPanel,
}: ThreePanelLayoutProps): JSX.Element {
  return (
    <div className="flex h-full">
      {leftNav && <div className="shrink-0">{leftNav}</div>}
      <div className="flex-1 min-w-0">{content}</div>
      {rightPanel && <div className="shrink-0">{rightPanel}</div>}
    </div>
  );
}
