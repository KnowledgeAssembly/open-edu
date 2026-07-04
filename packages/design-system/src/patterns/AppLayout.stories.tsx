import type { Meta, StoryObj } from '@storybook/react';
import { AppLayout } from './AppLayout';

const PlaceholderBar = ({ label }: { label: string }) => (
  <div className="bg-surface-container border-outline-variant text-on-surface-variant flex h-16 items-center border-b px-4 text-sm font-medium">
    {label}
  </div>
);

const PlaceholderSidebar = () => (
  <div className="bg-surface-container border-outline-variant text-on-surface-variant h-full w-64 border-r p-4 text-sm">
    <p className="mb-2 font-semibold">Sidebar</p>
    <ul className="m-0 list-none space-y-1 p-0">
      <li className="bg-primary-container text-on-primary-container rounded px-2 py-1">
        Dashboard
      </li>
      <li className="px-2 py-1">Courses</li>
      <li className="px-2 py-1">Settings</li>
    </ul>
  </div>
);

const PlaceholderContent = () => (
  <div className="p-6">
    <h2 className="text-on-surface mb-4 text-xl font-bold">Main Content</h2>
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
