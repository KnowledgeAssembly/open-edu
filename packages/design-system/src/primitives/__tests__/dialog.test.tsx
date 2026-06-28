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

describe('Dialog', () => {
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
