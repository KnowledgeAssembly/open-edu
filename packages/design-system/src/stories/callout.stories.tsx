import type { Meta, StoryObj } from '@storybook/react';
import { callout } from '@open-edu/widgets';

const CalloutComponent = callout.render;

function StoryWrapper(props: { config?: Record<string, unknown> }) {
  return (
    <div style={{ maxWidth: '600px', margin: '2rem auto' }}>
      <CalloutComponent
        nodeId="story-node"
        config={props.config ?? {}}
        emitInteraction={() => {}}
        complete={() => {}}
      />
    </div>
  );
}

const meta: Meta<typeof StoryWrapper> = {
  title: 'Widgets/Callout',
  component: StoryWrapper,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof StoryWrapper>;

export const Default: Story = {
  args: {
    config: {
      type: 'note',
      title: 'Note',
      content: 'This is a default note callout.',
    },
  },
};

export const AllTypes: Story = {
  render: () => (
    <div
      style={{
        maxWidth: '600px',
        margin: '2rem auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}
    >
      {(
        [
          'note',
          'tip',
          'warning',
          'important',
          'definition',
          'example',
          'fun-fact',
          'quote',
          'success',
          'question',
        ] as const
      ).map((type) => (
        <CalloutComponent
          key={type}
          nodeId={`type-${type}`}
          config={{
            type,
            title: type.charAt(0).toUpperCase() + type.slice(1),
            content: `This is a ${type} callout type.`,
          }}
          emitInteraction={() => {}}
          complete={() => {}}
        />
      ))}
    </div>
  ),
};

export const Collapsible: Story = {
  args: {
    config: {
      type: 'tip',
      title: 'Click to expand',
      content: 'This content is hidden until you click the toggle button.',
      collapsible: true,
      defaultExpanded: false,
    },
  },
};

export const WithCustomIcon: Story = {
  args: {
    config: {
      type: 'success',
      title: 'Completed',
      content: 'You have successfully completed this module.',
      icon: '\u2705',
    },
  },
};
