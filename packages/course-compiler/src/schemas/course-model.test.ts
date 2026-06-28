import { describe, it, expect } from 'vitest';
import {
  CourseModelSchema,
  CourseMetadataSchema,
  CourseModuleSchema,
  LessonSchema,
  ActivitySchema,
  QuizSchema,
  QuestionSchema,
} from './course-model.js';

function validMetadata() {
  return {
    title: 'Introduction to Algebra',
    description: 'Learn the basics of algebra',
    author: 'John Doe',
    version: '1.0.0',
    language: 'en',
    keywords: ['algebra', 'math'],
    targetAudience: 'High school students',
    difficulty: 'beginner' as const,
    estimatedHours: 10,
    lastUpdated: '2024-01-01',
  };
}

function validLesson() {
  return {
    id: 'lesson-1',
    title: 'Variables',
    objectives: [
      {
        id: 'obj-1',
        description: 'Understand what a variable is',
        bloomLevel: 'understand' as const,
        skills: ['algebra'],
      },
    ],
    content: 'A variable is a symbol that represents a quantity.',
    activities: [
      {
        id: 'act-1',
        type: 'reading' as const,
        content: 'Read about variables in mathematics.',
        duration: 10,
      },
    ],
    quiz: {
      id: 'quiz-1',
      title: 'Variables Quiz',
      description: 'Test your understanding',
      timeLimit: 10,
      passingScore: 70,
      questions: [
        {
          id: 'q-1',
          type: 'multiple-choice' as const,
          prompt: 'What is a variable?',
          options: [
            { id: 'a', text: 'A symbol for a quantity', correct: true },
            { id: 'b', text: 'A type of number', correct: false },
            { id: 'c', text: 'An equation', correct: false },
          ],
          explanation: 'A variable represents an unknown quantity.',
        },
      ],
      shuffleQuestions: true,
    },
    assets: [
      { id: 'asset-1', path: 'images/variable.png', type: 'image' as const, description: 'Variable diagram' },
    ],
    glossary: [{ term: 'variable', definition: 'A symbol that represents a quantity' }],
    references: [{ title: 'Algebra 101', url: 'https://example.com/algebra' }],
    estimatedMinutes: 30,
  };
}

function validModule() {
  return {
    id: 'mod-1',
    title: 'Algebra Basics',
    description: 'Foundation of algebra',
    objectives: [{ id: 'obj-m1', description: 'Master algebraic thinking' }],
    lessons: [validLesson()],
    prerequisites: [],
    estimatedHours: 5,
  };
}

function validCourseModel() {
  return {
    metadata: validMetadata(),
    modules: [validModule()],
    globalGlossary: [{ term: 'algebra', definition: 'A branch of mathematics' }],
    globalReferences: [{ title: 'Math is Fun', url: 'https://mathisfun.com' }],
  };
}

describe('CourseMetadataSchema', () => {
  it('accepts valid metadata', () => {
    const result = CourseMetadataSchema.safeParse(validMetadata());
    expect(result.success).toBe(true);
  });

  it('defaults language to en', () => {
    const { language: _language, ...rest } = validMetadata();
    const result = CourseMetadataSchema.safeParse(rest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.language).toBe('en');
    }
  });

  it('rejects invalid difficulty', () => {
    const result = CourseMetadataSchema.safeParse({ ...validMetadata(), difficulty: 'expert' });
    expect(result.success).toBe(false);
  });

  it('rejects missing title', () => {
    const { title: _, ...rest } = validMetadata();
    const result = CourseMetadataSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects missing description', () => {
    const { description: _, ...rest } = validMetadata();
    const result = CourseMetadataSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
});

describe('QuestionSchema', () => {
  it('accepts multiple-choice question', () => {
    const q = {
      id: 'q-1',
      type: 'multiple-choice',
      prompt: 'What is 2+2?',
      options: [
        { id: 'a', text: '4', correct: true },
        { id: 'b', text: '5', correct: false },
      ],
    };
    expect(QuestionSchema.safeParse(q).success).toBe(true);
  });

  it('accepts true-false question', () => {
    const q = {
      id: 'q-2',
      type: 'true-false',
      prompt: 'The sky is blue.',
      correctAnswer: true,
    };
    expect(QuestionSchema.safeParse(q).success).toBe(true);
  });

  it('accepts short-answer question', () => {
    const q = {
      id: 'q-3',
      type: 'short-answer',
      prompt: 'What is the capital of France?',
      sampleAnswer: 'Paris',
    };
    expect(QuestionSchema.safeParse(q).success).toBe(true);
  });

  it('accepts fill-blank question', () => {
    const q = {
      id: 'q-4',
      type: 'fill-blank',
      template: 'The capital of France is ____.',
      answer: 'Paris',
      alternatives: ['paris'],
    };
    expect(QuestionSchema.safeParse(q).success).toBe(true);
  });

  it('rejects invalid discriminant', () => {
    const q = {
      id: 'q-5',
      type: 'essay',
      prompt: 'Write an essay.',
    };
    expect(QuestionSchema.safeParse(q).success).toBe(false);
  });

  it('rejects multiple-choice with fewer than 2 options', () => {
    const q = {
      id: 'q-6',
      type: 'multiple-choice',
      prompt: 'What is 2+2?',
      options: [{ id: 'a', text: '4', correct: true }],
    };
    expect(QuestionSchema.safeParse(q).success).toBe(false);
  });
});

describe('QuizSchema', () => {
  it('accepts valid quiz', () => {
    const quiz = {
      id: 'quiz-1',
      title: 'Test Quiz',
      questions: [
        {
          id: 'q-1',
          type: 'multiple-choice' as const,
          prompt: 'What is 2+2?',
          options: [
            { id: 'a', text: '4', correct: true },
            { id: 'b', text: '5', correct: false },
          ],
        },
      ],
    };
    expect(QuizSchema.safeParse(quiz).success).toBe(true);
  });

  it('rejects quiz with no questions', () => {
    const quiz = {
      id: 'quiz-2',
      title: 'Empty Quiz',
      questions: [],
    };
    expect(QuizSchema.safeParse(quiz).success).toBe(false);
  });

  it('defaults shuffleQuestions to false', () => {
    const quiz = {
      id: 'quiz-3',
      title: 'Quiz',
      questions: [
        {
          id: 'q-1',
          type: 'short-answer' as const,
          prompt: 'Test?',
        },
      ],
    };
    const result = QuizSchema.safeParse(quiz);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.shuffleQuestions).toBe(false);
    }
  });
});

