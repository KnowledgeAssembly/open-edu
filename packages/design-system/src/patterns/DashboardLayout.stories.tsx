import type { Meta, StoryObj } from '@storybook/react';
import { DashboardLayout } from './DashboardLayout';

const DashboardHeader = () => (
  <div className="bg-surface h-16 flex items-center justify-between px-6 border-b border-outline-variant">
    <h1 className="text-lg font-bold text-on-surface">Dashboard</h1>
    <div className="flex items-center gap-3">
      <span className="text-sm text-on-surface-variant">Welcome, Sarthak</span>
      <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-xs font-bold text-on-primary-container">
        S
      </div>
    </div>
  </div>
);

const DashboardSidebar = () => (
  <div>
    <h3 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-3">
      Navigation
    </h3>
    <ul className="list-none p-0 m-0 space-y-1 text-sm">
      <li className="px-3 py-2 rounded bg-primary-container text-on-primary-container font-medium cursor-pointer">
        Overview
      </li>
      <li className="px-3 py-2 rounded text-on-surface-variant hover:bg-surface-container-high cursor-pointer">
        My Courses
      </li>
      <li className="px-3 py-2 rounded text-on-surface-variant hover:bg-surface-container-high cursor-pointer">
        Achievements
      </li>
      <li className="px-3 py-2 rounded text-on-surface-variant hover:bg-surface-container-high cursor-pointer">
        Certificates
      </li>
    </ul>
  </div>
);

const DashboardContent = () => (
  <div className="space-y-6">
    <h2 className="text-xl font-bold text-on-surface">Welcome back!</h2>
    <div className="grid grid-cols-3 gap-4">
      {[
        { title: 'Courses In Progress', value: '3', color: 'bg-primary-container' },
        { title: 'Completed', value: '12', color: 'bg-tertiary-container' },
        { title: 'Hours Learned', value: '47', color: 'bg-secondary-container' },
      ].map((card) => (
        <div key={card.title} className={`${card.color} rounded-lg p-4`}>
          <p className="text-xs text-on-surface-variant">{card.title}</p>
          <p className="text-2xl font-bold text-on-surface mt-1">{card.value}</p>
        </div>
      ))}
    </div>
  </div>
);

const meta: Meta<typeof DashboardLayout> = {
  title: 'Patterns/DashboardLayout',
  component: DashboardLayout,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof DashboardLayout>;

export const Default: Story = {
  render: () => (
    <div className="h-[500px]">
      <DashboardLayout header={<DashboardHeader />} sidebar={<DashboardSidebar />}>
        <DashboardContent />
      </DashboardLayout>
    </div>
  ),
  parameters: { layout: 'fullscreen' },
};

export const ContentOnly: Story = {
  render: () => (
    <div className="h-[500px]">
      <DashboardLayout>
        <DashboardContent />
      </DashboardLayout>
    </div>
  ),
  parameters: { layout: 'fullscreen' },
};
