import type { Meta, StoryObj } from '@storybook/react';
import { CompletionScreen } from './CompletionScreen';

const meta: Meta<typeof CompletionScreen> = {
  title: 'Learning/CompletionScreen',
  component: CompletionScreen,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof CompletionScreen>;

export const Default: Story = {
  args: {
    title: 'Introduction to Mathematics',
    onBack: () => console.log('Back to catalog'),
  },
};

export const WithBadges: Story = {
  args: {
    title: 'Introduction to Mathematics',
    badges: ['First Steps', 'Quick Learner', 'Quiz Master'],
    onBack: () => console.log('Back to catalog'),
  },
};

export const WithStats: Story = {
  args: {
    title: 'Introduction to Mathematics',
    stats: {
      stepsCompleted: 12,
      quizzesAnswered: 5,
      reflectionsWritten: 3,
      timeSpentMinutes: 45,
    },
    onBack: () => console.log('Back to catalog'),
  },
};

export const WithRecommendedCourses: Story = {
  args: {
    title: 'Introduction to Mathematics',
    recommendedCourses: [
      {
        manifest: { id: 'course-2', title: 'Algebra Essentials', version: '1.0.0', author: 'John Smith', entry: 'index.json' },
        nodeCount: 8,
        rootDir: 'algebra-essentials',
      },
      {
        manifest: { id: 'course-3', title: 'Geometry Basics', version: '1.0.0', author: 'Jane Doe', entry: 'index.json' },
        nodeCount: 10,
        rootDir: 'geometry-basics',
      },
    ],
    onBack: () => console.log('Back to catalog'),
    onNavigateToCourse: (dir) => console.log('Navigate to:', dir),
  },
};

export const FullFeatured: Story = {
  args: {
    title: 'Introduction to Mathematics',
    badges: ['First Steps', 'Quick Learner', 'Quiz Master'],
    stats: {
      stepsCompleted: 12,
      quizzesAnswered: 5,
      reflectionsWritten: 3,
      timeSpentMinutes: 45,
    },
    recommendedCourses: [
      {
        manifest: { id: 'course-2', title: 'Algebra Essentials', version: '1.0.0', author: 'John Smith', entry: 'index.json' },
        nodeCount: 8,
        rootDir: 'algebra-essentials',
      },
    ],
    onBack: () => console.log('Back to catalog'),
    onNavigateToCourse: (dir) => console.log('Navigate to:', dir),
    skillSummary: <p className="text-on-surface-variant">You learned basic arithmetic, fractions, and introductory algebra.</p>,
  },
};
