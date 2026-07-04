import type { Meta, StoryObj } from '@storybook/react';
import { Citation } from './Citation';

const meta: Meta<typeof Citation> = {
  title: 'AI/Citation',
  component: Citation,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof Citation>;

export const Default: Story = {
  args: {
    source: 'Biology Textbook, Chapter 6',
    children: 'Photosynthesis occurs in the chloroplasts of plant cells.',
  },
};

export const WithLongText: Story = {
  args: {
    source: 'Nature Journal, Vol. 421',
    children:
      'The process of photosynthesis can be divided into two main stages: the light-dependent reactions and the Calvin cycle. The light-dependent reactions occur in the thylakoid membrane, while the Calvin cycle takes place in the stroma.',
  },
};

export const ShortCitation: Story = {
  args: {
    source: 'Wikipedia',
    children: 'Mitochondria are membrane-bound organelles found in most eukaryotic cells.',
  },
};
