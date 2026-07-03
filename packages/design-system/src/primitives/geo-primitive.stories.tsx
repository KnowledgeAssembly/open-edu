import type { Meta, StoryObj } from '@storybook/react';
import { GeoPrimitive } from './geo-primitive';

const meta: Meta<typeof GeoPrimitive> = {
  title: 'Visual DNA/Geometric Primitive',
  component: GeoPrimitive,
  argTypes: {
    size: { control: 'select', options: ['xs', 'sm', 'md', 'lg', 'xl'] },
    variant: { control: 'select', options: ['default', 'muted', 'accent'] },
  },
};

export default meta;
type Story = StoryObj<typeof GeoPrimitive>;

export const Default: Story = {
  args: { size: 'md', variant: 'default' },
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-end gap-4">
      <GeoPrimitive size="xs" />
      <GeoPrimitive size="sm" />
      <GeoPrimitive size="md" />
      <GeoPrimitive size="lg" />
      <GeoPrimitive size="xl" />
    </div>
  ),
};

export const Assembly: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: 12 }).map((_, i) => (
        <GeoPrimitive key={i} size="md" />
      ))}
    </div>
  ),
};
