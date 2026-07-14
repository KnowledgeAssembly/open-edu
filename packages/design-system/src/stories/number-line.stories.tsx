import type { Meta, StoryObj } from '@storybook/react';
import { numberLine } from '@open-edu/widgets';

const NumberLineComponent = numberLine.render;

function StoryWrapper(props: { config?: Record<string, unknown> }) {
  return (
    <div style={{ maxWidth: '600px', margin: '2rem auto' }}>
      <NumberLineComponent
        nodeId="story-node"
        config={props.config ?? {}}
        emitInteraction={() => {}}
        complete={() => {}}
      />
    </div>
  );
}

const meta: Meta<typeof StoryWrapper> = {
  title: 'Widgets/Number Line',
  component: StoryWrapper,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof StoryWrapper>;

export const Default: Story = {
  args: {
    config: {
      min: 0,
      max: 10,
      step: 1,
      showLabels: true,
      interactive: true,
      target: 7,
    },
  },
};

export const NegativeNumbers: Story = {
  args: {
    config: {
      min: -5,
      max: 5,
      step: 1,
      target: -3,
      showLabels: true,
      interactive: true,
      mode: 'negative',
    },
  },
};

export const ObserveMode: Story = {
  args: {
    config: {
      min: 0,
      max: 10,
      step: 1,
      target: 7,
      showLabels: true,
    },
  },
};
