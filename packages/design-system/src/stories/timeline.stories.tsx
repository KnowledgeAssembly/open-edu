import type { Meta, StoryObj } from '@storybook/react';
import { timeline } from '@open-edu/widgets';

const TimelineComponent = timeline.render;

function StoryWrapper(props: { config?: Record<string, unknown> }) {
  return (
    <div style={{ maxWidth: '700px', margin: '2rem auto' }}>
      <TimelineComponent
        nodeId="story-node"
        config={props.config ?? {}}
        emitInteraction={() => {}}
        complete={() => {}}
      />
    </div>
  );
}

const meta: Meta<typeof StoryWrapper> = {
  title: 'Widgets/Timeline',
  component: StoryWrapper,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof StoryWrapper>;

const baseEvents = [
  {
    id: 'evap',
    title: 'Evaporation',
    icon: '☀️',
    description: 'Water heats up and rises as vapor',
  },
  {
    id: 'cond',
    title: 'Condensation',
    icon: '☁️',
    description: 'Water vapor cools and forms clouds',
  },
  { id: 'rain', title: 'Rain', icon: '🌧️', description: 'Water falls as precipitation' },
  {
    id: 'collect',
    title: 'Collection',
    icon: '🌊',
    description: 'Water collects in oceans and lakes',
  },
];

export const Default: Story = {
  args: {
    config: {
      title: 'The Water Cycle',
      events: baseEvents,
      layout: 'vertical',
      showDates: false,
      interactive: false,
    },
  },
};

export const Horizontal: Story = {
  args: {
    config: {
      title: 'The Water Cycle',
      events: baseEvents,
      layout: 'horizontal',
      showDates: false,
      interactive: false,
    },
  },
};

export const Compact: Story = {
  args: {
    config: {
      title: 'The Water Cycle',
      events: baseEvents,
      layout: 'compact',
      showDates: false,
      interactive: false,
    },
  },
};

export const Interactive: Story = {
  args: {
    config: {
      title: 'The Water Cycle',
      events: baseEvents,
      layout: 'vertical',
      showDates: false,
      interactive: true,
    },
  },
};

export const DarkTheme: Story = {
  parameters: { theme: 'dark' },
  args: {
    config: {
      title: 'The Water Cycle',
      events: baseEvents,
      layout: 'vertical',
      showDates: false,
      interactive: false,
    },
  },
};
