import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docs: [
    'intro',
    'architecture',
    'learner',
    'package-format',
    'package-authoring',
    'testing',
    {
      type: 'category',
      label: 'CLI',
      items: ['cli/overview'],
    },
    {
      type: 'category',
      label: 'Packages',
      items: [
        'schemas',
        'accessibility',
        'telemetry',
        'rewards',
        'runtime',
        'dev-server',
      ],
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
        'examples/autism-reading',
        'examples/living-vs-nonliving',
        'examples/skill-graph',
        'examples/widget-practice',
        'examples/widget-showcase',
        'examples/remote-widget-demo',
      ],
    },
  ],
};

export default sidebars;
