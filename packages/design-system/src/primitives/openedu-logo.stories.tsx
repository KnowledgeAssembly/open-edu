import type { Meta, StoryObj } from '@storybook/react';
import { OpenEduLogo } from './openedu-logo';

const meta: Meta<typeof OpenEduLogo> = {
  title: 'Brand/OpenEdu Logo',
  component: OpenEduLogo,
  argTypes: {
    variant: { control: 'select', options: ['symbol', 'wordmark', 'lockup'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
};

export default meta;
type Story = StoryObj<typeof OpenEduLogo>;

export const Lockup: Story = {
  args: { variant: 'lockup', size: 'md' },
};

export const Symbol: Story = {
  args: { variant: 'symbol', size: 'md' },
};

export const Wordmark: Story = {
  args: { variant: 'wordmark', size: 'md' },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex items-center gap-8">
      <div className="text-center">
        <OpenEduLogo variant="symbol" size="lg" />
        <p className="text-xs text-gray-500 mt-2">Symbol</p>
      </div>
      <div className="text-center">
        <OpenEduLogo variant="wordmark" size="lg" />
        <p className="text-xs text-gray-500 mt-2">Wordmark</p>
      </div>
      <div className="text-center">
        <OpenEduLogo variant="lockup" size="lg" />
        <p className="text-xs text-gray-500 mt-2">Lockup</p>
      </div>
    </div>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-8">
      <div className="text-center">
        <OpenEduLogo variant="lockup" size="sm" />
        <p className="text-xs text-gray-500 mt-2">Small</p>
      </div>
      <div className="text-center">
        <OpenEduLogo variant="lockup" size="md" />
        <p className="text-xs text-gray-500 mt-2">Medium</p>
      </div>
      <div className="text-center">
        <OpenEduLogo variant="lockup" size="lg" />
        <p className="text-xs text-gray-500 mt-2">Large</p>
      </div>
    </div>
  ),
};

export const OnDarkBackground: Story = {
  render: () => (
    <div className="bg-gray-900 p-8 rounded-lg">
      <OpenEduLogo variant="lockup" size="lg" className="text-white" />
    </div>
  ),
};
