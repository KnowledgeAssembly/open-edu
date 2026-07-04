import type { Preview, Decorator } from '@storybook/react';
import '../src/index.css';

const withThemeProvider: Decorator = (Story, context) => {
  const theme = context.globals.theme || 'lumina-scholastica';
  const themeMap: Record<string, string> = {
    'lumina-scholastica': 'light',
    nocturnal: 'dark',
    zen: 'light',
  };
  return (
    <div data-theme={theme} className={themeMap[theme] === 'dark' ? 'dark' : ''}>
      <Story />
    </div>
  );
};

const preview: Preview = {
  decorators: [withThemeProvider],
  globalTypes: {
    theme: {
      description: 'Open-Edu Theme',
      toolbar: {
        title: 'Theme',
        items: [
          { value: 'lumina-scholastica', title: 'OpenEdu Light' },
          { value: 'nocturnal', title: 'OpenEdu Dark' },
          { value: 'zen', title: 'OpenEdu Zen' },
        ],
        dynamicTitle: true,
      },
    },
  },
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'dark', value: 'var(--oe-color-background, #0f0f1a)' },
      ],
    },
    layout: 'centered',
    docs: {
      autodocs: 'tag',
    },
  },
};

export default preview;
