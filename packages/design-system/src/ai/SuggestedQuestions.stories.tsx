import type { Meta, StoryObj } from '@storybook/react';
import { SuggestedQuestions } from './SuggestedQuestions';

const meta: Meta<typeof SuggestedQuestions> = {
  title: 'AI/SuggestedQuestions',
  component: SuggestedQuestions,
  tags: ['autodocs'],
  argTypes: {
    onSelect: { action: 'questionSelected' },
  },
};
export default meta;
type Story = StoryObj<typeof SuggestedQuestions>;

export const Default: Story = {
  args: {
    heading: 'Suggested questions',
    questions: [
      'What is photosynthesis?',
      'How do plants make food?',
      'What are the reactants of photosynthesis?',
      'Where does photosynthesis occur?',
    ],
    onSelect: () => {},
  },
};

export const SingleQuestion: Story = {
  args: {
    heading: 'Suggested questions',
    questions: ['Can you explain this concept in simpler terms?'],
    onSelect: () => {},
  },
};

export const MathQuestions: Story = {
  args: {
    heading: 'Suggested questions',
    questions: [
      'How do I add fractions with different denominators?',
      'What is the difference between proper and improper fractions?',
      'How do you convert a mixed number to an improper fraction?',
      'Can you show me a real-world example of fractions?',
    ],
    onSelect: () => {},
  },
};

export const Compact: Story = {
  args: {
    heading: 'Suggested questions',
    questions: [
      'Can you explain what I just read?',
      'Summarize this lesson for me',
      'Give me a practice question',
      'What are the key concepts here?',
    ],
    variant: 'compact',
    onSelect: () => {},
  },
};
