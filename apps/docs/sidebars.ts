import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docs: [
    'intro',
    'architecture',
    'package-format',
    'package-authoring',
    {
      type: 'category',
      label: 'CLI',
      items: ['cli/overview'],
    },
    {
      type: 'category',
      label: 'Widgets',
      items: ['widgets/overview'],
    },
    {
      type: 'category',
      label: 'Examples',
      items: [
        'examples/hello-world',
        'examples/intro-javascript',
        'examples/fractions',
        'examples/adaptive-study',
        'examples/skill-graph',
        'examples/widget-practice',
        'examples/remote-widget-demo',
      ],
    },
  ],
};

export default sidebars;
