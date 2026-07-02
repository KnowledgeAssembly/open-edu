import type { Meta, StoryObj } from '@storybook/react';
import { CourseCard } from './CourseCard';

const mockManifest = {
  id: 'course-1',
  title: 'Introduction to Mathematics',
  version: '1.0.0',
  author: 'Jane Doe',
  entry: 'index.json',
};

const meta: Meta<typeof CourseCard> = {
  title: 'Learning/CourseCard',
  component: CourseCard,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof CourseCard>;

export const NotStarted: Story = {
  args: {
    manifest: mockManifest,
    nodeCount: 12,
    badgeCount: 5,
    earnedBadgeCount: 0,
    progress: null,
    onStart: () => {},
  },
};

export const InProgress: Story = {
  args: {
    manifest: mockManifest,
    nodeCount: 12,
    badgeCount: 5,
    earnedBadgeCount: 2,
    progress: {
      packageId: 'course-1',
      packageVersion: '1.0.0',
      currentNodeId: 'node-5',
      visitedNodes: ['node-1', 'node-2', 'node-3', 'node-4', 'node-5'],
      scores: {},
      isCompleted: false,
      updatedAt: '2026-01-01T00:00:00Z',
    },
    onStart: () => {},
  },
};

export const Completed: Story = {
  args: {
    manifest: mockManifest,
    nodeCount: 12,
    badgeCount: 5,
    earnedBadgeCount: 5,
    progress: {
      packageId: 'course-1',
      packageVersion: '1.0.0',
      currentNodeId: 'node-12',
      visitedNodes: Array.from({ length: 12 }, (_, i) => `node-${i + 1}`),
      scores: {},
      isCompleted: true,
      updatedAt: '2026-01-01T00:00:00Z',
    },
    onStart: () => {},
  },
};
