import type { WidgetDefinitionV2 } from '../../types';
import { LearningIntent } from '../../metadata/learning-intents';

function ImageCompareComponent() {
  return (
    <div role="region" aria-label="Image Compare">
      <p>Image Compare widget — coming soon</p>
    </div>
  );
}

const ImageCompareWidget: WidgetDefinitionV2 = {
  id: 'core.image-compare',
  version: '0.1.0',
  name: 'Image Compare',
  description: 'Compare two images side by side to identify differences or similarities',
  domain: 'core',
  learningIntents: [LearningIntent.Compare, LearningIntent.Observe],
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
    estimatedMinutes: 2,
    bloomsLevel: 'analyze',
    cognitiveLoad: 'low',
    subjectTags: ['general'],
    authoringPrompt: 'Create an image comparison activity',
  },
  icon: 'columns-2',
  keywords: ['image', 'compare', 'difference', 'side-by-side'],
  status: 'experimental',
  render: ImageCompareComponent,
};

export { ImageCompareWidget as imageCompare };
export default ImageCompareWidget;
