import type { Meta, StoryObj } from '@storybook/react';
import { EmptyState } from './EmptyState';

const meta: Meta<typeof EmptyState> = {
  title: 'Visual DNA/Patterns/EmptyState',
  component: EmptyState,
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'no-courses', 'no-progress', 'no-badges', 'no-results'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof EmptyState>;

export const Default: Story = {
  args: {
    heading: 'No content yet',
    description: 'This area is ready for you to explore.',
  },
};

export const NoCourses: Story = {
  args: {
    variant: 'no-courses',
    heading: 'No courses yet',
    description: 'Start exploring to build your learning path.',
  },
};

export const NoProgress: Story = {
  args: {
    variant: 'no-progress',
    heading: 'Begin your journey',
    description: 'Start a course to begin tracking your progress.',
  },
};

export const NoBadges: Story = {
  args: {
    variant: 'no-badges',
    heading: 'Earn your first badge',
    description: 'Complete courses to unlock achievements.',
  },
};

export const NoResults: Story = {
  args: {
    variant: 'no-results',
    heading: 'No matches found',
    description: 'Try different keywords or browse the full catalog.',
  },
};

export const WithAction: Story = {
  args: {
    variant: 'no-courses',
    heading: 'No courses yet',
    description: 'Start exploring to build your learning path.',
    action: (
      <button
        style={{
          background: '#6d28d9',
          color: 'white',
          border: 'none',
          padding: '8px 20px',
          borderRadius: 8,
          cursor: 'pointer',
        }}
      >
        Browse Catalog
      </button>
    ),
  },
};

export const CustomFigures: Story = {
  args: {
    heading: 'Custom illustration',
    description: 'With a single figure configuration.',
    figures: [{ proportion: 'wide', palette: 5 }],
  },
};
