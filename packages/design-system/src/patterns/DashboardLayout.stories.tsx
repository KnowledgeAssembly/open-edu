import type { Meta, StoryObj } from '@storybook/react';
import { DashboardLayout } from './DashboardLayout';

const DashboardHeader = () => (
  <div className="bg-surface border-outline-variant flex h-16 items-center justify-between border-b px-6">
    <h1 className="text-on-surface text-lg font-bold">Dashboard</h1>
    <div className="flex items-center gap-3">
      <span className="text-on-surface-variant text-sm">Welcome, Sarthak</span>
      <div className="bg-primary-container text-on-primary-container flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold">
        S
      </div>
    </div>
  </div>
);

const DashboardSidebar = () => (
  <div>
    <h3 className="text-on-surface-variant mb-3 text-xs font-semibold uppercase tracking-wider">
      Navigation
    </h3>
    <ul className="m-0 list-none space-y-1 p-0 text-sm">
      <li className="bg-primary-container text-on-primary-container cursor-pointer rounded px-3 py-2 font-medium">
        Overview
      </li>
      <li className="text-on-surface-variant hover:bg-surface-container-high cursor-pointer rounded px-3 py-2">
        My Courses
      </li>
      <li className="text-on-surface-variant hover:bg-surface-container-high cursor-pointer rounded px-3 py-2">
        Achievements
      </li>
      <li className="text-on-surface-variant hover:bg-surface-container-high cursor-pointer rounded px-3 py-2">
        Certificates
      </li>
    </ul>
  </div>
);

const DashboardContent = () => (
  <div className="space-y-6">
    <h2 className="text-on-surface text-xl font-bold">Welcome back!</h2>
    <div className="grid grid-cols-3 gap-4">
      {[
        { title: 'Courses In Progress', value: '3', color: 'bg-primary-container' },
        { title: 'Completed', value: '12', color: 'bg-tertiary-container' },
        { title: 'Hours Learned', value: '47', color: 'bg-secondary-container' },
      ].map((card) => (
        <div key={card.title} className={`${card.color} rounded-lg p-4`}>
          <p className="text-on-surface-variant text-xs">{card.title}</p>
          <p className="text-on-surface mt-1 text-2xl font-bold">{card.value}</p>
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
