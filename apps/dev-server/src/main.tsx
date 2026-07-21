import './index.css';
import './tailwind.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nProvider } from '@open-edu/i18n';
import { DevApp } from './DevApp';

import runtimeEn from '@open-edu/i18n/locales/en/runtime.json';
import learnerEn from '@open-edu/i18n/locales/en/learner.json';
import widgetsEn from '@open-edu/i18n/locales/en/widgets.json';
import schemasEn from '@open-edu/i18n/locales/en/schemas.json';

const dictionaries = {
  en: {
    runtime: runtimeEn as Record<string, string>,
    learner: learnerEn as Record<string, string>,
    widgets: widgetsEn as Record<string, string>,
    schemas: schemasEn as Record<string, string>,
  },
};

const root = document.getElementById('root');
if (!root) {
  throw new Error('Root element #root not found');
}

createRoot(root).render(
  <StrictMode>
    <I18nProvider locale="en" dictionaries={dictionaries}>
      <DevApp />
    </I18nProvider>
  </StrictMode>,
);
