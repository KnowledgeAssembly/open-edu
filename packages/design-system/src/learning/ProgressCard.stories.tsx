import type { Meta, StoryObj } from '@storybook/react';
import { ProgressCard } from './ProgressCard';

const meta: Meta<typeof ProgressCard> = {
  title: 'Learning/ProgressCard',
  component: ProgressCard,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof ProgressCard>;

export const InProgress: Story = {
  args: {
    title: 'Introduction to Algebra',
    status: 'in-progress',
    currentSteps: 5,
    totalSteps: 12,
    percent: 42,
    lastTitle: 'Solving Linear Equations',
    lastStudied: '2 hours ago',
    badgeCount: 2,
    onContinue: () => {},
  },
};

export const Completed: Story = {
  args: {
    title: 'Numbers and Operations',
    status: 'completed',
    currentSteps: 10,
    totalSteps: 10,
    percent: 100,
    lastTitle: 'Final Quiz',
    lastStudied: 'Yesterday',
    badgeCount: 3,
    onContinue: () => {},
    onReview: () => {},
  },
};

export const JustStarted: Story = {
  args: {
    title: 'Geometry Basics',
    status: 'in-progress',
    currentSteps: 1,
    totalSteps: 8,
    percent: 12,
    lastTitle: 'Introduction to Shapes',
    badgeCount: 0,
    onContinue: () => {},
  },
};
