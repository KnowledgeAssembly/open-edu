import type { WidgetDefinitionV2 } from '../../types';
import { LearningIntent } from '../../metadata/learning-intents';

function TimelineComponent() {
  return (
    <div role="region" aria-label="Timeline">
      <p>Timeline widget — coming soon</p>
    </div>
  );
}

const TimelineWidget: WidgetDefinitionV2 = {
  id: 'core.timeline',
  version: '0.1.0',
  name: 'Timeline',
  description: 'Explore events in chronological order with interactive timeline',
  domain: 'core',
  learningIntents: [LearningIntent.Apply, LearningIntent.Observe],
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
    difficulty: 'medium',
    estimatedMinutes: 3,
    bloomsLevel: 'apply',
    cognitiveLoad: 'moderate',
    subjectTags: ['general', 'history'],
    authoringPrompt: 'Create a timeline of events in chronological order',
  },
  icon: 'git-branch',
  keywords: ['timeline', 'events', 'chronological', 'history', '时间线'],
  status: 'experimental',
  render: TimelineComponent,
};

export { TimelineWidget as timeline };
export default TimelineWidget;
