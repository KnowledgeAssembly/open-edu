import type { Meta, StoryObj } from '@storybook/react';
import { TopAppBar } from './TopAppBar';
import { FontSizeProvider } from '../font-size-context.js';

const meta: Meta<typeof TopAppBar> = {
  title: 'Patterns/TopAppBar',
  component: TopAppBar,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <FontSizeProvider>
        <Story />
      </FontSizeProvider>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof TopAppBar>;

export const Default: Story = {
  args: {
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Courses', href: '/courses' },
      { label: 'Intro to JavaScript' },
    ],
  },
};

export const WithA11yControls: Story = {
  args: {
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'My Courses', href: '/courses' },
    ],
    showA11yControls: true,
  },
};

export const WithAvatar: Story = {
  args: {
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dashboard', href: '/dashboard' },
    ],
    userAvatar: 'https://i.pravatar.cc/150?u=sarthak',
  },
};

export const CourseView: Story = {
  args: {
    isCourseView: true,
    courseTitle: 'Introduction to Machine Learning',
    progressCurrent: 7,
    progressTotal: 12,
  },
};

export const CourseViewNoProgress: Story = {
  args: {
    isCourseView: true,
    courseTitle: 'Advanced Algorithms',
  },
};

export const BreadcrumbsOnly: Story = {
  args: {
    breadcrumbs: [{ label: 'Home' }],
  },
};
