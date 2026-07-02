import type { Meta, StoryObj } from '@storybook/react';
import { DefinitionBlock } from './DefinitionBlock';

const meta: Meta<typeof DefinitionBlock> = {
  title: 'Learning/DefinitionBlock',
  component: DefinitionBlock,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof DefinitionBlock>;

export const Default: Story = {
  args: {
    term: 'Algorithm',
    children: 'A step-by-step procedure for solving a problem or accomplishing a task.',
  },
};

export const WithLongDefinition: Story = {
  args: {
    term: 'Photosynthesis',
    children: 'The process by which green plants and certain other organisms use the energy of light to convert carbon dioxide and water into the simple sugar glucose. Oxygen is released as a byproduct.',
  },
};

export const MathDefinition: Story = {
  args: {
    term: 'Pythagorean Theorem',
    children: 'In a right-angled triangle, the square of the hypotenuse is equal to the sum of the squares of the other two sides: a² + b² = c².',
  },
};
