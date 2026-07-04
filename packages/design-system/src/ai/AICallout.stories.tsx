import type { Meta, StoryObj } from '@storybook/react';
import { AICallout } from './AICallout';

const meta: Meta<typeof AICallout> = {
  title: 'AI/AICallout',
  component: AICallout,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof AICallout>;

export const Default: Story = {
  args: {
    title: 'Key Insight',
    children: 'Photosynthesis converts light energy into chemical energy stored in glucose.',
  },
};

export const WithIcon: Story = {
  args: {
    icon: '💡',
    title: 'Did you know?',
    children:
      "The mitochondria is often called the powerhouse of the cell because it generates most of the cell's supply of ATP.",
  },
};

export const WithLongContent: Story = {
  args: {
    icon: '📝',
    title: 'Study Tip',
    children:
      'When learning about fractions, try visualizing them as parts of a pizza. This makes it easier to understand concepts like 1/4 + 1/4 = 1/2. You can also use a number line to see how fractions relate to each other.',
  },
};
