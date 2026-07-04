import type { Meta, StoryObj } from '@storybook/react';
import { AssemblyFlow } from './assembly-flow';

const meta: Meta<typeof AssemblyFlow> = {
  title: 'Visual DNA/Assembly Flow',
  component: AssemblyFlow,
  argTypes: {
    density: { control: 'select', options: ['dense', 'medium', 'minimal'] },
    animated: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof AssemblyFlow>;

export const Default: Story = {
  args: { density: 'medium', animated: false },
};

export const AllDensities: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      <div>
        <p className="mb-2 text-sm font-medium text-gray-500">Dense</p>
        <AssemblyFlow density="dense" />
      </div>
      <div>
        <p className="mb-2 text-sm font-medium text-gray-500">Medium</p>
        <AssemblyFlow density="medium" />
      </div>
      <div>
        <p className="mb-2 text-sm font-medium text-gray-500">Minimal</p>
        <AssemblyFlow density="minimal" />
      </div>
    </div>
  ),
};

export const Animated: Story = {
  name: 'Animated (flowing path)',
  args: { density: 'medium', animated: true },
};

export const AnimatedDense: Story = {
  name: 'Animated: Dense',
  args: { density: 'dense', animated: true },
};
