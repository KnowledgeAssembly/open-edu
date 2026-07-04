import type { Meta, StoryObj } from '@storybook/react';
import { CourseViewerLayout } from './CourseViewerLayout';
import { TopAppBar } from './TopAppBar';
import { SideNav } from './SideNav';
import { FontSizeProvider } from '../font-size-context.js';

const meta: Meta<typeof CourseViewerLayout> = {
  title: 'Patterns/CourseViewerLayout',
  component: CourseViewerLayout,
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
type Story = StoryObj<typeof CourseViewerLayout>;

export const Default: Story = {
  render: () => (
    <CourseViewerLayout
      topBar={
        <TopAppBar
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Courses', href: '/courses' },
            { label: 'Intro to JavaScript' },
          ]}
          showA11yControls
        />
      }
      sideNav={
        <SideNav
          courseTitle="Intro to JavaScript"
          onResumeLesson={() => console.log('Resume clicked')}
        />
      }
      content={
        <div className="p-6">
          <h1 className="text-on-surface mb-4 text-2xl font-bold">Lesson: Variables & Types</h1>
          <p className="text-on-surface-variant leading-relaxed">
            In JavaScript, variables are containers for storing data values. A variable can be
            declared using var, let, or const keywords.
          </p>
        </div>
      }
      rightPanel={
        <div className="bg-surface-container h-full p-4">
          <h3 className="text-on-surface mb-2 text-sm font-semibold">Table of Contents</h3>
          <ul className="text-on-surface-variant m-0 list-none space-y-1 p-0 text-xs">
            <li className="text-primary font-medium">Variables</li>
            <li>Data Types</li>
            <li>Type Coercion</li>
          </ul>
        </div>
      }
    />
  ),
  parameters: { layout: 'fullscreen' },
};

export const Minimal: Story = {
  render: () => (
    <CourseViewerLayout
      content={
        <div className="p-6">
          <h1 className="text-on-surface text-2xl font-bold">Simple Course View</h1>
        </div>
      }
    />
  ),
  parameters: { layout: 'fullscreen' },
};
