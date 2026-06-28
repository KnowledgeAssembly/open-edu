import { type ReactNode } from 'react';
import { AppLayout } from './AppLayout.js';
import { ThreePanelLayout } from './ThreePanelLayout.js';

export interface CourseViewerLayoutProps {
  topBar?: ReactNode;
  sideNav?: ReactNode;
  content: ReactNode;
  rightPanel?: ReactNode;
}

export function CourseViewerLayout({
  topBar,
  sideNav,
  content,
  rightPanel,
}: CourseViewerLayoutProps): JSX.Element {
  return (
    <AppLayout topBar={topBar}>
      <ThreePanelLayout leftNav={sideNav} content={content} rightPanel={rightPanel} />
    </AppLayout>
  );
}
