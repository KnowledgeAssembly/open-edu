import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../card.jsx';
import { checkAccessibility } from '../../test-utils/a11y.jsx';

describe('Card', () => {
  it('has no accessibility violations', async () => {
    await checkAccessibility(
      <Card>
        <CardContent>Content</CardContent>
      </Card>,
    );
  });

  it('has no accessibility violations for CardHeader', async () => {
    await checkAccessibility(
      <Card>
        <CardHeader>Header</CardHeader>
      </Card>,
    );
  });

  it('has no accessibility violations for CardTitle', async () => {
    await checkAccessibility(
      <Card>
        <CardTitle>Title</CardTitle>
      </Card>,
    );
  });

  it('has no accessibility violations for CardDescription', async () => {
    await checkAccessibility(
      <Card>
        <CardTitle>Title</CardTitle>
        <CardDescription>Description</CardDescription>
      </Card>,
    );
  });

  it('has no accessibility violations for CardFooter', async () => {
    await checkAccessibility(
      <Card>
        <CardContent>Content</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>,
    );
  });
  it('renders Card with content', () => {
    render(<Card>Content</Card>);
    expect(screen.getByText('Content')).toBeDefined();
  });

  it('renders all Card subcomponents', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Description</CardDescription>
        </CardHeader>
        <CardContent>Body</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>,
    );
    expect(screen.getByText('Title')).toBeDefined();
    expect(screen.getByText('Description')).toBeDefined();
    expect(screen.getByText('Body')).toBeDefined();
    expect(screen.getByText('Footer')).toBeDefined();
  });

  it('sets displayName on all subcomponents', () => {
    expect(Card.displayName).toBe('Card');
    expect(CardHeader.displayName).toBe('CardHeader');
    expect(CardTitle.displayName).toBe('CardTitle');
    expect(CardDescription.displayName).toBe('CardDescription');
    expect(CardContent.displayName).toBe('CardContent');
    expect(CardFooter.displayName).toBe('CardFooter');
  });
});
