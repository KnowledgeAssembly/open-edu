import type { Meta, StoryObj } from '@storybook/react';
import { Pipili } from './pipili';

const meta: Meta<typeof Pipili> = {
  title: 'Brand/Pipili',
  component: Pipili,
  argTypes: {
    size: { control: 'select', options: ['xs', 'sm', 'md', 'lg', 'xl'] },
    mood: { control: 'select', options: ['idle', 'thinking', 'curious', 'content'] },
  },
};

export default meta;
type Story = StoryObj<typeof Pipili>;

export const Default: Story = {
  args: { size: 'md', mood: 'idle' },
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-end gap-6">
      <div className="text-center">
        <Pipili size="xs" />
        <p className="text-xs text-gray-500 mt-1">xs</p>
      </div>
      <div className="text-center">
        <Pipili size="sm" />
        <p className="text-xs text-gray-500 mt-1">sm</p>
      </div>
      <div className="text-center">
        <Pipili size="md" />
        <p className="text-xs text-gray-500 mt-1">md</p>
      </div>
      <div className="text-center">
        <Pipili size="lg" />
        <p className="text-xs text-gray-500 mt-1">lg</p>
      </div>
      <div className="text-center">
        <Pipili size="xl" />
        <p className="text-xs text-gray-500 mt-1">xl</p>
      </div>
    </div>
  ),
};

export const AllMoods: Story = {
  render: () => (
    <div className="flex items-end gap-6">
      <div className="text-center">
        <Pipili size="lg" mood="idle" />
        <p className="text-xs text-gray-500 mt-1">idle</p>
      </div>
      <div className="text-center">
        <Pipili size="lg" mood="thinking" />
        <p className="text-xs text-gray-500 mt-1">thinking</p>
      </div>
      <div className="text-center">
        <Pipili size="lg" mood="curious" />
        <p className="text-xs text-gray-500 mt-1">curious</p>
      </div>
      <div className="text-center">
        <Pipili size="lg" mood="content" />
        <p className="text-xs text-gray-500 mt-1">content</p>
      </div>
    </div>
  ),
};

export const Curious: Story = {
  name: 'Mood: Curious',
  args: { size: 'lg', mood: 'curious' },
};

export const Thinking: Story = {
  name: 'Mood: Thinking',
  args: { size: 'lg', mood: 'thinking' },
};

export const Content: Story = {
  name: 'Mood: Content',
  args: { size: 'lg', mood: 'content' },
};
