import type { WidgetDefinitionV2 } from '../../types';
import { LearningIntent } from '../../metadata/learning-intents';

function HotspotComponent() {
  return (
    <div role="region" aria-label="Hotspot">
      <p>Hotspot widget — coming soon</p>
    </div>
  );
}

const HotspotWidget: WidgetDefinitionV2 = {
  id: 'core.hotspot',
  version: '0.1.0',
  name: 'Hotspot',
  description: 'Click or tap on specific areas of an image to answer questions',
  domain: 'core',
  learningIntents: [LearningIntent.Explore, LearningIntent.Assess],
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
    subjectTags: ['general'],
    authoringPrompt: 'Create a hotspot image activity with clickable regions',
  },
  icon: 'mouse-pointer-click',
  keywords: ['hotspot', 'click', 'tap', 'image', 'interactive'],
  status: 'experimental',
  render: HotspotComponent,
};

export { HotspotWidget as hotspot };
export default HotspotWidget;
