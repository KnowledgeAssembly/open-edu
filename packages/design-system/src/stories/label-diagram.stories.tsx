import type { Meta, StoryObj } from '@storybook/react';
import { labelDiagram } from '@open-edu/widgets';

const LabelDiagramComponent = labelDiagram.render;

function StoryWrapper(props: { config?: Record<string, unknown> }) {
  return (
    <div style={{ maxWidth: '600px', margin: '2rem auto' }}>
      <LabelDiagramComponent
        nodeId="story-node"
        config={props.config ?? {}}
        emitInteraction={() => {}}
        complete={() => {}}
      />
    </div>
  );
}

const meta: Meta<typeof StoryWrapper> = {
  title: 'Widgets/LabelDiagram',
  component: StoryWrapper,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof StoryWrapper>;

const baseConfig = {
  image: 'assets/images/plant-anatomy.png',
  altText: 'Diagram of a plant with parts to label',
  labels: [
    { id: 'roots', text: 'Roots', target: { x: 50, y: 90 }, hint: 'Below the soil' },
    { id: 'stem', text: 'Stem', target: { x: 50, y: 60 }, hint: 'Supports the plant' },
    { id: 'leaves', text: 'Leaves', target: { x: 30, y: 40 }, hint: 'Green and flat' },
    { id: 'flower', text: 'Flower', target: { x: 50, y: 20 }, hint: 'Colorful top' },
  ],
};

export const Observe: Story = {
  args: {
    config: { ...baseConfig, interactive: false },
  },
};

export const Interactive: Story = {
  args: {
    config: { ...baseConfig, interactive: true },
  },
};

export const DarkTheme: Story = {
  parameters: { theme: 'dark' },
  args: {
    config: { ...baseConfig, interactive: false },
  },
};

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  args: {
    config: { ...baseConfig, interactive: true },
  },
};
