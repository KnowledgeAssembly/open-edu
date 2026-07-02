import type { Meta, StoryObj } from '@storybook/react';
import { ThinkingIndicator } from './ThinkingIndicator';

const meta: Meta<typeof ThinkingIndicator> = {
  title: 'AI/ThinkingIndicator',
  component: ThinkingIndicator,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof ThinkingIndicator>;

export const Default: Story = {};

export const CustomLabel: Story = {
  args: {
    label: 'Processing your question...',
  },
};
