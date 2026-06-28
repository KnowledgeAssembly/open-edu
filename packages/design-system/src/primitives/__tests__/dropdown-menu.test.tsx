import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../dropdown-menu.jsx';

describe('DropdownMenu', () => {
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
