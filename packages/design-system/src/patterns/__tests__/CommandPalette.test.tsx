import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CommandPalette, CommandGroup, CommandItem, CommandEmpty } from '../CommandPalette.js';
import { checkAccessibility } from '../../test-utils/a11y.js';

describe('CommandPalette', () => {
  it('does not render when closed', () => {
    render(<CommandPalette open={false} onOpenChange={vi.fn()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders when open', () => {
    render(<CommandPalette open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders children when open', () => {
    render(
      <CommandPalette open={true} onOpenChange={vi.fn()}>
        <CommandItem onSelect={vi.fn()}>Home</CommandItem>
      </CommandPalette>,
    );
    expect(screen.getByText('Home')).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(<CommandPalette open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByPlaceholderText('Search commands...')).toBeInTheDocument();
  });

  it('calls onOpenChange on Escape', () => {
    const onOpenChange = vi.fn();
    render(<CommandPalette open={true} onOpenChange={onOpenChange} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('calls onOpenChange when backdrop clicked', () => {
    const onOpenChange = vi.fn();
    render(<CommandPalette open={true} onOpenChange={onOpenChange} />);
    const backdrop = screen.getByRole('dialog').querySelector('[aria-hidden="true"]')!;
    fireEvent.click(backdrop);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('renders with custom placeholder', () => {
    render(<CommandPalette open={true} onOpenChange={vi.fn()} placeholder="Type to search..." />);
    expect(screen.getByPlaceholderText('Type to search...')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    await checkAccessibility(<CommandPalette open={true} onOpenChange={vi.fn()} />);
  });
});

describe('CommandGroup', () => {
  it('renders heading', () => {
    render(
      <CommandGroup heading="Navigation">
        <div>Item</div>
      </CommandGroup>,
    );
    expect(screen.getByText('Navigation')).toBeInTheDocument();
  });

  it('renders children', () => {
    render(
      <CommandGroup>
        <div data-testid="child">Item</div>
      </CommandGroup>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });
});

describe('CommandItem', () => {
  it('renders children', () => {
    render(<CommandItem onSelect={vi.fn()}>Home</CommandItem>);
    expect(screen.getByText('Home')).toBeInTheDocument();
  });

  it('calls onSelect on click', () => {
    const onSelect = vi.fn();
    render(<CommandItem onSelect={onSelect}>Home</CommandItem>);
    fireEvent.click(screen.getByText('Home'));
    expect(onSelect).toHaveBeenCalled();
  });
});

describe('CommandEmpty', () => {
  it('renders default text', () => {
    render(<CommandEmpty />);
    expect(screen.getByText('No results found.')).toBeInTheDocument();
  });

  it('renders custom text', () => {
    render(<CommandEmpty>Nothing here</CommandEmpty>);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });
});
