import type { Meta, StoryObj } from '@storybook/react';
import { AppSidebar, type AppSidebarItem, type AppSidebarSection } from './AppSidebar';

const HomeIcon = (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
  </svg>
);

const BookIcon = (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z" />
  </svg>
);

const ChartIcon = (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z" />
  </svg>
);

const SettingsIcon = (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
  </svg>
);

const navItems: AppSidebarItem[] = [
  { id: 'home', label: 'Home', icon: HomeIcon },
  { id: 'courses', label: 'Courses', icon: BookIcon },
  { id: 'progress', label: 'Progress', icon: ChartIcon },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

const courseSections: AppSidebarSection[] = [
  {
    title: 'Module 1: Fundamentals',
    items: [
      { id: 'lesson-1', label: 'What is Programming?', status: 'completed' },
      { id: 'lesson-2', label: 'Variables & Types', status: 'current' },
      { id: 'lesson-3', label: 'Control Flow', status: 'future' },
    ],
  },
  {
    title: 'Module 2: Functions',
    items: [
      { id: 'lesson-4', label: 'Defining Functions', status: 'future' },
      { id: 'lesson-5', label: 'Parameters & Return', status: 'future' },
    ],
  },
];

const meta: Meta<typeof AppSidebar> = {
  title: 'Patterns/AppSidebar',
  component: AppSidebar,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof AppSidebar>;

export const Default: Story = {
  args: {
    items: navItems,
    currentItemId: 'courses',
    onNavigate: (id) => console.log('Navigate to:', id),
  },
};

export const WithSections: Story = {
  args: {
    title: 'Intro to JavaScript',
    subtitle: '12 lessons · 4 modules',
    items: navItems,
    currentItemId: 'courses',
    onNavigate: (id) => console.log('Navigate to:', id),
    sections: courseSections,
    onBack: {
      label: 'All Courses',
      onClick: () => console.log('Back clicked'),
    },
  },
};

export const Collapsed: Story = {
  args: {
    items: navItems,
    currentItemId: 'home',
    onNavigate: (id) => console.log('Navigate to:', id),
    defaultCollapsed: true,
    onCollapseChange: (c) => console.log('Collapsed:', c),
  },
};
