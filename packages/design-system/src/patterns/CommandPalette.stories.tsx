import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { CommandPalette, CommandGroup, CommandItem, CommandEmpty } from './CommandPalette';

const meta: Meta<typeof CommandPalette> = {
  title: 'Patterns/CommandPalette',
  component: CommandPalette,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof CommandPalette>;

const CommandPaletteWrapper = (props: Partial<React.ComponentProps<typeof CommandPalette>>) => {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-primary text-on-primary rounded-lg px-4 py-2 text-sm font-semibold"
      >
        Open Command Palette
      </button>
      <CommandPalette open={open} onOpenChange={setOpen} {...props}>
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => console.log('Go to Dashboard')}>
            <span>Go to Dashboard</span>
          </CommandItem>
          <CommandItem onSelect={() => console.log('Go to Courses')}>
            <span>Go to Courses</span>
          </CommandItem>
          <CommandItem onSelect={() => console.log('Go to Settings')}>
            <span>Go to Settings</span>
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => console.log('Create new course')}>
            <span>Create New Course</span>
          </CommandItem>
          <CommandItem onSelect={() => console.log('Import content')}>
            <span>Import Content</span>
          </CommandItem>
          <CommandItem disabled>
            <span>Export Data (Coming Soon)</span>
          </CommandItem>
        </CommandGroup>
      </CommandPalette>
    </>
  );
};

export const Default: Story = {
  render: () => <CommandPaletteWrapper />,
};

export const CustomPlaceholder: Story = {
  render: () => <CommandPaletteWrapper placeholder="Type a command..." />,
};

export const WithEmptyState: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className="bg-primary text-on-primary rounded-lg px-4 py-2 text-sm font-semibold"
        >
          Open Command Palette
        </button>
        <CommandPalette open={open} onOpenChange={setOpen}>
          <CommandEmpty>No commands available</CommandEmpty>
        </CommandPalette>
      </>
    );
  },
};
