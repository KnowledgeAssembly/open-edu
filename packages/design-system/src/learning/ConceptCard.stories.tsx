import type { Meta, StoryObj } from '@storybook/react';
import { ConceptCard } from './ConceptCard';

const meta: Meta<typeof ConceptCard> = {
  title: 'Learning/ConceptCard',
  component: ConceptCard,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof ConceptCard>;

export const Default: Story = {
  args: {
    title: 'Photosynthesis',
    icon: '🌱',
    children: (
      <p>Photosynthesis is the process by which green plants use sunlight, water, and carbon dioxide to produce glucose and oxygen.</p>
    ),
  },
};

export const WithoutIcon: Story = {
  args: {
    title: 'Gravity',
    children: (
      <p>Gravity is the force that attracts objects with mass toward one another. On Earth, it gives weight to objects and causes them to fall when dropped.</p>
    ),
  },
};

export const WithLongContent: Story = {
  args: {
    title: 'Machine Learning',
    icon: '🤖',
    children: (
      <>
        <p>Machine learning is a subset of artificial intelligence that enables systems to learn and improve from experience without being explicitly programmed.</p>
        <p>It focuses on developing computer programs that can access data and use it to learn for themselves.</p>
      </>
    ),
  },
};
