import type { Meta, StoryObj } from '@storybook/react';
import { SplitView } from './SplitView';

const LeftContent = () => (
  <div className="p-6">
    <h2 className="text-on-surface mb-3 text-lg font-bold">Markdown Editor</h2>
    <textarea
      className="border-outline-variant bg-surface text-on-surface h-64 w-full resize-none rounded-lg border p-3 font-mono text-sm"
      defaultValue="# Hello World\n\nThis is a **markdown** document.\n\n- Item 1\n- Item 2\n- Item 3"
    />
  </div>
);

const RightContent = () => (
  <div className="p-6">
    <h2 className="text-on-surface mb-3 text-lg font-bold">Preview</h2>
    <div className="prose text-on-surface-variant text-sm leading-relaxed">
      <h1 className="mb-2 text-xl font-bold">Hello World</h1>
      <p className="mb-2">
        This is a <strong>markdown</strong> document.
      </p>
      <ul className="list-disc space-y-1 pl-5">
        <li>Item 1</li>
        <li>Item 2</li>
        <li>Item 3</li>
      </ul>
    </div>
  </div>
);

const meta: Meta<typeof SplitView> = {
  title: 'Patterns/SplitView',
  component: SplitView,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof SplitView>;

export const Default: Story = {
  render: () => (
    <div className="border-outline-variant h-[400px] overflow-hidden rounded-lg border">
      <SplitView left={<LeftContent />} right={<RightContent />} />
    </div>
  ),
};

export const UnevenSplit: Story = {
  render: () => (
    <div className="border-outline-variant h-[400px] overflow-hidden rounded-lg border">
      <SplitView left={<LeftContent />} right={<RightContent />} defaultRatio={0.3} />
    </div>
  ),
};

export const SideBySideContent: Story = {
  render: () => (
    <div className="border-outline-variant h-[300px] overflow-hidden rounded-lg border">
      <SplitView
        left={
          <div className="bg-surface-container h-full p-4">
            <p className="text-on-surface text-sm font-semibold">Left Panel</p>
            <p className="text-on-surface-variant mt-1 text-xs">Takes 60% width</p>
          </div>
        }
        right={
          <div className="bg-surface h-full p-4">
            <p className="text-on-surface text-sm font-semibold">Right Panel</p>
            <p className="text-on-surface-variant mt-1 text-xs">Takes 40% width</p>
          </div>
        }
        defaultRatio={0.6}
      />
    </div>
  ),
};
