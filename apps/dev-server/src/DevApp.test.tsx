import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { LoadedPackage } from '@open-edu/core';

const mockPackageData: LoadedPackage = {
  rootDir: '/test',
  manifest: {
    id: 'test',
    title: 'Test Package',
    version: '1.0.0',
    author: 'Test',
    entry: 'nodes/lesson.md',
  },
  workflow: {
    routing: {
      'nodes/lesson.md': { onComplete: 'COMPLETED' },
    },
  },
  rewards: null,
  nodes: [
    {
      path: '/test/nodes/lesson.md',
      relativePath: 'nodes/lesson.md',
      content: '# Hello\nWorld',
      node: { type: 'lesson' },
    },
  ],
  assetPaths: [],
};

vi.mock('virtual:open-edu-package', () => ({
  packageData: mockPackageData,
}));

const { DevApp } = await import('./DevApp');

describe('DevApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the package title from the manifest', async () => {
    render(<DevApp />);
    expect(await screen.findByText('Test Package')).toBeInTheDocument();
  });

  it('should render the inspector panel', async () => {
    render(<DevApp />);
    expect(
      await screen.findByRole('complementary', { name: 'Developer inspector panel' }),
    ).toBeInTheDocument();
  });

  it('should render telemetry tab button', async () => {
    render(<DevApp />);
    expect(screen.getByText('Telemetry')).toBeInTheDocument();
  });

  it('should render accessibility tab button', async () => {
    render(<DevApp />);
    expect(screen.getByText('A11y')).toBeInTheDocument();
  });
});
