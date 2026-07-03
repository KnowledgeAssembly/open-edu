import type { Meta, StoryObj } from '@storybook/react';
import { OpenModule } from './open-module';

const meta: Meta<typeof OpenModule> = {
  title: 'Visual DNA/Open Module',
  component: OpenModule,
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    satellites: { control: { type: 'number', min: 2, max: 6 } },
    state: { control: 'select', options: ['default', 'hover', 'active'] },
  },
};

export default meta;
type Story = StoryObj<typeof OpenModule>;

export const Default: Story = {
  args: { size: 'md', satellites: 3, state: 'default' },
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-end gap-8">
      <div className="text-center">
        <OpenModule size="sm" satellites={2} />
        <p className="text-xs text-gray-500 mt-1">sm (2)</p>
      </div>
      <div className="text-center">
        <OpenModule size="md" satellites={3} />
        <p className="text-xs text-gray-500 mt-1">md (3)</p>
      </div>
      <div className="text-center">
        <OpenModule size="lg" satellites={5} />
        <p className="text-xs text-gray-500 mt-1">lg (5)</p>
      </div>
    </div>
  ),
};

export const SatelliteCounts: Story = {
  name: 'Satellite Counts 2–6',
  render: () => (
    <div className="flex items-end gap-6">
      {[2, 3, 4, 5, 6].map((count) => (
        <div key={count} className="text-center">
          <OpenModule size="md" satellites={count} />
          <p className="text-xs text-gray-500 mt-1">{count}</p>
        </div>
      ))}
    </div>
  ),
};

export const Active: Story = {
  name: 'State: Active',
  render: () => (
    <div className="flex gap-8">
      <div className="text-center">
        <OpenModule size="md" satellites={5} state="active" />
        <p className="text-xs text-gray-500 mt-1">active</p>
      </div>
    </div>
  ),
};

export const Hover: Story = {
  name: 'State: Hover',
  args: { size: 'lg', satellites: 4, state: 'hover' },
};

export const Incomplete: Story = {
  name: 'Style: Incomplete (2 satellites)',
  args: { size: 'md', satellites: 2, state: 'default' },
};

export const Complete: Story = {
  name: 'Style: Complete (6 satellites)',
  args: { size: 'lg', satellites: 6, state: 'default' },
};
