import type { Meta, StoryObj } from '@storybook/react';
import { BundleModuleIndicator } from './BundleModuleIndicator';

const meta: Meta<typeof BundleModuleIndicator> = {
  title: 'Visual DNA/Patterns/BundleModuleIndicator',
  component: BundleModuleIndicator,
  argTypes: {
    status: {
      control: 'select',
      options: ['locked', 'unlocked', 'in-progress', 'completed'],
    },
    completionPercent: { control: { type: 'number', min: 0, max: 100 } },
  },
};

export default meta;
type Story = StoryObj<typeof BundleModuleIndicator>;

export const Locked: Story = {
  args: { status: 'locked' },
};

export const Unlocked: Story = {
  args: { status: 'unlocked' },
};

export const InProgress: Story = {
  args: { status: 'in-progress', completionPercent: 42 },
};

export const Completed: Story = {
  args: { status: 'completed' },
};

export const AllStatuses: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <BundleModuleIndicator status="locked" />
        <span style={{ fontSize: 14 }}>Locked — 2 satellites, 30% opacity</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <BundleModuleIndicator status="unlocked" />
        <span style={{ fontSize: 14 }}>Unlocked — 3 satellites, 50% opacity</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <BundleModuleIndicator status="in-progress" completionPercent={67} />
        <span style={{ fontSize: 14 }}>In Progress — 4 satellites, 70% opacity</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <BundleModuleIndicator status="completed" />
        <span style={{ fontSize: 14 }}>Completed — 5 satellites, 100% opacity</span>
      </div>
    </div>
  ),
};
