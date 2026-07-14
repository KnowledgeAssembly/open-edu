import type { Meta, StoryObj } from '@storybook/react';
import { imageCompare } from '@open-edu/widgets';

const ImageCompareComponent = imageCompare.render;

function StoryWrapper(props: { config?: Record<string, unknown> }) {
  return (
    <div style={{ maxWidth: '700px', margin: '2rem auto' }}>
      <ImageCompareComponent
        nodeId="story-node"
        config={props.config ?? {}}
        emitInteraction={() => {}}
        complete={() => {}}
      />
    </div>
  );
}

const meta: Meta<typeof StoryWrapper> = {
  title: 'Widgets/ImageCompare',
  component: StoryWrapper,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof StoryWrapper>;

const baseConfig = {
  leftImage: 'assets/images/healthy-leaf.png',
  rightImage: 'assets/images/diseased-leaf.png',
  leftLabel: 'Healthy Leaf',
  rightLabel: 'Diseased Leaf',
  altText: { left: 'A healthy green leaf', right: 'A diseased leaf with brown spots' },
  caption: 'Compare a healthy leaf with a diseased one',
};

export const Slider: Story = {
  args: {
    config: { ...baseConfig, mode: 'slider' },
  },
};

export const SideBySide: Story = {
  args: {
    config: { ...baseConfig, mode: 'side-by-side' },
  },
};

export const Overlay: Story = {
  args: {
    config: { ...baseConfig, mode: 'overlay', interactive: true },
  },
};

export const BeforeAfter: Story = {
  args: {
    config: { ...baseConfig, mode: 'before-after' },
  },
};
