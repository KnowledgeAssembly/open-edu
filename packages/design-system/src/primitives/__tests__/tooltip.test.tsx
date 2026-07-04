import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '../tooltip.jsx';
import { checkAccessibility } from '@open-edu/design-system/test-utils';

describe('Tooltip', () => {
  it('has no accessibility violations in closed state', async () => {
    await checkAccessibility(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>Hover</TooltipTrigger>
          <TooltipContent>Tooltip content</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
  });

  it('has no accessibility violations in open state', async () => {
    await checkAccessibility(
      <TooltipProvider>
        <Tooltip defaultOpen>
          <TooltipTrigger>Hover</TooltipTrigger>
          <TooltipContent role="tooltip">Tooltip content</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
  });
  it('renders trigger', () => {
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Tooltip content</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
    expect(screen.getByText('Hover me')).toBeDefined();
  });

  it('sets displayName', () => {
    expect(TooltipProvider.displayName).toBe('TooltipProvider');
    expect(TooltipContent.displayName).toBe('TooltipContent');
  });
});
