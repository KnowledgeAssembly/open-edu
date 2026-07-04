import type { Meta, StoryObj } from '@storybook/react';
import { AppLayout } from './AppLayout';

const PlaceholderBar = ({ label }: { label: string }) => (
  <div className="bg-surface-container h-16 flex items-center px-4 border-b border-outline-variant text-sm text-on-surface-variant font-medium">
    {label}
  </div>
);

const PlaceholderSidebar = () => (
  <div className="w-64 h-full bg-surface-container border-r border-outline-variant p-4 text-sm text-on-surface-variant">
    <p className="font-semibold mb-2">Sidebar</p>
    <ul className="list-none p-0 m-0 space-y-1">
      <li className="px-2 py-1 rounded bg-primary-container text-on-primary-container">
        Dashboard
      </li>
      <li className="px-2 py-1">Courses</li>
      <li className="px-2 py-1">Settings</li>
    </ul>
  </div>
);

const PlaceholderContent = () => (
  <div className="p-6">
    <h2 className="text-xl font-bold text-on-surface mb-4">Main Content</h2>
    <p className="text-on-surface-variant text-sm leading-relaxed">
      This is the main content area. It scrolls independently of the sidebar and top bar.
    </p>
  </div>
);

const meta: Meta<typeof AppLayout> = {
  title: 'Patterns/AppLayout',
  component: AppLayout,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof AppLayout>;

export const Default: Story = {
  render: () => (
    <AppLayout>
      <PlaceholderContent />
    </AppLayout>
  ),
  parameters: { layout: 'fullscreen' },
};

export const WithTopBar: Story = {
  render: () => (
    <AppLayout topBar={<PlaceholderBar label="Top App Bar" />}>
      <PlaceholderContent />
    </AppLayout>
  ),
  parameters: { layout: 'fullscreen' },
};

export const WithSidebar: Story = {
  render: () => (
    <AppLayout sidebar={<PlaceholderSidebar />}>
      <PlaceholderContent />
    </AppLayout>
  ),
  parameters: { layout: 'fullscreen' },
};

export const FullLayout: Story = {
  render: () => (
    <AppLayout topBar={<PlaceholderBar label="Top App Bar" />} sidebar={<PlaceholderSidebar />}>
      <PlaceholderContent />
    </AppLayout>
  ),
  parameters: { layout: 'fullscreen' },
};
