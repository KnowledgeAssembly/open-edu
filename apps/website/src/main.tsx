import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { App } from './App';
import { HomePage } from './routes/HomePage';
import { CoursesPage } from './routes/CoursesPage';
import { WidgetsPage } from './routes/WidgetsPage';
import { DocsPage } from './routes/DocsPage';
import { CommunityPage } from './routes/CommunityPage';

import './index.css';

const router = createBrowserRouter([
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
]);

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');
createRoot(root).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
