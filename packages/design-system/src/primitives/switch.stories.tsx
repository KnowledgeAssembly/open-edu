import type { Meta, StoryObj } from '@storybook/react';
import { Switch } from './switch';

const meta: Meta<typeof Switch> = {
  title: 'Primitives/Switch',
  component: Switch,
  tags: ['autodocs'],
  argTypes: { disabled: { control: 'boolean' } },
};
export default meta;
type Story = StoryObj<typeof Switch>;

export const Default: Story = {};
export const Disabled: Story = { args: { disabled: true } };
