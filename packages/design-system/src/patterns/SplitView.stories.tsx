import type { Meta, StoryObj } from '@storybook/react';
import { SplitView } from './SplitView';

const LeftContent = () => (
  <div className="p-6">
    <h2 className="text-lg font-bold text-on-surface mb-3">Markdown Editor</h2>
    <textarea
      className="w-full h-64 p-3 border border-outline-variant rounded-lg text-sm font-mono bg-surface text-on-surface resize-none"
      defaultValue="# Hello World\n\nThis is a **markdown** document.\n\n- Item 1\n- Item 2\n- Item 3"
    />
  </div>
);

const RightContent = () => (
  <div className="p-6">
    <h2 className="text-lg font-bold text-on-surface mb-3">Preview</h2>
    <div className="prose text-sm text-on-surface-variant leading-relaxed">
      <h1 className="text-xl font-bold mb-2">Hello World</h1>
      <p className="mb-2">This is a <strong>markdown</strong> document.</p>
      <ul className="list-disc pl-5 space-y-1">
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
    <div className="h-[400px] border border-outline-variant rounded-lg overflow-hidden">
      <SplitView left={<LeftContent />} right={<RightContent />} />
    </div>
  ),
};

export const UnevenSplit: Story = {
  render: () => (
    <div className="h-[400px] border border-outline-variant rounded-lg overflow-hidden">
      <SplitView left={<LeftContent />} right={<RightContent />} defaultRatio={0.3} />
    </div>
  ),
};

export const SideBySideContent: Story = {
  render: () => (
    <div className="h-[300px] border border-outline-variant rounded-lg overflow-hidden">
      <SplitView
        left={
          <div className="p-4 bg-surface-container h-full">
            <p className="text-sm font-semibold text-on-surface">Left Panel</p>
            <p className="text-xs text-on-surface-variant mt-1">Takes 60% width</p>
          </div>
        }
        right={
          <div className="p-4 bg-surface h-full">
            <p className="text-sm font-semibold text-on-surface">Right Panel</p>
            <p className="text-xs text-on-surface-variant mt-1">Takes 40% width</p>
          </div>
        }
        defaultRatio={0.6}
      />
    </div>
  ),
};
