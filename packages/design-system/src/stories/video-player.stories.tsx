import type { Meta, StoryObj } from '@storybook/react';
import { videoPlayer } from '@open-edu/widgets';

const VideoPlayerComponent = videoPlayer.render;

function StoryWrapper(props: { config?: Record<string, unknown> }) {
  return (
    <div style={{ maxWidth: '600px', margin: '2rem auto' }}>
      <VideoPlayerComponent
        nodeId="story-node"
        config={props.config ?? {}}
        emitInteraction={() => {}}
        complete={() => {}}
      />
    </div>
  );
}

const meta: Meta<typeof StoryWrapper> = {
  title: 'Widgets/Video Player',
  component: StoryWrapper,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof StoryWrapper>;

export const Default: Story = {
  args: {
    config: {
      video: 'https://www.w3schools.com/html/mov_bbb.mp4',
      title: 'Sample Video',
      poster: 'https://www.w3schools.com/html/pic_trulli.jpg',
      showTranscript: true,
      transcript: 'This is a sample video transcript.',
      interactive: true,
    },
  },
};

export const WithChapters: Story = {
  args: {
    config: {
      video: 'https://www.w3schools.com/html/mov_bbb.mp4',
      title: 'Video with Chapters',
      chapters: [
        { time: 0, title: 'Introduction' },
        { time: 5, title: 'Main Content' },
        { time: 10, title: 'Summary' },
      ],
      showTranscript: true,
      interactive: true,
    },
  },
};

export const ObserveMode: Story = {
  args: {
    config: {
      video: 'https://www.w3schools.com/html/mov_bbb.mp4',
      title: 'Watch Only',
    },
  },
};
