import type { Meta, StoryObj } from '@storybook/react';
import { Progress } from './progress';

const meta: Meta<typeof Progress> = {
  title: 'Primitives/Progress',
  component: Progress,
  tags: ['autodocs'],
  argTypes: {
    value: { control: { type: 'range', min: 0, max: 100 } },
  },
};
export default meta;
type Story = StoryObj<typeof Progress>;

export const Default: Story = { args: { value: 60, total: 100 } };
export const Empty: Story = { args: { value: 0, total: 100 } };
export const Complete: Story = { args: { value: 100, total: 100 } };
