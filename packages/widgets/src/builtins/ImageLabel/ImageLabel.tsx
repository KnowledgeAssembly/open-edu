import type { WidgetDefinitionV2 } from '../../types';
import { LearningIntent } from '../../metadata/learning-intents';

function ImageLabelComponent() {
  return (
    <div role="region" aria-label="Image Label">
      <p>Image Label widget — coming soon</p>
    </div>
  );
}

const ImageLabelWidget: WidgetDefinitionV2 = {
  id: 'science.image-label',
  version: '0.1.0',
  name: 'Image Label',
  description: 'Identify and label parts of an image or photograph',
  domain: 'science',
  learningIntents: [LearningIntent.Observe, LearningIntent.Apply],
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
    subjectTags: ['science'],
    authoringPrompt: 'Create an image labeling activity for education',
  },
  icon: 'image',
  keywords: ['image', 'label', 'identify', 'photo', '图片'],
  status: 'experimental',
  render: ImageLabelComponent,
};

export { ImageLabelWidget as imageLabel };
export default ImageLabelWidget;
