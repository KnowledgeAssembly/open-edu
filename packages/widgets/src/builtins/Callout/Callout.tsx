import type { WidgetDefinitionV2 } from '../../types';
import { LearningIntent } from '../../metadata/learning-intents';

function CalloutComponent() {
  return (
    <div role="region" aria-label="Callout">
      <p>Callout widget — coming soon</p>
    </div>
  );
}

const CalloutWidget: WidgetDefinitionV2 = {
  id: 'core.callout',
  version: '0.1.0',
  name: 'Callout',
  description: 'Highlight important information with styled callout boxes',
  domain: 'core',
  learningIntents: [LearningIntent.Observe],
  capabilities: {
    supportsKeyboard: true,
    supportsScreenReader: true,
    supportsOffline: true,
  },
  accessibility: {
    highContrast: true,
    screenReader: true,
    ariaSupport: true,
  },
  analytics: {},
  reward: {},
  ai: {
    difficulty: 'easy',
    estimatedMinutes: 1,
    bloomsLevel: 'remember',
    cognitiveLoad: 'low',
    subjectTags: ['general'],
    authoringPrompt: 'Create a callout to highlight key information',
  },
  icon: 'alert-circle',
  keywords: ['callout', 'highlight', 'note', 'info'],
  status: 'experimental',
  render: CalloutComponent,
};

export { CalloutWidget as callout };
export default CalloutWidget;
