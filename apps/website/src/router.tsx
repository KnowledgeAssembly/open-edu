import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { App } from './App';
import { HomePage } from './routes/HomePage';
import { CoursesPage } from './routes/CoursesPage';
import { WidgetsPage } from './routes/WidgetsPage';
import { DocsPage } from './routes/DocsPage';
import { CommunityPage } from './routes/CommunityPage';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'courses', element: <CoursesPage /> },
      { path: 'widgets', element: <WidgetsPage /> },
      { path: 'docs', element: <DocsPage /> },
      { path: 'community', element: <CommunityPage /> },
    ],
  },
];

export const router: ReturnType<typeof createBrowserRouter> = createBrowserRouter(routes);
