import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { I18nProvider } from '@open-edu/i18n';
import learnerDict from '@open-edu/i18n/locales/en/learner.json';
import { ResetConfirmDialog } from '../ResetConfirmDialog';

function renderDialog(props: Partial<{ open: boolean; isBundle: boolean; courseTitle: string }> = {}) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();

  render(
    <I18nProvider locale="en" dictionaries={{ en: { learner: learnerDict } }}>
      <ResetConfirmDialog
        open={props.open ?? true}
        isBundle={props.isBundle ?? false}
        courseTitle={props.courseTitle ?? 'Test Course'}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    </I18nProvider>,
  );

  return { onConfirm, onCancel };
}

describe('ResetConfirmDialog', () => {
  it('renders when open', () => {
    renderDialog();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    renderDialog({ open: false });
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', async () => {
    const { onConfirm } = renderDialog();
    await userEvent.click(screen.getByTestId('reset-confirm-button'));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const { onCancel } = renderDialog();
    await userEvent.click(screen.getByTestId('reset-cancel-button'));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('has accessible dialog semantics', () => {
    renderDialog();
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveAttribute('aria-labelledby');
    expect(dialog).toHaveAttribute('aria-describedby');
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <I18nProvider locale="en" dictionaries={{ en: { learner: learnerDict } }}>
        <ResetConfirmDialog
          open={true}
          isBundle={false}
          courseTitle="Test"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      </I18nProvider>,
    );
    const result = await axe.run(container);
    expect(result.violations).toHaveLength(0);
  });
});
