import type { Meta, StoryObj } from '@storybook/react';
import { flashcard } from '@open-edu/widgets';

const FlashcardComponent = flashcard.render;

function StoryWrapper(props: { config?: Record<string, unknown> }) {
  return (
    <div style={{ maxWidth: '600px', margin: '2rem auto' }}>
      <FlashcardComponent
        nodeId="story-node"
        config={props.config ?? {}}
        emitInteraction={() => {}}
        complete={() => {}}
      />
    </div>
  );
}

const meta: Meta<typeof StoryWrapper> = {
  title: 'Widgets/Flashcard',
  component: StoryWrapper,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof StoryWrapper>;

export const Default: Story = {
  args: {
    config: {
      cards: [
        { front: 'Hola', back: 'Hello', hint: 'Spanish greeting', category: 'Greetings' },
        { front: 'Gracias', back: 'Thank you', category: 'Politeness' },
        { front: 'Adios', back: 'Goodbye', category: 'Greetings' },
        { front: 'Por favor', back: 'Please', category: 'Politeness' },
      ],
      mode: 'flip',
      interactive: true,
      shuffle: true,
    },
  },
};

export const WithImages: Story = {
  args: {
    config: {
      cards: [
        { front: 'Apple', back: 'A red or green fruit', image: 'https://emojicdn.elk.sh/🍎' },
        { front: 'Banana', back: 'A yellow tropical fruit', image: 'https://emojicdn.elk.sh/🍌' },
      ],
      interactive: true,
    },
  },
};

export const ObserveMode: Story = {
  args: {
    config: {
      cards: [
        { front: 'Hello', back: 'Hola' },
        { front: 'Thank you', back: 'Gracias' },
      ],
    },
  },
};
