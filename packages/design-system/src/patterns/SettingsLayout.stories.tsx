import type { Meta, StoryObj } from '@storybook/react';
import { SettingsLayout } from './SettingsLayout';

const SettingsSidebar = () => (
  <nav>
    <h3 className="text-on-surface mb-3 text-sm font-semibold">Settings</h3>
    <ul className="m-0 list-none space-y-1 p-0 text-sm">
      <li className="bg-primary-container text-on-primary-container cursor-pointer rounded px-3 py-2 font-medium">
        Profile
      </li>
      <li className="text-on-surface-variant hover:bg-surface-container-high cursor-pointer rounded px-3 py-2">
        Notifications
      </li>
      <li className="text-on-surface-variant hover:bg-surface-container-high cursor-pointer rounded px-3 py-2">
        Appearance
      </li>
      <li className="text-on-surface-variant hover:bg-surface-container-high cursor-pointer rounded px-3 py-2">
        Accessibility
      </li>
    </ul>
  </nav>
);

const SettingsContent = () => (
  <div>
    <h2 className="text-on-surface mb-4 text-xl font-bold">Profile Settings</h2>
    <div className="max-w-md space-y-4">
      <div>
        <label className="text-on-surface mb-1 block text-sm font-medium">Display Name</label>
        <input
          type="text"
          defaultValue="Sarthak"
          className="border-outline-variant bg-surface text-on-surface w-full rounded-lg border px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="text-on-surface mb-1 block text-sm font-medium">Email</label>
        <input
          type="email"
          defaultValue="sarthak@example.com"
          className="border-outline-variant bg-surface text-on-surface w-full rounded-lg border px-3 py-2 text-sm"
        />
      </div>
      <button className="bg-primary text-on-primary rounded-lg px-4 py-2 text-sm font-semibold">
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