describe('ActivitySchema', () => {
  it('accepts reading activity', () => {
    const act = { id: 'a-1', type: 'reading', content: 'Read this.' };
    expect(ActivitySchema.safeParse(act).success).toBe(true);
  });

  it('accepts exercise activity', () => {
    const act = { id: 'a-2', type: 'exercise', instructions: 'Solve for x.' };
    expect(ActivitySchema.safeParse(act).success).toBe(true);
  });

  it('accepts discussion activity', () => {
    const act = { id: 'a-3', type: 'discussion', prompt: 'Discuss.' };
    expect(ActivitySchema.safeParse(act).success).toBe(true);
  });

  it('accepts reflection activity', () => {
    const act = { id: 'a-4', type: 'reflection', prompt: 'Reflect.' };
    expect(ActivitySchema.safeParse(act).success).toBe(true);
  });

  it('accepts video activity', () => {
    const act = { id: 'a-5', type: 'video', url: 'https://example.com/video' };
    expect(ActivitySchema.safeParse(act).success).toBe(true);
  });

  it('rejects invalid activity type', () => {
    const act = { id: 'a-6', type: 'quiz', content: 'Not an activity.' };
    expect(ActivitySchema.safeParse(act).success).toBe(false);
  });
});

describe('LessonSchema', () => {
  it('accepts valid lesson', () => {
    expect(LessonSchema.safeParse(validLesson()).success).toBe(true);
  });

  it('rejects missing title', () => {
    const { title: _, ...rest } = validLesson();
    expect(LessonSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects missing objectives', () => {
    const { objectives: _, ...rest } = validLesson();
    expect(LessonSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects empty objectives', () => {
    const result = LessonSchema.safeParse({ ...validLesson(), objectives: [] });
    expect(result.success).toBe(false);
  });
});

describe('CourseModuleSchema', () => {
  it('accepts valid module', () => {
    expect(CourseModuleSchema.safeParse(validModule()).success).toBe(true);
  });

  it('rejects missing title', () => {
    const { title: _, ...rest } = validModule();
    expect(CourseModuleSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects missing lessons', () => {
    const { lessons: _, ...rest } = validModule();
    expect(CourseModuleSchema.safeParse(rest).success).toBe(false);
  });
});

describe('CourseModelSchema', () => {
  it('accepts valid course model', () => {
    expect(CourseModelSchema.safeParse(validCourseModel()).success).toBe(true);
  });

  it('rejects empty modules array', () => {
    const result = CourseModelSchema.safeParse({ ...validCourseModel(), modules: [] });
    expect(result.success).toBe(false);
  });

  it('rejects missing metadata', () => {
    const { metadata: _, ...rest } = validCourseModel();
    expect(CourseModelSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects missing modules', () => {
    const { modules: _, ...rest } = validCourseModel();
    expect(CourseModelSchema.safeParse(rest).success).toBe(false);
  });

  it('strips unknown keys', () => {
    const result = CourseModelSchema.safeParse({ ...validCourseModel(), extra: 'field' });
    expect(result.success).toBe(false);
  });
});
