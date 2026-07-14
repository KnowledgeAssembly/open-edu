import type { Meta, StoryObj } from '@storybook/react';
import { processDiagram } from '@open-edu/widgets';

const ProcessDiagramComponent = processDiagram.render;

function StoryWrapper(props: { config?: Record<string, unknown> }) {
  return (
    <div style={{ maxWidth: '600px', margin: '2rem auto' }}>
      <ProcessDiagramComponent
        nodeId="story-node"
        config={props.config ?? {}}
        emitInteraction={() => {}}
        complete={() => {}}
      />
    </div>
  );
}

const meta: Meta<typeof StoryWrapper> = {
  title: 'Widgets/Process Diagram',
  component: StoryWrapper,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof StoryWrapper>;

export const Horizontal: Story = {
  args: {
    config: {
      title: 'Simple Process',
      nodes: [
        { id: 'in', title: 'Input' },
        { id: 'pr', title: 'Process' },
        { id: 'out', title: 'Output' },
      ],
      connections: [
        { from: 'in', to: 'pr', type: 'arrow' },
        { from: 'pr', to: 'out', type: 'arrow' },
      ],
      layout: 'horizontal',
      interactive: true,
      stepByStep: true,
    },
  },
};

export const WaterCycle: Story = {
  args: {
    config: {
      title: 'Water Cycle',
      nodes: [
        { id: 'evap', title: 'Evaporation' },
        { id: 'cond', title: 'Condensation' },
        { id: 'precip', title: 'Precipitation' },
        { id: 'collect', title: 'Collection' },
      ],
      connections: [
        { from: 'evap', to: 'cond', type: 'arrow' },
        { from: 'cond', to: 'precip', type: 'arrow' },
        { from: 'precip', to: 'collect', type: 'arrow' },
        { from: 'collect', to: 'evap', type: 'loop' },
      ],
      layout: 'cycle',
    },
  },
};

export const ObserveMode: Story = {
  args: {
    config: {
      title: 'Photosynthesis',
      nodes: [
        { id: 'sun', title: 'Sunlight' },
        { id: 'chloro', title: 'Chlorophyll' },
        { id: 'glucose', title: 'Glucose' },
      ],
      connections: [
        { from: 'sun', to: 'chloro', type: 'arrow' },
        { from: 'chloro', to: 'glucose', type: 'arrow' },
      ],
      layout: 'vertical',
    },
  },
};
