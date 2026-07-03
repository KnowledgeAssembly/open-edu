import type { Meta, StoryObj } from '@storybook/react';
import { SilhouetteAssembly } from './silhouette-assembly';

const meta: Meta<typeof SilhouetteAssembly> = {
  title: 'Visual DNA/Silhouette Assembly',
  component: SilhouetteAssembly,
  argTypes: {
    proportion: { control: 'select', options: ['tall', 'med', 'short', 'wide', 'narrow'] },
    palette: { control: 'select', options: [1, 2, 3, 4, 5] },
    animated: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof SilhouetteAssembly>;

export const Default: Story = {
  args: { proportion: 'med', palette: 1 },
};

export const AllProportions: Story = {
  name: 'All Proportions',
  render: () => (
    <div className="flex items-end gap-6">
      {(['tall', 'med', 'short', 'wide', 'narrow'] as const).map((prop) => (
        <div key={prop} className="text-center">
          <SilhouetteAssembly proportion={prop} palette={1} />
          <p className="text-xs text-gray-500 mt-2">{prop}</p>
        </div>
      ))}
    </div>
  ),
};

export const AllPalettes: Story = {
  name: 'All Palettes',
  render: () => (
    <div className="flex items-end gap-6">
      {([1, 2, 3, 4, 5] as const).map((pal) => (
        <div key={pal} className="text-center">
          <SilhouetteAssembly proportion="med" palette={pal} />
          <p className="text-xs text-gray-500 mt-2">c{pal}</p>
        </div>
      ))}
    </div>
  ),
};

export const GroupPortrait: Story = {
  name: 'Scene: Group Portrait',
  render: () => (
    <div className="flex items-end gap-4" role="img" aria-label="A group of people">
      <SilhouetteAssembly proportion="tall" palette={3} />
      <SilhouetteAssembly proportion="short" palette={2} />
      <SilhouetteAssembly proportion="med" palette={5} />
      <SilhouetteAssembly proportion="wide" palette={1} />
      <SilhouetteAssembly proportion="narrow" palette={4} />
    </div>
  ),
};

export const LearningMoment: Story = {
  name: 'Scene: Learning Moment',
  render: () => (
    <div className="flex items-end gap-4" role="img" aria-label="Two people learning together, one slightly ahead">
      <SilhouetteAssembly proportion="wide" palette={1} className="translate-y-[-4px]" />
      <SilhouetteAssembly proportion="med" palette={2} />
      <SilhouetteAssembly proportion="short" palette={4} />
    </div>
  ),
};

export const Community: Story = {
  name: 'Scene: Community',
  render: () => (
    <div className="flex items-end gap-3" role="img" aria-label="A community of people">
      <SilhouetteAssembly proportion="tall" palette={3} />
      <SilhouetteAssembly proportion="short" palette={5} />
      <SilhouetteAssembly proportion="narrow" palette={1} />
      <SilhouetteAssembly proportion="wide" palette={4} />
      <SilhouetteAssembly proportion="med" palette={2} />
      <SilhouetteAssembly proportion="tall" palette={5} />
      <SilhouetteAssembly proportion="short" palette={3} />
    </div>
  ),
};
