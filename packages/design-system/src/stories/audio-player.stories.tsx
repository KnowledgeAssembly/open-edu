import type { Meta, StoryObj } from '@storybook/react';
import { audioPlayer } from '@open-edu/widgets';

const AudioPlayerComponent = audioPlayer.render;

function StoryWrapper(props: { config?: Record<string, unknown> }) {
  return (
    <div style={{ maxWidth: '600px', margin: '2rem auto' }}>
      <AudioPlayerComponent
        nodeId="story-node"
        config={props.config ?? {}}
        emitInteraction={() => {}}
        complete={() => {}}
      />
    </div>
  );
}

const meta: Meta<typeof StoryWrapper> = {
  title: 'Widgets/Audio Player',
  component: StoryWrapper,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof StoryWrapper>;

export const Default: Story = {
  args: {
    config: {
      audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      title: 'Sample Audio',
      description: 'A sample audio track for demonstration',
      showTranscript: true,
      transcript: 'This is a sample transcript for the audio player widget.',
      showControls: true,
      interactive: true,
      bookmarks: true,
    },
  },
};

export const WithCaptions: Story = {
  args: {
    config: {
      audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      title: 'Audio with Captions',
      captions: [
        { start: 0, end: 3, text: 'Welcome to the lesson' },
        { start: 3, end: 6, text: 'Today we will learn about fractions' },
      ],
      showControls: true,
      interactive: true,
    },
  },
};

export const ObserveMode: Story = {
  args: {
    config: {
      audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      title: 'Listen Only',
    },
  },
};
