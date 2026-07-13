import type { WidgetDefinitionV2 } from '../../types';
import { LearningIntent } from '../../metadata/learning-intents';

function LabelDiagramComponent() {
  return (
    <div role="region" aria-label="Label Diagram">
      <p>Label Diagram widget — coming soon</p>
    </div>
  );
}

const LabelDiagramWidget: WidgetDefinitionV2 = {
  id: 'science.label-diagram',
  version: '0.1.0',
  name: 'Label Diagram',
  description: 'Label parts of a scientific diagram or illustration',
  domain: 'science',
  learningIntents: [LearningIntent.Apply, LearningIntent.Assess],
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
    authoringPrompt: 'Create a diagram labeling activity for science education',
  },
  icon: 'tag',
  keywords: ['label', 'diagram', 'science', 'parts', '标注'],
  status: 'experimental',
  render: LabelDiagramComponent,
};

export { LabelDiagramWidget as labelDiagram };
export default LabelDiagramWidget;
