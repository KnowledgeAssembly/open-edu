import type { Meta, StoryObj } from '@storybook/react';
import { SectionDivider } from './SectionDivider';

const meta: Meta<typeof SectionDivider> = {
  title: 'Visual DNA/Patterns/SectionDivider',
  component: SectionDivider,
  argTypes: {
    density: { control: 'select', options: ['minimal', 'medium', 'dense'] },
    animated: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof SectionDivider>;

export const Minimal: Story = {
  args: { density: 'minimal' },
};

export const Medium: Story = {
  args: { density: 'medium' },
};

export const Dense: Story = {
  args: { density: 'dense' },
};

export const Animated: Story = {
  args: { density: 'medium', animated: true },
};

export const InContext: Story = {
  render: () => (
    <div>
      <div
        style={{
          background: 'white',
          borderRadius: 12,
          padding: 24,
          marginBottom: 16,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Section One</h3>
        <p style={{ fontSize: 14, color: '#666', margin: '8px 0 0' }}>Content above the divider.</p>
      </div>
      <SectionDivider density="minimal" />
      <div
        style={{
          background: 'white',
          borderRadius: 12,
          padding: 24,
          marginTop: 16,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Section Two</h3>
        <p style={{ fontSize: 14, color: '#666', margin: '8px 0 0' }}>Content below the divider.</p>
      </div>
    </div>
  ),
};
