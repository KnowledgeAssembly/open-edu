import { describe, it, expect } from 'vitest';
import {
  CardTypeSchema,
  CardDifficultySchema,
  CardDefinitionSchema,
  CardDefinitionsSchema,
} from './cards';

const minimalCard = {
  id: 'living-things',
  title: 'Living Things',
  category: 'Biology',
  type: 'knowledge',
  summary: 'Learn what makes something alive.',
  unlock: { type: 'chain', completedNodeIds: ['nodes/guided-practice.json'] },
};

const fullCard = {
  id: 'butterfly',
  slug: 'butterfly-life-cycle',
  title: 'Butterfly',
  subtitle: 'Metamorphosis in nature',
  category: 'Biology',
  type: 'knowledge',
  icon: 'butterfly',
  illustration: '/images/butterfly.svg',
  summary: 'Learn about butterflies and their life cycle.',
  detailedExplanation: 'Butterflies undergo complete metamorphosis...',
  tags: ['insects', 'biology', 'metamorphosis'],
  difficulty: 'easy',
  level: 1,
  maximumLevel: 5,
  unlock: { type: 'chain', completedNodeIds: ['nodes/butterfly-life-cycle.md'] },
  nextLevel: { type: 'score', nodeId: 'nodes/butterfly-quiz.json', minScore: 80 },
  relatedLessons: ['nodes/butterfly-life-cycle.md'],
  relatedQuizzes: ['nodes/butterfly-quiz.json'],
  relatedVideos: ['https://example.com/butterfly'],
  relatedProjects: ['nodes/butterfly-observation.json'],
  audioNarration: '/audio/butterfly.mp3',
};

describe('CardTypeSchema', () => {
  it('should accept valid card types', () => {
    expect(CardTypeSchema.parse('knowledge')).toBe('knowledge');
    expect(CardTypeSchema.parse('skill')).toBe('skill');
    expect(CardTypeSchema.parse('achievement')).toBe('achievement');
    expect(CardTypeSchema.parse('exploration')).toBe('exploration');
    expect(CardTypeSchema.parse('mentor')).toBe('mentor');
  });

  it('should reject invalid card types', () => {
    expect(() => CardTypeSchema.parse('invalid')).toThrow();
    expect(() => CardTypeSchema.parse('')).toThrow();
  });
});

describe('CardDifficultySchema', () => {
  it('should accept valid difficulties', () => {
    expect(CardDifficultySchema.parse('easy')).toBe('easy');
    expect(CardDifficultySchema.parse('medium')).toBe('medium');
    expect(CardDifficultySchema.parse('hard')).toBe('hard');
  });

  it('should reject invalid difficulty', () => {
    expect(() => CardDifficultySchema.parse('extreme')).toThrow();
  });
});

describe('CardDefinitionSchema', () => {
  it('should accept a minimal card definition', () => {
    const result = CardDefinitionSchema.parse(minimalCard);
    expect(result.id).toBe('living-things');
    expect(result.level).toBe(1);
    expect(result.maximumLevel).toBe(1);
  });

  it('should accept a full card definition with all fields', () => {
    const result = CardDefinitionSchema.parse(fullCard);
    expect(result.id).toBe('butterfly');
    expect(result.slug).toBe('butterfly-life-cycle');
    expect(result.difficulty).toBe('easy');
    expect(result.maximumLevel).toBe(5);
  });

  it('should apply defaults for level and maximumLevel', () => {
    const result = CardDefinitionSchema.parse(minimalCard);
    expect(result.level).toBe(1);
    expect(result.maximumLevel).toBe(1);
  });

  it('should reject card without id', () => {
    const { id: _, ...rest } = minimalCard;
    expect(() => CardDefinitionSchema.parse(rest)).toThrow();
  });

  it('should reject card without title', () => {
    const { title: _, ...rest } = minimalCard;
    expect(() => CardDefinitionSchema.parse(rest)).toThrow();
  });

  it('should reject card without category', () => {
    const { category: _, ...rest } = minimalCard;
    expect(() => CardDefinitionSchema.parse(rest)).toThrow();
  });

  it('should reject card without summary', () => {
    const { summary: _, ...rest } = minimalCard;
    expect(() => CardDefinitionSchema.parse(rest)).toThrow();
  });

  it('should reject card without type', () => {
    const { type: _, ...rest } = minimalCard;
    expect(() => CardDefinitionSchema.parse(rest)).toThrow();
  });

  it('should reject card without unlock', () => {
    const { unlock: _, ...rest } = minimalCard;
    expect(() => CardDefinitionSchema.parse(rest)).toThrow();
  });

  it('should reject level outside 1-5 range', () => {
    expect(() => CardDefinitionSchema.parse({ ...minimalCard, level: 0 })).toThrow();
    expect(() => CardDefinitionSchema.parse({ ...minimalCard, level: 6 })).toThrow();
  });

  it('should reject non-integer level', () => {
    expect(() => CardDefinitionSchema.parse({ ...minimalCard, level: 1.5 })).toThrow();
  });

  it('should accept optional nextLevel', () => {
    const withNext = CardDefinitionSchema.parse(fullCard);
    expect(withNext.nextLevel).toBeDefined();
    expect(withNext.nextLevel!.type).toBe('score');

    const withoutNext = CardDefinitionSchema.parse(minimalCard);
    expect(withoutNext.nextLevel).toBeUndefined();
  });

  it('should accept all RewardConditionSchema variants as unlock', () => {
    const score = CardDefinitionSchema.parse({
      ...minimalCard,
      unlock: { type: 'score', nodeId: 'quiz-1', minScore: 80 },
    });
    expect(score.unlock.type).toBe('score');

    const andCond = CardDefinitionSchema.parse({
      ...minimalCard,
      unlock: {
        type: 'and',
        conditions: [
          { type: 'score', nodeId: 'quiz-1', minScore: 80 },
          { type: 'chain', completedNodeIds: ['nodes/lesson-1.md'] },
        ],
      },
    });
    expect(andCond.unlock.type).toBe('and');
  });
});

describe('CardDefinitionsSchema', () => {
  it('should accept an object with cards array', () => {
    const result = CardDefinitionsSchema.parse({
      cards: [minimalCard, fullCard],
    });
    expect(result.cards).toHaveLength(2);
  });

  it('should reject a bare array', () => {
    expect(() => CardDefinitionsSchema.parse([minimalCard])).toThrow();
  });

  it('should accept an empty cards array', () => {
    const result = CardDefinitionsSchema.parse({ cards: [] });
    expect(result.cards).toHaveLength(0);
  });
});
