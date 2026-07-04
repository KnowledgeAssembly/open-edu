import type { Meta, StoryObj } from '@storybook/react';
import { AIChat } from './AIChat';

const meta: Meta<typeof AIChat> = {
  title: 'AI/AIChat',
  component: AIChat,
  tags: ['autodocs'],
  argTypes: {
    onSend: { action: 'send' },
    onSuggestedQuestionSelect: { action: 'suggestedQuestionSelected' },
  },
};
export default meta;
type Story = StoryObj<typeof AIChat>;

export const Empty: Story = {
  args: {
    messages: [],
    onSend: () => {},
  },
};

export const WithMessages: Story = {
  args: {
    messages: [
      { role: 'user', text: 'What is photosynthesis?' },
      {
        role: 'ai',
        text: 'Photosynthesis is the process by which plants convert sunlight, water, and carbon dioxide into glucose and oxygen.',
      },
    ],
    onSend: () => {},
  },
};

export const WithCitations: Story = {
  args: {
    messages: [
      { role: 'user', text: 'How do plants make food?' },
      {
        role: 'ai',
        text: 'Plants use photosynthesis to convert light energy into chemical energy.',
        citations: [
          {
            source: 'Biology Textbook, Ch. 6',
            text: 'Photosynthesis occurs in the chloroplasts of plant cells.',
          },
          { source: 'Nature Journal', text: 'The process requires sunlight, water, and CO₂.' },
        ],
      },
    ],
    onSend: () => {},
  },
};

export const Thinking: Story = {
  args: {
    messages: [{ role: 'user', text: 'Explain mitosis in detail.' }],
    onSend: () => {},
    isThinking: true,
  },
};

export const WithSuggestedQuestions: Story = {
  args: {
    messages: [],
    onSend: () => {},
    suggestedQuestions: [
      'What is the difference between mitosis and meiosis?',
      'How does DNA replication work?',
      'What are the phases of the cell cycle?',
      'Why is cell division important?',
    ],
    onSuggestedQuestionSelect: () => {},
  },
};

export const WithCustomPlaceholder: Story = {
  args: {
    messages: [],
    onSend: () => {},
    placeholder: 'Type your math question here...',
  },
};
