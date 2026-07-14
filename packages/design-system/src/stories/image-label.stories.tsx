import type { Meta, StoryObj } from '@storybook/react';
import { imageLabel } from '@open-edu/widgets';

const ImageLabelComponent = imageLabel.render;

function StoryWrapper(props: { config?: Record<string, unknown> }) {
  return (
    <div style={{ maxWidth: '600px', margin: '2rem auto' }}>
      <ImageLabelComponent
        nodeId="story-node"
        config={props.config ?? {}}
        emitInteraction={() => {}}
        complete={() => {}}
      />
    </div>
  );
}

const meta: Meta<typeof StoryWrapper> = {
  title: 'Widgets/ImageLabel',
  component: StoryWrapper,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof StoryWrapper>;

const baseConfig = {
  image: 'assets/images/solar-system.png',
  altText: 'Solar system with clickable planets',
  regions: [
    {
      id: 'mars',
      title: 'Mars',
      description: 'The Red Planet, 4th from the Sun',
      x: 45,
      y: 30,
      tooltip: 'Click to learn about Mars',
    },
    {
      id: 'jupiter',
      title: 'Jupiter',
      description: 'Largest planet in our solar system',
      x: 60,
      y: 50,
      tooltip: 'Click to learn about Jupiter',
    },
    {
      id: 'earth',
      title: 'Earth',
      description: 'Our home planet, 3rd from the Sun',
      x: 35,
      y: 40,
      tooltip: 'Click to learn about Earth',
    },
  ],
};

export const Explorer: Story = {
  args: {
    config: { ...baseConfig, interactive: false },
  },
};

export const Quiz: Story = {
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
    config: { ...baseConfig, interactive: false },
  },
};
