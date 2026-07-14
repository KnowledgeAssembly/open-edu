import type { Meta, StoryObj } from '@storybook/react';
import { hotspot } from '@open-edu/widgets';

const HotspotComponent = hotspot.render;

function StoryWrapper(props: { config?: Record<string, unknown> }) {
  return (
    <div style={{ maxWidth: '600px', margin: '2rem auto' }}>
      <HotspotComponent
        nodeId="story-node"
        config={props.config ?? {}}
        emitInteraction={() => {}}
        complete={() => {}}
      />
    </div>
  );
}

const meta: Meta<typeof StoryWrapper> = {
  title: 'Widgets/Hotspot',
  component: StoryWrapper,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof StoryWrapper>;

const baseConfig = {
  image: 'assets/images/india-map.png',
  altText: 'Map of India with states highlighted',
  hotspots: [
    {
      id: 'mh',
      x: 45,
      y: 55,
      radius: 8,
      label: 'Maharashtra',
      correct: true,
      description: 'Capital: Mumbai',
    },
    { id: 'ka', x: 42, y: 65, radius: 8, label: 'Karnataka', correct: false },
    { id: 'dl', x: 48, y: 30, radius: 8, label: 'Delhi', correct: false },
  ],
};

export const Default: Story = {
  args: {
    config: { ...baseConfig, mode: 'single', interactive: false },
  },
};

export const MultipleMode: Story = {
  args: {
    config: {
      ...baseConfig,
      mode: 'multiple',
      interactive: true,
      hotspots: [
        { id: 'mh', x: 45, y: 55, radius: 8, label: 'Maharashtra', correct: true },
        { id: 'ka', x: 42, y: 65, radius: 8, label: 'Karnataka', correct: true },
        { id: 'dl', x: 48, y: 30, radius: 8, label: 'Delhi', correct: false },
      ],
    },
  },
};

export const ObserveMode: Story = {
  args: {
    config: { ...baseConfig, mode: 'single', interactive: false },
  },
};

export const DarkTheme: Story = {
  parameters: { theme: 'dark' },
  args: {
    config: { ...baseConfig, mode: 'single', interactive: false },
  },
};
