import './index.css';
import './tailwind.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { DevApp } from './DevApp';

const root = document.getElementById('root');
if (!root) {
  throw new Error('Root element #root not found');
}

createRoot(root).render(
  <StrictMode>
    <DevApp />
  </StrictMode>,
);
