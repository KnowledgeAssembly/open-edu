import type { Meta, StoryObj } from '@storybook/react';
import { SettingsLayout } from './SettingsLayout';

const SettingsSidebar = () => (
  <nav>
    <h3 className="text-sm font-semibold text-on-surface mb-3">Settings</h3>
    <ul className="list-none p-0 m-0 space-y-1 text-sm">
      <li className="px-3 py-2 rounded bg-primary-container text-on-primary-container font-medium cursor-pointer">
        Profile
      </li>
      <li className="px-3 py-2 rounded text-on-surface-variant hover:bg-surface-container-high cursor-pointer">
        Notifications
      </li>
      <li className="px-3 py-2 rounded text-on-surface-variant hover:bg-surface-container-high cursor-pointer">
        Appearance
      </li>
      <li className="px-3 py-2 rounded text-on-surface-variant hover:bg-surface-container-high cursor-pointer">
        Accessibility
      </li>
    </ul>
  </nav>
);

const SettingsContent = () => (
  <div>
    <h2 className="text-xl font-bold text-on-surface mb-4">Profile Settings</h2>
    <div className="space-y-4 max-w-md">
      <div>
        <label className="block text-sm font-medium text-on-surface mb-1">Display Name</label>
        <input
          type="text"
          defaultValue="Sarthak"
          className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm bg-surface text-on-surface"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-on-surface mb-1">Email</label>
        <input
          type="email"
          defaultValue="sarthak@example.com"
          className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm bg-surface text-on-surface"
        />
      </div>
      <button className="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-semibold">
        Save Changes
      </button>
    </div>
  </div>
);

const meta: Meta<typeof SettingsLayout> = {
  title: 'Patterns/SettingsLayout',
  component: SettingsLayout,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof SettingsLayout>;

export const Default: Story = {
  render: () => (
    <div className="h-[500px]">
      <SettingsLayout sidebar={<SettingsSidebar />}>
        <SettingsContent />
      </SettingsLayout>
    </div>
  ),
};

export const WithoutSidebar: Story = {
  render: () => (
    <div className="h-[500px]">
      <SettingsLayout>
        <SettingsContent />
      </SettingsLayout>
    </div>
  ),
};
