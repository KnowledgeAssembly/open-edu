import type { Meta, StoryObj } from '@storybook/react';
import { Toaster } from './notification';
import { toast } from 'sonner';

const meta: Meta<typeof Toaster> = {
  title: 'Primitives/Notification',
  component: Toaster,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof Toaster>;

export const Default: Story = {
  render: () => (
    <>
      <button onClick={() => toast('Event has been created')}>Show Toast</button>
      <Toaster />
    </>
  ),
};
