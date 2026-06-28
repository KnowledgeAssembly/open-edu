import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '../tooltip.jsx';
import { checkAccessibility } from '../../test-utils/a11y.jsx';

describe('Tooltip', () => {
  it('has no accessibility violations', async () => {
    await checkAccessibility(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>Hover</TooltipTrigger>
          <TooltipContent>Tooltip content</TooltipContent>
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
