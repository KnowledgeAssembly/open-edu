import type { Meta, StoryObj } from '@storybook/react';
import { ThreePanelLayout } from './ThreePanelLayout';

const PanelContent = ({ label, className = '' }: { label: string; className?: string }) => (
  <div className={`p-4 h-full ${className}`}>
    <p className="text-sm font-semibold text-on-surface mb-2">{label}</p>
    <p className="text-xs text-on-surface-variant leading-relaxed">
      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore.
    </p>
  </div>
);

const meta: Meta<typeof ThreePanelLayout> = {
  title: 'Patterns/ThreePanelLayout',
  component: ThreePanelLayout,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof ThreePanelLayout>;

export const Default: Story = {
  render: () => (
    <div className="h-[400px] border border-outline-variant rounded-lg overflow-hidden">
      <ThreePanelLayout
        leftNav={<PanelContent label="Left Nav" className="bg-surface-container" />}
        content={<PanelContent label="Main Content" className="bg-surface" />}
        rightPanel={<PanelContent label="Right Panel" className="bg-surface-container" />}
      />
    </div>
  ),
};

export const ContentOnly: Story = {
  render: () => (
    <div className="h-[400px] border border-outline-variant rounded-lg overflow-hidden">
      <ThreePanelLayout content={<PanelContent label="Main Content" className="bg-surface" />} />
    </div>
  ),
};

export const TwoPanel: Story = {
  render: () => (
    <div className="h-[400px] border border-outline-variant rounded-lg overflow-hidden">
      <ThreePanelLayout
        leftNav={<PanelContent label="Navigation" className="bg-surface-container" />}
        content={<PanelContent label="Content Area" className="bg-surface" />}
      />
    </div>
  ),
};
