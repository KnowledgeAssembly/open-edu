import type { Meta, StoryObj } from '@storybook/react';
import { Lesson } from './Lesson';

const meta: Meta<typeof Lesson> = {
  title: 'Learning/Lesson',
  component: Lesson,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof Lesson>;

export const Default: Story = {
  args: {
    title: 'The Water Cycle',
    icon: '💧',
    children: (
      <div>
        <p>The water cycle describes how water is continuously recycled on Earth through evaporation, condensation, precipitation, and collection.</p>
      </div>
    ),
  },
};

export const WithoutIcon: Story = {
  args: {
    title: 'Introduction to Fractions',
    children: (
      <div>
        <p>A fraction represents a part of a whole. It consists of a numerator (top number) and a denominator (bottom number).</p>
      </div>
    ),
  },
};

export const WithRichContent: Story = {
  args: {
    title: 'Chemical Reactions',
    icon: '⚗️',
    children: (
      <div>
        <p>A chemical reaction occurs when substances interact and form new substances with different properties.</p>
        <p>Key indicators of a chemical reaction include:</p>
        <ul>
          <li>Color change</li>
          <li>Gas production</li>
          <li>Temperature change</li>
          <li>Formation of a precipitate</li>
        </ul>
      </div>
    ),
  },
};
