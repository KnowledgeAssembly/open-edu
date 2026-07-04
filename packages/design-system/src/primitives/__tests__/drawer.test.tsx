import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '../drawer.jsx';
import { checkAccessibility } from '@open-edu/design-system/test-utils';

describe('Drawer', () => {
  it('has no accessibility violations in closed state', async () => {
    await checkAccessibility(
      <Drawer>
        <DrawerTrigger>Open</DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Title</DrawerTitle>
          </DrawerHeader>
        </DrawerContent>
      </Drawer>,
    );
  });

  it('has no accessibility violations in open state', async () => {
    await checkAccessibility(
      <Drawer defaultOpen>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Drawer title</DrawerTitle>
            <DrawerDescription>Drawer description</DrawerDescription>
          </DrawerHeader>
        </DrawerContent>
      </Drawer>,
    );
  });
  it('renders trigger', () => {
    render(
      <Drawer>
        <DrawerTrigger>Open</DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Title</DrawerTitle>
            <DrawerDescription>Description</DrawerDescription>
          </DrawerHeader>
        </DrawerContent>
      </Drawer>,
    );
    expect(screen.getByText('Open')).toBeDefined();
  });

  it('sets displayName', () => {
    expect(Drawer.displayName).toBe('Drawer');
    expect(DrawerContent.displayName).toBe('DrawerContent');
    expect(DrawerTitle.displayName).toBe('DrawerTitle');
    expect(DrawerDescription.displayName).toBe('DrawerDescription');
  });
});
