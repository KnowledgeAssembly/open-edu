import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../dropdown-menu.jsx';
import { checkAccessibility } from '../../test-utils/a11y.jsx';

describe('DropdownMenu', () => {
  it('has no accessibility violations in closed state', async () => {
    await checkAccessibility(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
  });

  it('has no accessibility violations in open state', async () => {
    await checkAccessibility(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Item 1</DropdownMenuItem>
          <DropdownMenuItem>Item 2</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
  });
  it('renders trigger', () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Item 1</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    expect(screen.getByText('Menu')).toBeDefined();
  });

  it('sets displayName', () => {
    expect(DropdownMenuTrigger.displayName).toBe('DropdownMenuTrigger');
    expect(DropdownMenuContent.displayName).toBe('DropdownMenuContent');
    expect(DropdownMenuItem.displayName).toBe('DropdownMenuItem');
  });
});
