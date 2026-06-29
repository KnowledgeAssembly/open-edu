import { describe, it, expect } from 'vitest';
import { renderCourseSpec } from '../index.js';
import type { GeneratedConcept, GeneratedActivity, ConceptActivityPair } from '../../types.js';

function makeConcept(overrides: Partial<GeneratedConcept> = {}): GeneratedConcept {
  return {
    conceptId: 'addition_1_10',
    chapterCode: 'CH1',
    chapterName: 'Addition',
    learningObjective: 'Add two numbers with sum up to 10',
    coreIdea: 'Addition means putting groups together to find the total.',
    examples: ['2 + 1 = 3', '3 + 2 = 5'],
    misconceptions: ['Counting the starting number twice'],
    supports: { visual: true },
    masteryCriteria: 0.8,
    difficulty: 'beginner',
    estimatedDuration: 15,
    dependencies: ['counting_1_10'],
    ...overrides,
  };
}

function makeActivity(
  step: string,
  order: number,
  overrides: Partial<GeneratedActivity> = {},
): GeneratedActivity {
  const stepToType: Record<string, string> = {
    observe: 'reading',
    guided_practice: 'exercise',
    independent_practice: 'exercise',
    mastery_check: 'quiz',
    positive_completion: 'reflection',
  };

  const base: GeneratedActivity = {
    step: step as GeneratedActivity['step'],
    courseSpecType: stepToType[step] as GeneratedActivity['courseSpecType'],
    order,
    content: { description: 'Test activity', instructions: 'Do the activity' },
    ...overrides,
  };

  if (step === 'mastery_check') {
    base.content = {
      description: 'Mastery Check',
      questions: [
        { question: 'What is 2 + 1?', options: ['2', '3', '4', '5'], correctIndex: 1 },
        { question: 'What is 3 + 2?', options: ['4', '5', '6', '7'], correctIndex: 1 },
      ],
    };
  }

  if (step === 'positive_completion') {
    base.content = {
      description: 'Great work!',
      instructions: 'You did it! Think about addition in daily life.',
    };
  }

  return base;
}

function makeFullPair(conceptOverrides: Partial<GeneratedConcept> = {}): ConceptActivityPair {
  const concept = makeConcept(conceptOverrides);
  const activities = [
    makeActivity('observe', 1),
    makeActivity('guided_practice', 2),
    makeActivity('independent_practice', 3),
    makeActivity('mastery_check', 4),
    makeActivity('positive_completion', 5),
  ];
  return { concept, activities };
}

describe('renderCourseSpec', () => {
  it('generates valid frontmatter', () => {
    const result = renderCourseSpec([makeFullPair()]);
    expect(result).toContain('---');
    expect(result).toContain('title:');
    expect(result).toContain('version:');
    expect(result).toContain('difficulty:');
    expect(result).toContain('generated: true');
  });

  it('includes a module heading for each chapter', () => {
    const pair1 = makeFullPair({ chapterCode: 'CH1', chapterName: 'Addition' });
    const pair2 = makeFullPair({
      conceptId: 'fractions_intro',
      chapterCode: 'CH2',
      chapterName: 'Fractions',
      learningObjective: 'Identify parts of a whole',
      coreIdea: 'Fractions represent parts of a whole.',
      examples: ['1/2 of a pizza', '1/4 of a cake'],
      misconceptions: [],
      dependencies: [],
    });
    const result = renderCourseSpec([pair1, pair2]);
    expect(result).toContain('# Module 1: Addition');
    expect(result).toContain('# Module 2: Fractions');
  });

  it('includes lesson headings for each concept', () => {
    const result = renderCourseSpec([makeFullPair()]);
    expect(result).toContain('## Lesson');
    expect(result).toContain('Add two numbers with sum up to 10');
  });

  it('renders objectives section', () => {
    const result = renderCourseSpec([makeFullPair()]);
    expect(result).toContain('**Objectives:**');
    expect(result).toContain('- Add two numbers with sum up to 10');
  });

  it('renders the core idea as lesson content', () => {
    const result = renderCourseSpec([makeFullPair()]);
    expect(result).toContain('Addition means putting groups together to find the total.');
  });

  it('renders examples in the lesson', () => {
    const result = renderCourseSpec([makeFullPair()]);
    expect(result).toContain('- 2 + 1 = 3');
    expect(result).toContain('- 3 + 2 = 5');
  });

  it('renders misconceptions section when present', () => {
    const result = renderCourseSpec([makeFullPair()]);
    expect(result).toContain('**Common Misconceptions:**');
    expect(result).toContain('Counting the starting number twice');
  });

  it('renders estimated time', () => {
    const result = renderCourseSpec([makeFullPair()]);
    expect(result).toContain('*Estimated time: 15 minutes*');
  });

  it('renders observe as Reading activity', () => {
    const result = renderCourseSpec([makeFullPair()]);
    expect(result).toContain('### Activity: Reading');
    expect(result).toContain('Do the activity');
  });

  it('renders guided practice as Exercise activity', () => {
    const result = renderCourseSpec([makeFullPair()]);
    expect(result).toContain('### Activity: Exercise');
  });

  it('renders mastery check as Quiz', () => {
    const result = renderCourseSpec([makeFullPair()]);
    expect(result).toContain('### Quiz: Mastery Check');
    expect(result).toContain('What is 2 + 1?');
    expect(result).toContain('- [x] 3');
    expect(result).toContain('- [ ] 2');
  });

  it('renders positive completion as Reflection', () => {
    const result = renderCourseSpec([makeFullPair()]);
    expect(result).toContain('### Activity: Reflection');
    expect(result).toContain('Great work!');
    expect(result).toContain('You did it!');
  });

  it('handles multiple concepts in same chapter', () => {
    const pair1 = makeFullPair({
      conceptId: 'counting_1_10',
      learningObjective: 'Count objects from 1 to 10',
    });
    const pair2 = makeFullPair({
      conceptId: 'addition_1_10',
      learningObjective: 'Add two numbers',
    });

    const result = renderCourseSpec([pair1, pair2]);
    expect(result).toContain('## Lesson');
    const lessonMatches = result.match(/## Lesson /g);
    expect(lessonMatches).toHaveLength(2);
  });

  it('calculates difficulty from concepts', () => {
    const pair = makeFullPair({ difficulty: 'advanced' });
    const result = renderCourseSpec([pair]);
    expect(result).toContain('difficulty: advanced');
  });

  it('handles empty concept list gracefully', () => {
    const result = renderCourseSpec([]);
    expect(result).toContain('---');
    expect(result).toContain('title:');
  });
});
