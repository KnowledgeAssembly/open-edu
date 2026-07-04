import type { Meta, StoryObj } from '@storybook/react';
import { TutorMessage } from './TutorMessage';

const meta: Meta<typeof TutorMessage> = {
  title: 'AI/TutorMessage',
  component: TutorMessage,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof TutorMessage>;

export const AI: Story = {
  args: {
    role: 'ai',
    children:
      'Great question! Photosynthesis is the process by which plants convert sunlight into energy.',
  },
};

export const User: Story = {
  args: {
    role: 'user',
    children: 'Can you explain photosynthesis in simple terms?',
  },
};

export const AIWithLongContent: Story = {
  args: {
    role: 'ai',
    children:
      'The process of photosynthesis involves two main stages: the light-dependent reactions, which occur in the thylakoid membrane and produce ATP and NADPH, and the Calvin cycle, which takes place in the stroma and uses these products to fix carbon dioxide into glucose.',
  },
};

export const UserWithLongContent: Story = {
  args: {
    role: 'user',
    children:
      "I'm confused about the difference between the light-dependent reactions and the Calvin cycle. Can you break it down step by step?",
  },
};
