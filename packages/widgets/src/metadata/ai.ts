export type BloomsLevel = 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';
export type CognitiveLoad = 'low' | 'moderate' | 'high';
export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'adaptive';

export interface AIMetadata {
  difficulty?: DifficultyLevel;
  estimatedMinutes?: number;
  bloomsLevel?: BloomsLevel;
  cognitiveLoad?: CognitiveLoad;
  recommendedAge?: [number, number];
  readingLevel?: string;
  subjectTags?: string[];
  learningObjectives?: string[];
  commonMisconceptions?: string[];
  authoringPrompt?: string;
  generationHints?: string[];
  exampleConfigs?: Record<string, unknown>[];
}
