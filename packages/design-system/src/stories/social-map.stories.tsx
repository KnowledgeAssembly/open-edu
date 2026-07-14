import type { Meta, StoryObj } from '@storybook/react';
import { socialMap } from '@open-edu/widgets';

const SocialMapComponent = socialMap.render;

function StoryWrapper(props: { config?: Record<string, unknown> }) {
  return (
    <div style={{ maxWidth: '600px', margin: '2rem auto' }}>
      <SocialMapComponent
        nodeId="story-node"
        config={props.config ?? {}}
        emitInteraction={() => {}}
        complete={() => {}}
      />
    </div>
  );
}

const meta: Meta<typeof StoryWrapper> = {
  title: 'Widgets/Social Map',
  component: StoryWrapper,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof StoryWrapper>;

export const Default: Story = {
  args: {
    config: {
      title: 'Indian States',
      regions: [
        {
          id: 'mh',
          name: 'Maharashtra',
          color: '#e8def8',
          description: 'Western India, capital Mumbai',
        },
        {
          id: 'ka',
          name: 'Karnataka',
          color: '#d0bcff',
          description: 'Southern India, capital Bangalore',
        },
        {
          id: 'tn',
          name: 'Tamil Nadu',
          color: '#b69df8',
          description: 'Southeast India, capital Chennai',
        },
      ],
      labels: true,
      interactive: true,
      targetRegion: 'ka',
      legend: [
        { color: '#e8def8', label: 'Western' },
        { color: '#d0bcff', label: 'Southern' },
        { color: '#b69df8', label: 'Southeastern' },
      ],
    },
  },
};

export const WithZoom: Story = {
  args: {
    config: {
      title: 'World Regions',
      regions: [
        { id: 'na', name: 'North America', color: '#e8def8' },
        { id: 'sa', name: 'South America', color: '#d0bcff' },
        { id: 'eu', name: 'Europe', color: '#b69df8' },
        { id: 'af', name: 'Africa', color: '#f6bd0a' },
        { id: 'as', name: 'Asia', color: '#a1c4fd' },
        { id: 'oc', name: 'Oceania', color: '#c7e9c0' },
      ],
      labels: true,
      interactive: true,
      zoom: true,
    },
  },
};

export const ObserveMode: Story = {
  args: {
    config: {
      title: 'Explore Regions',
      regions: [
        { id: 'r1', name: 'Region One', color: '#e8def8', description: 'The northern region' },
        { id: 'r2', name: 'Region Two', color: '#d0bcff', description: 'The coastal region' },
      ],
      labels: true,
      legend: [
        { color: '#e8def8', label: 'Northern' },
        { color: '#d0bcff', label: 'Coastal' },
      ],
    },
  },
};
