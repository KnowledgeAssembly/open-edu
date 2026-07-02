import type { Meta, StoryObj } from '@storybook/react';
import { ReferenceCard } from './ReferenceCard';

const meta: Meta<typeof ReferenceCard> = {
  title: 'AI/ReferenceCard',
  component: ReferenceCard,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof ReferenceCard>;

export const Default: Story = {
  args: {
    title: 'Introduction to Fractions',
    description: 'Learn the basics of fractions, including numerator and denominator.',
    url: 'https://example.com/fractions-intro',
  },
};

export const WithoutUrl: Story = {
  args: {
    title: 'Cell Division Overview',
    description: 'Understanding mitosis and meiosis in biological organisms.',
  },
};

export const TitleOnly: Story = {
  args: {
    title: 'Algebra Fundamentals',
  },
};
