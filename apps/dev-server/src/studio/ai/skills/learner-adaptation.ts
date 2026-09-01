import type { CompanionSkill } from '@open-edu/companion';

export const learnerAdaptationSkill: CompanionSkill = {
  id: 'learner-adaptation',
  description: 'Adapt content, pacing, and activity design to a learner profile.',
  instructions:
    'Adapt explanations, examples, pacing, and assessment format to the active learner profile. Distinguish learner context from author context.',
  tools: ['generate_item', 'edit_item'], // only the authoring tools the skill influences
  permissions: ['item.generate', 'item.edit'],
};
