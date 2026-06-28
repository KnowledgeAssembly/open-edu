import { type ReactNode } from 'react';
import { AppLayout } from './AppLayout.js';
import { ThreePanelLayout } from './ThreePanelLayout.js';

export interface CourseViewerLayoutProps {
  topBar?: ReactNode;
  sideNav?: ReactNode;
  content?: ReactNode;
  rightPanel?: ReactNode;
  children?: ReactNode;
}

export function CourseViewerLayout({
  topBar,
  sideNav,
  content,
  rightPanel,
  children,
}: CourseViewerLayoutProps): JSX.Element {
  const mainContent = content ?? children;
  return (
    <AppLayout topBar={topBar}>
      <ThreePanelLayout leftNav={sideNav} content={mainContent} rightPanel={rightPanel} />
    </AppLayout>
  );
}
