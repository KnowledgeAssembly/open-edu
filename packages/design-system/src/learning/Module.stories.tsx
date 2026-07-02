import type { Meta, StoryObj } from '@storybook/react';
import { Module } from './Module';

const meta: Meta<typeof Module> = {
  title: 'Learning/Module',
  component: Module,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof Module>;

export const Default: Story = {
  args: {
    title: 'Unit 1: Numbers and Place Value',
    lessons: [
      { id: 'les-1', title: 'Understanding Whole Numbers' },
      { id: 'les-2', title: 'Place Value Concepts' },
      { id: 'les-3', title: 'Comparing and Ordering Numbers' },
      { id: 'les-4', title: 'Rounding Numbers' },
    ],
    totalLessons: 4,
    completedLessons: 0,
    onLessonClick: (id) => console.log('Click lesson:', id),
  },
};

export const WithCompletedLessons: Story = {
  args: {
    title: 'Unit 2: Addition and Subtraction',
    lessons: [
      { id: 'les-5', title: 'Adding Whole Numbers' },
      { id: 'les-6', title: 'Subtracting Whole Numbers' },
      { id: 'les-7', title: 'Word Problems with Addition and Subtraction' },
    ],
    totalLessons: 5,
    completedLessons: 2,
    onLessonClick: (id) => console.log('Click lesson:', id),
  },
};

export const WithActiveLesson: Story = {
  args: {
    title: 'Unit 3: Multiplication',
    lessons: [
      { id: 'les-8', title: 'Introduction to Multiplication' },
      { id: 'les-9', title: 'Multiplication Tables', isActive: true },
      { id: 'les-10', title: 'Multiplying Larger Numbers' },
    ],
    totalLessons: 6,
    completedLessons: 3,
    onLessonClick: (id) => console.log('Click lesson:', id),
  },
};
