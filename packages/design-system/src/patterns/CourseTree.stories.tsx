import type { Meta, StoryObj } from '@storybook/react';
import { CourseTree, type CourseTreeModule } from './CourseTree';

const sampleModules: CourseTreeModule[] = [
  {
    title: 'Module 1: Getting Started',
    lessons: [
      { id: 'intro', title: 'Welcome & Overview', isActive: true },
      { id: 'setup', title: 'Environment Setup' },
      { id: 'hello', title: 'Hello World' },
    ],
  },
  {
    title: 'Module 2: Core Concepts',
    lessons: [
      { id: 'variables', title: 'Variables & Data Types' },
      { id: 'operators', title: 'Operators' },
      { id: 'conditionals', title: 'Conditionals' },
    ],
  },
  {
    title: 'Module 3: Advanced Topics',
    lessons: [
      { id: 'async', title: 'Async Programming' },
      { id: 'classes', title: 'Classes & OOP' },
    ],
    isLocked: true,
  },
];

const meta: Meta<typeof CourseTree> = {
  title: 'Patterns/CourseTree',
  component: CourseTree,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof CourseTree>;

export const Default: Story = {
  args: {
    modules: sampleModules,
    onLessonClick: (id) => console.log('Lesson clicked:', id),
  },
};

export const SingleModule: Story = {
  args: {
    modules: [
      {
        title: 'Module 1: Basics',
        lessons: [
          { id: 'l1', title: 'Lesson One', isActive: true },
          { id: 'l2', title: 'Lesson Two' },
        ],
      },
    ],
    onLessonClick: (id) => console.log('Lesson clicked:', id),
  },
};

export const AllLocked: Story = {
  args: {
    modules: [
      {
        title: 'Locked Module',
        lessons: [{ id: 'l1', title: 'Lesson One' }],
        isLocked: true,
      },
      {
        title: 'Another Locked Module',
        lessons: [{ id: 'l2', title: 'Lesson Two' }],
        isLocked: true,
      },
    ],
    onLessonClick: (id) => console.log('Lesson clicked:', id),
  },
};
