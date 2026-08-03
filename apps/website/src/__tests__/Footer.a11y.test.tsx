import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from '@open-edu/i18n';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';
import { Footer } from '../components/Footer';
import { dictionaries } from '../i18n-dictionaries';

describe('Footer accessibility', () => {
  it('has no axe violations', async () => {
    const { container } = render(
      <I18nProvider locale="en" supportedLocales={['en']} dictionaries={dictionaries}>
        <MemoryRouter>
          <Footer />
        </MemoryRouter>
      </I18nProvider>,
    );
    const result = await axe.run(container);
    expect(result.violations).toHaveLength(0);
  });
});
