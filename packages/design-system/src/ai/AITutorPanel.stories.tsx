import type { Meta, StoryObj } from '@storybook/react';
import { AITutorPanel } from './AITutorPanel';

const meta: Meta<typeof AITutorPanel> = {
  title: 'AI/AITutorPanel',
  component: AITutorPanel,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof AITutorPanel>;

export const Visible: Story = {
  args: {
    visible: true,
  },
};

export const Hidden: Story = {
  args: {
    visible: false,
  },
};
