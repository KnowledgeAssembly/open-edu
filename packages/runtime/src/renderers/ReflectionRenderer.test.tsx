import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { ReflectionRenderer } from './ReflectionRenderer';
import type { ReflectionNode } from '@open-edu/schemas';

function makeReflection(prompt = 'What did you learn?'): ReflectionNode {
  return { type: 'reflection', prompt };
}

describe('ReflectionRenderer', () => {
  it('renders the prompt as a label', () => {
    const { getByText } = render(
      <ReflectionRenderer node={makeReflection('Why is this important?')} onSubmit={vi.fn()} />,
    );
    expect(getByText('Why is this important?')).toBeInTheDocument();
  });

  it('renders an associated textarea', () => {
    const { getByRole } = render(<ReflectionRenderer node={makeReflection()} onSubmit={vi.fn()} />);
    const textarea = getByRole('textbox');
    expect(textarea).toBeInTheDocument();
    expect(textarea.getAttribute('id')).not.toBeNull();
    const label = document.querySelector(`label[for="${textarea.id}"]`);
    expect(label).not.toBeNull();
  });

  it('disables submit while textarea is empty', () => {
    const { getByRole } = render(<ReflectionRenderer node={makeReflection()} onSubmit={vi.fn()} />);
    expect(getByRole('button', { name: 'Submit' })).toBeDisabled();
  });

  it('enables submit after entering text', () => {
    const { getByRole } = render(<ReflectionRenderer node={makeReflection()} onSubmit={vi.fn()} />);
    fireEvent.change(getByRole('textbox'), { target: { value: 'I learned X' } });
    expect(getByRole('button', { name: 'Submit' })).not.toBeDisabled();
  });

  it('calls onSubmit with the entered text', () => {
    const onSubmit = vi.fn();
    const { getByRole } = render(
      <ReflectionRenderer node={makeReflection()} onSubmit={onSubmit} />,
    );
    fireEvent.change(getByRole('textbox'), { target: { value: 'My reflection' } });
    fireEvent.click(getByRole('button', { name: 'Submit' }));
    expect(onSubmit).toHaveBeenCalledWith('My reflection');
  });

  it('makes textarea read-only and shows confirmation after submit', () => {
    const { getByRole, getByText } = render(
      <ReflectionRenderer node={makeReflection()} onSubmit={vi.fn()} />,
    );
    fireEvent.change(getByRole('textbox'), { target: { value: 'done' } });
    fireEvent.click(getByRole('button', { name: 'Submit' }));
    expect(getByText(/Saved/)).toBeInTheDocument();
    expect(getByRole('textbox')).toHaveAttribute('readonly');
  });

  it('disables submit for whitespace-only text', () => {
    const { getByRole } = render(<ReflectionRenderer node={makeReflection()} onSubmit={vi.fn()} />);
    fireEvent.change(getByRole('textbox'), { target: { value: '   ' } });
    expect(getByRole('button', { name: 'Submit' })).toBeDisabled();
  });

  it('shows a character count', () => {
    const { getByText, getByRole } = render(
      <ReflectionRenderer node={makeReflection()} onSubmit={vi.fn()} maxLength={100} />,
    );
    fireEvent.change(getByRole('textbox'), { target: { value: 'hello' } });
    expect(getByText('5 / 100')).toBeInTheDocument();
  });

  it('hides character count when showCharCount is false', () => {
    const { queryByText, getByRole } = render(
      <ReflectionRenderer node={makeReflection()} onSubmit={vi.fn()} showCharCount={false} />,
    );
    fireEvent.change(getByRole('textbox'), { target: { value: 'hello' } });
    expect(queryByText(/\/ 4096/)).toBeNull();
  });

  it('saved confirmation has aria-live polite', () => {
    const { getByRole, container } = render(
      <ReflectionRenderer node={makeReflection()} onSubmit={vi.fn()} />,
    );
    fireEvent.change(getByRole('textbox'), { target: { value: 'x' } });
    fireEvent.click(getByRole('button', { name: 'Submit' }));
    const status = container.querySelector('[aria-live="polite"]');
    expect(status).not.toBeNull();
    expect(status?.getAttribute('role')).toBe('status');
  });
});
