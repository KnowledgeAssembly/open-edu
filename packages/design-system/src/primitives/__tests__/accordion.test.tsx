import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../accordion.jsx';
import { checkAccessibility } from '../../test-utils/a11y.jsx';

describe('Accordion', () => {
  it('has no accessibility violations', async () => {
    await checkAccessibility(
      <Accordion type="single">
        <AccordionItem value="item-1">
          <AccordionTrigger>Trigger</AccordionTrigger>
          <AccordionContent>Content</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );
  });
  it('renders accordion items', () => {
    render(
      <Accordion type="single">
        <AccordionItem value="item-1">
          <AccordionTrigger>Section 1</AccordionTrigger>
          <AccordionContent>Content 1</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );
    expect(screen.getByText('Section 1')).toBeDefined();
  });

  it('sets displayName', () => {
    expect(AccordionItem.displayName).toBe('AccordionItem');
    expect(AccordionTrigger.displayName).toBe('AccordionTrigger');
    expect(AccordionContent.displayName).toBe('AccordionContent');
  });
});
