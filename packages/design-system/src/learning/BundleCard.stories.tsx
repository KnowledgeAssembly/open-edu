import type { Meta, StoryObj } from '@storybook/react';
import { BundleCard } from './BundleCard';

const meta: Meta<typeof BundleCard> = {
  title: 'Learning/BundleCard',
  component: BundleCard,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof BundleCard>;

export const Default: Story = {
  args: {
    title: 'Mathematics Fundamentals',
    description: 'A comprehensive introduction to core mathematical concepts.',
    moduleCount: 4,
    activityCount: 40,
    completedModules: 0,
    totalModules: 4,
    isStarted: false,
    onStart: () => {},
  },
};

export const WithProgress: Story = {
  args: {
    title: 'Algebra Mastery',
    description: 'From linear equations to quadratic functions.',
    moduleCount: 3,
    activityCount: 24,
    completedModules: 2,
    totalModules: 3,
    isStarted: true,
    onStart: () => {},
  },
};

export const Completed: Story = {
  args: {
    title: 'Quick Start Guide',
    moduleCount: 1,
    activityCount: 8,
    completedModules: 1,
    totalModules: 1,
    isStarted: true,
    onStart: () => {},
  },
};

export const Locked: Story = {
  args: {
    title: 'Advanced Topics',
    description: 'Complete prerequisite bundles to unlock.',
    moduleCount: 5,
    activityCount: 50,
    completedModules: 0,
    totalModules: 5,
    isStarted: false,
    onStart: () => {},
  },
};
