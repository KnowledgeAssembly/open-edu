import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DefinitionBlock } from '../DefinitionBlock.js';
import { checkAccessibility } from '@open-edu/design-system/test-utils';

describe('DefinitionBlock', () => {
  it('renders term', () => {
    render(<DefinitionBlock term="Photosynthesis">Process description</DefinitionBlock>);
    expect(screen.getByText('Photosynthesis')).toBeInTheDocument();
  });

  it('renders children', () => {
    render(
      <DefinitionBlock term="Term">
        <span>Definition text</span>
      </DefinitionBlock>,
    );
    expect(screen.getByText('Definition text')).toBeInTheDocument();
  });

  it('applies className', () => {
    render(
      <DefinitionBlock term="Term" className="custom-class">
        Def
      </DefinitionBlock>,
    );
    expect(screen.getByTestId('definition-block')).toHaveClass('custom-class');
  });

  it('has no accessibility violations', async () => {
    await checkAccessibility(
      <DefinitionBlock term="Accessibility">Test definition</DefinitionBlock>,
    );
  });
});
