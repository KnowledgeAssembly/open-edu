import type { Meta, StoryObj } from '@storybook/react';
import { ProgressBadge } from './ProgressBadge';

const meta: Meta<typeof ProgressBadge> = {
  title: 'Learning/ProgressBadge',
  component: ProgressBadge,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof ProgressBadge>;

export const NotStarted: Story = {
  args: { percentComplete: 0, isCompleted: false },
};

export const InProgress: Story = {
  args: { percentComplete: 42, isCompleted: false },
};

export const Complete: Story = {
  args: { percentComplete: 100, isCompleted: true },
};
