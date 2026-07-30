import type { Meta, StoryObj } from '@storybook/react';
import { BundleOverview } from './BundleOverview';

const meta: Meta<typeof BundleOverview> = {
  title: 'Learning/BundleOverview',
  component: BundleOverview,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof BundleOverview>;

export const Default: Story = {
  args: {
    bundleTitle: 'Mathematics Fundamentals',
    bundleId: 'math-fundamentals',
    description: 'A comprehensive introduction to core mathematical concepts.',
    modules: [
      {
        id: 'mod-1',
        title: 'Numbers and Operations',
        chapterCode: 'Ch. 1',
        status: 'completed',
        nodeCount: 10,
        completedNodeCount: 10,
        estimatedDuration: 45,
      },
      {
        id: 'mod-2',
        title: 'Algebra Basics',
        chapterCode: 'Ch. 2',
        status: 'in_progress',
        nodeCount: 8,
        completedNodeCount: 3,
        estimatedDuration: 30,
      },
      {
        id: 'mod-3',
        title: 'Geometry Introduction',
        chapterCode: 'Ch. 3',
        status: 'unlocked',
        nodeCount: 12,
        completedNodeCount: 0,
        estimatedDuration: 60,
      },
      {
        id: 'mod-4',
        title: 'Statistics and Probability',
        chapterCode: 'Ch. 4',
        status: 'locked',
        nodeCount: 10,
        completedNodeCount: 0,
        estimatedDuration: 50,
      },
    ],
    onStartModule: (moduleId) => console.log('Start module:', moduleId),
    onContinueModule: (moduleId) => console.log('Continue module:', moduleId),
    onBackToCatalog: () => console.log('Back to catalog'),
  },
};

export const NoModules: Story = {
  args: {
    bundleTitle: 'Empty Bundle',
    bundleId: 'empty',
    description: 'This bundle has no modules yet.',
    modules: [],
    onStartModule: () => {},
    onBackToCatalog: () => {},
  },
};
