import type { Meta, StoryObj } from '@storybook/react';
import { SideNav } from './SideNav';

const meta: Meta<typeof SideNav> = {
  title: 'Patterns/SideNav',
  component: SideNav,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof SideNav>;

export const Default: Story = {
  args: {
    courseTitle: 'Intro to JavaScript',
    onResumeLesson: () => console.log('Resume clicked'),
  },
};

export const ActiveTab: Story = {
  args: {
    courseTitle: 'Data Structures',
    activeTab: 'modules',
    onResumeLesson: () => console.log('Resume clicked'),
  },
};

export const WithChildren: Story = {
  args: {
    courseTitle: 'Web Development',
    defaultActiveTab: 'modules',
    onResumeLesson: () => console.log('Resume clicked'),
  },
  render: (args) => (
    <SideNav {...args}>
      <ul className="list-none p-0 m-0 text-sm">
        <li className="px-4 py-1.5 text-on-surface-variant hover:bg-surface-container-high rounded cursor-pointer">
          Module 1: HTML Basics
        </li>
        <li className="px-4 py-1.5 text-on-surface-variant hover:bg-surface-container-high rounded cursor-pointer">
          Module 2: CSS Fundamentals
        </li>
        <li className="px-4 py-1.5 text-on-surface-variant hover:bg-surface-container-high rounded cursor-pointer">
          Module 3: JavaScript Intro
        </li>
      </ul>
    </SideNav>
  ),
};

export const ControlledTab: Story = {
  args: {
    courseTitle: 'Algorithms',
    activeTab: 'progress',
    onTabChange: (tab) => console.log('Tab changed to:', tab),
    onResumeLesson: () => console.log('Resume clicked'),
  },
};
