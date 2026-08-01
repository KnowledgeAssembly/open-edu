import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { App } from './App';
import { defaultLogger } from '@open-edu/logger';

import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/source-serif-4/400.css';
import '@fontsource/source-serif-4/600.css';
import '@fontsource/source-serif-4/700.css';

import './index.css';

const router = createBrowserRouter([{ path: '*', element: <App /> }]);

const rootLogger = defaultLogger();

window.onerror = (message, source, lineno, colno, error) => {
  rootLogger.error(
    'Unhandled runtime error',
    error ?? { name: 'Error', message: String(message) },
    {
      source,
      lineno,
      colno,
    },
  );
};

window.addEventListener('unhandledrejection', (event) => {
  rootLogger.error('Unhandled promise rejection', event.reason);
});

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');
createRoot(root).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
