import type { Meta, StoryObj } from '@storybook/react';
import { Tag } from './tag';

const meta: Meta<typeof Tag> = {
  title: 'Primitives/Tag',
  component: Tag,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof Tag>;

export const Default: Story = { args: { children: 'Tag' } };
