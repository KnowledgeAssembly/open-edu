import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../accordion.jsx';

describe('Accordion', () => {
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
