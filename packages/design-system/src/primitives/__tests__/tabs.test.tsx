import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../tabs.jsx';
import { checkAccessibility } from '../../test-utils/a11y.jsx';

describe('Tabs', () => {
  it('has no accessibility violations', async () => {
    await checkAccessibility(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content</TabsContent>
      </Tabs>,
    );
  });
  it('renders tabs with trigger and content', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>,
    );
    expect(screen.getByText('Tab 1')).toBeDefined();
    expect(screen.getByText('Tab 2')).toBeDefined();
  });

  it('sets displayName', () => {
    expect(TabsList.displayName).toBe('TabsList');
    expect(TabsTrigger.displayName).toBe('TabsTrigger');
    expect(TabsContent.displayName).toBe('TabsContent');
  });
});
