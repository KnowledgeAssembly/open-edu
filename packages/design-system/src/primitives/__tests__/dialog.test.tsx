import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '../dialog.jsx';
import { checkAccessibility } from '../../test-utils/a11y.jsx';

describe('Dialog', () => {
  it('has no accessibility violations in closed state', async () => {
    await checkAccessibility(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Title</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    );
  });

  it('has no accessibility violations in open state', async () => {
    await checkAccessibility(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dialog title</DialogTitle>
            <DialogDescription>Dialog description</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    );
  });
  it('renders trigger and content', () => {
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription>Description</DialogDescription>
          </DialogHeader>
          <DialogFooter>Footer</DialogFooter>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByText('Open')).toBeDefined();
  });

  it('sets displayName on subcomponents', () => {
    expect(DialogTitle.displayName).toBe('DialogTitle');
    expect(DialogDescription.displayName).toBe('DialogDescription');
  });
});
