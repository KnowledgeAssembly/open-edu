import type { Meta, StoryObj } from '@storybook/react';
import { CourseCardWithModule } from './CourseCardWithModule';

const meta: Meta<typeof CourseCardWithModule> = {
  title: 'Visual DNA/Patterns/CourseCardWithModule',
  component: CourseCardWithModule,
  argTypes: {
    badgeCount: { control: { type: 'number', min: 0, max: 6 } },
  },
};

export default meta;
type Story = StoryObj<typeof CourseCardWithModule>;

function MockCard({ title }: { title: string }) {
  return (
    <div
      style={{
        border: '1px solid #e0e0e0',
        borderRadius: '12px',
        padding: '20px 60px 20px 20px',
        background: 'white',
        position: 'relative',
        minWidth: 260,
      }}
    >
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{title}</h3>
      <p style={{ fontSize: 14, color: '#666', margin: '8px 0' }}>Course description here</p>
      <span style={{ fontSize: 12, color: '#999' }}>8 lessons</span>
    </div>
  );
}

export const NotStarted: Story = {
  args: {
    progress: null,
    badgeCount: 0,
  },
  render: (args) => (
    <CourseCardWithModule {...args}>
      <MockCard title="Not Started" />
    </CourseCardWithModule>
  ),
};

export const InProgress: Story = {
  args: {
    progress: { visitedNodes: ['a', 'b'], isCompleted: false },
    badgeCount: 0,
  },
  render: (args) => (
    <CourseCardWithModule {...args}>
      <MockCard title="In Progress" />
    </CourseCardWithModule>
  ),
};

export const Complete: Story = {
  args: {
    progress: { visitedNodes: ['a', 'b', 'c'], isCompleted: true },
    badgeCount: 0,
  },
  render: (args) => (
    <CourseCardWithModule {...args}>
      <MockCard title="Complete" />
    </CourseCardWithModule>
  ),
};

export const BadgeEarned: Story = {
  args: {
    progress: { visitedNodes: ['a', 'b', 'c'], isCompleted: true },
    badgeCount: 1,
  },
  render: (args) => (
    <CourseCardWithModule {...args}>
      <MockCard title="Badge Earned" />
    </CourseCardWithModule>
  ),
};

export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      <CourseCardWithModule progress={null}>
        <MockCard title="Not Started" />
      </CourseCardWithModule>
      <CourseCardWithModule progress={{ visitedNodes: ['a', 'b'], isCompleted: false }}>
        <MockCard title="In Progress" />
      </CourseCardWithModule>
      <CourseCardWithModule progress={{ visitedNodes: ['a', 'b', 'c'], isCompleted: true }}>
        <MockCard title="Complete" />
      </CourseCardWithModule>
      <CourseCardWithModule
        progress={{ visitedNodes: ['a', 'b', 'c'], isCompleted: true }}
        badgeCount={1}
      >
        <MockCard title="Badge Earned" />
      </CourseCardWithModule>
    </div>
  ),
};

export const WithCustomCard: Story = {
  args: {
    progress: { visitedNodes: ['a'], isCompleted: false },
    badgeCount: 0,
  },
  render: (args) => (
    <CourseCardWithModule {...args}>
      <div
        style={{
          border: '2px dashed #6d28d9',
          borderRadius: '12px',
          padding: '20px 60px 20px 20px',
          background: '#f9f5ff',
          minWidth: 260,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Custom Content</h3>
        <p style={{ fontSize: 14, color: '#666', margin: '8px 0' }}>Any child component works</p>
      </div>
    </CourseCardWithModule>
  ),
};
