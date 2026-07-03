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

export const AllVariants: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <GeoPrimitive size="lg" variant="default" />
      <GeoPrimitive size="lg" variant="muted" />
      <GeoPrimitive size="lg" variant="accent" />
    </div>
  ),
};

export const Grid: Story = {
  name: 'Assembly: Grid',
  render: () => (
    <div className="grid grid-cols-4 gap-2">
      {Array.from({ length: 12 }).map((_, i) => (
        <GeoPrimitive
          key={i}
          size="md"
          variant={i % 3 === 0 ? 'accent' : i % 3 === 1 ? 'muted' : 'default'}
        />
      ))}
    </div>
  ),
};

export const Orbital: Story = {
  name: 'Assembly: Orbital',
  render: () => (
    <div className="relative w-36 h-36">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <GeoPrimitive size="xl" variant="accent" />
      </div>
      {[0, 60, 120, 180, 240, 300].map((angle) => (
        <div
          key={angle}
          className="absolute"
          style={{
            top: `${50 + 38 * Math.sin((angle * Math.PI) / 180)}%`,
            left: `${50 + 38 * Math.cos((angle * Math.PI) / 180)}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <GeoPrimitive size="sm" variant="muted" />
        </div>
      ))}
    </div>
  ),
};

export const Linear: Story = {
  name: 'Assembly: Linear',
  render: () => (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center">
          <GeoPrimitive size="md" variant={i === 2 ? 'accent' : 'muted'} />
          {i < 4 && (
            <svg width="16" height="2" className="mx-1">
              <line
                x1="0"
                y1="1"
                x2="16"
                y2="1"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeDasharray="3,3"
                className="text-border"
              />
            </svg>
          )}
        </div>
      ))}
    </div>
  ),
};

export const Scale: Story = {
  name: 'Assembly: Scale',
  render: () => (
    <div className="flex items-end gap-3">
      <GeoPrimitive size="xs" />
      <GeoPrimitive size="sm" />
      <GeoPrimitive size="md" />
      <GeoPrimitive size="lg" />
      <GeoPrimitive size="xl" />
    </div>
  ),
};
