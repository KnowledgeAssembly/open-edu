import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@open-edu/i18n';
import studioEn from '@open-edu/i18n/locales/en/studio.json';
import { SchemaForm } from '../SchemaForm';

function wrap(ui: React.ReactElement) {
  return (
    <I18nProvider locale="en" dictionaries={{ en: { studio: studioEn as Record<string, string> } }}>
      {ui}
    </I18nProvider>
  );
}

describe('SchemaForm JSON validation', () => {
  it('shows an error for invalid JSON and does not call onChange with malformed data', async () => {
    const onChange = vi.fn();
    render(wrap(<SchemaForm data={{ nested: { a: 1 } }} onChange={onChange} />));
    const textarea = screen.getByRole('textbox');
    await userEvent.clear(textarea);
    await userEvent.type(textarea, '{{');
    expect(await screen.findByText('Invalid JSON')).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('calls onChange with the parsed object and clears the error for valid JSON', async () => {
    const onChange = vi.fn();
    render(wrap(<SchemaForm data={{ nested: { a: 1 } }} onChange={onChange} />));
    const textarea = screen.getByRole('textbox');
    await userEvent.clear(textarea);
    await userEvent.type(textarea, '{{"a":2}');
    fireEvent.blur(textarea);
    expect(onChange).toHaveBeenCalledWith({ nested: { a: 2 } });
    expect(screen.queryByText('Invalid JSON')).not.toBeInTheDocument();
  });
});
