import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ReflectionRenderer } from './ReflectionRenderer';
import type { ReflectionNode } from '@open-edu/schemas';
import { I18nProvider } from '@open-edu/i18n';
import runtimeDict from '@open-edu/i18n/locales/en/runtime.json';

function makeReflection(prompt = 'What did you learn?'): ReflectionNode {
  return { type: 'reflection', prompt };
}

function renderWithI18n(ui: ReactNode) {
  return render(
    <I18nProvider locale="en" dictionaries={{ en: { runtime: runtimeDict } }}>
      {ui}
    </I18nProvider>,
  );
}

describe('ReflectionRenderer', () => {
  it('renders the prompt with markdown support', () => {
    const { container, getByText } = renderWithI18n(
      <ReflectionRenderer node={makeReflection('Why is **this** important?')} onSubmit={vi.fn()} />,
    );
    expect(container.textContent).toContain('Why is this important?');
    expect(getByText('this')).toHaveProperty('tagName', 'STRONG');
  });

  it('renders inline code in the prompt', () => {
    const { container } = renderWithI18n(
      <ReflectionRenderer
        node={makeReflection('What does the `load` function do?')}
        onSubmit={vi.fn()}
      />,
    );
    const code = container.querySelector('code');
    expect(code).not.toBeNull();
    expect(code?.textContent).toBe('load');
  });

  it('associates the textarea with the rendered prompt via aria-labelledby', () => {
    const { getByRole } = renderWithI18n(
      <ReflectionRenderer node={makeReflection('Why is this important?')} onSubmit={vi.fn()} />,
    );
    const textarea = getByRole('textbox');
    expect(textarea.getAttribute('id')).not.toBeNull();
    const labelledBy = textarea.getAttribute('aria-labelledby');
    expect(labelledBy).not.toBeNull();
    const promptEl = document.getElementById(labelledBy!);
    expect(promptEl).not.toBeNull();
    expect(promptEl?.textContent).toContain('Why is this important?');
  });

  it('disables submit while textarea is empty', () => {
    const { getByRole } = renderWithI18n(
      <ReflectionRenderer node={makeReflection()} onSubmit={vi.fn()} />,
    );
    expect(getByRole('button', { name: 'Submit' })).toBeDisabled();
  });

  it('enables submit after entering text', () => {
    const { getByRole } = renderWithI18n(
      <ReflectionRenderer node={makeReflection()} onSubmit={vi.fn()} />,
    );
    fireEvent.change(getByRole('textbox'), { target: { value: 'I learned X' } });
    expect(getByRole('button', { name: 'Submit' })).not.toBeDisabled();
  });

  it('calls onSubmit with the entered text', () => {
    const onSubmit = vi.fn();
    const { getByRole } = renderWithI18n(
      <ReflectionRenderer node={makeReflection()} onSubmit={onSubmit} />,
    );
    fireEvent.change(getByRole('textbox'), { target: { value: 'My reflection' } });
    fireEvent.click(getByRole('button', { name: 'Submit' }));
    expect(onSubmit).toHaveBeenCalledWith('My reflection');
  });

  it('makes textarea read-only and shows confirmation after submit', () => {
    const { getByRole, getByText } = renderWithI18n(
      <ReflectionRenderer node={makeReflection()} onSubmit={vi.fn()} />,
    );
    fireEvent.change(getByRole('textbox'), { target: { value: 'done' } });
    fireEvent.click(getByRole('button', { name: 'Submit' }));
    expect(getByText(/Saved/)).toBeInTheDocument();
    expect(getByRole('textbox')).toHaveAttribute('readonly');
  });

  it('disables submit for whitespace-only text', () => {
    const { getByRole } = renderWithI18n(
      <ReflectionRenderer node={makeReflection()} onSubmit={vi.fn()} />,
    );
    fireEvent.change(getByRole('textbox'), { target: { value: '   ' } });
    expect(getByRole('button', { name: 'Submit' })).toBeDisabled();
  });

  it('shows a character count', () => {
    const { getByText, getByRole } = renderWithI18n(
      <ReflectionRenderer node={makeReflection()} onSubmit={vi.fn()} maxLength={100} />,
    );
    fireEvent.change(getByRole('textbox'), { target: { value: 'hello' } });
    expect(getByText('5 / 100')).toBeInTheDocument();
  });

  it('hides character count when showCharCount is false', () => {
    const { queryByText, getByRole } = renderWithI18n(
      <ReflectionRenderer node={makeReflection()} onSubmit={vi.fn()} showCharCount={false} />,
    );
    fireEvent.change(getByRole('textbox'), { target: { value: 'hello' } });
    expect(queryByText(/\/ 4096/)).toBeNull();
  });

  it('saved confirmation has aria-live polite', () => {
    const { getByRole, container } = renderWithI18n(
      <ReflectionRenderer node={makeReflection()} onSubmit={vi.fn()} />,
    );
    fireEvent.change(getByRole('textbox'), { target: { value: 'x' } });
    fireEvent.click(getByRole('button', { name: 'Submit' }));
    const status = container.querySelector('[aria-live="polite"]');
    expect(status).not.toBeNull();
    expect(status?.getAttribute('role')).toBe('status');
  });
});
