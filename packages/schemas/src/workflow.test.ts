import { describe, it, expect } from 'vitest';
import { WorkflowSchema } from './workflow';

describe('WorkflowSchema', () => {
  it('should accept a valid simple routing workflow', () => {
    const workflow = {
      routing: {
        'nodes/lesson-01.md': {
          onComplete: 'nodes/quiz-01.json',
        },
        'nodes/quiz-01.json': {
          onComplete: 'COMPLETED',
        },
      },
    };
    expect(WorkflowSchema.parse(workflow)).toEqual(workflow);
  });

  it('should accept a conditional routing workflow', () => {
    const workflow = {
      routing: {
        'nodes/quiz-01.json': {
          conditions: [
            { if: 'score >= 80', then: 'COMPLETED' },
            { if: 'score < 80', then: 'nodes/lesson-01.md' },
          ],
        },
      },
    };
    expect(WorkflowSchema.parse(workflow)).toEqual(workflow);
  });

  it('should reject a route with both onComplete and conditions', () => {
    const workflow = {
      routing: {
        'nodes/quiz-01.json': {
          onComplete: 'COMPLETED',
          conditions: [{ if: 'score >= 80', then: 'COMPLETED' }],
        },
      },
    };
    expect(() => WorkflowSchema.parse(workflow)).toThrow();
  });

  it('should reject a route with empty conditions array', () => {
    const workflow = {
      routing: {
        'nodes/quiz-01.json': {
          conditions: [],
        },
      },
    };
    expect(() => WorkflowSchema.parse(workflow)).toThrow();
  });

  it('should reject empty routing object', () => {
    expect(() => WorkflowSchema.parse({ routing: {} })).not.toThrow();
  });

  it('should accept a condition with complex expression', () => {
    const workflow = {
      routing: {
        'nodes/exercise-01.json': {
          conditions: [
            { if: 'score >= 90 && attempts < 3', then: 'COMPLETED' },
            { if: 'score >= 70', then: 'nodes/review.json' },
          ],
        },
      },
    };
    const result = WorkflowSchema.parse(workflow);
    expect(result.routing['nodes/exercise-01.json']).toBeDefined();
  });

  it('should accept a route with COMPLETED sentinel value', () => {
    const workflow = {
      routing: {
        'nodes/lesson-01.md': {
          onComplete: 'COMPLETED',
        },
      },
    };
    expect(WorkflowSchema.parse(workflow)).toEqual(workflow);
  });

  it('should reject empty condition expression', () => {
    expect(() =>
      WorkflowSchema.parse({
        routing: {
          test: {
            conditions: [{ if: '', then: 'COMPLETED' }],
          },
        },
      }),
    ).toThrow();
  });

  it('should reject empty condition target', () => {
    expect(() =>
      WorkflowSchema.parse({
        routing: {
          test: {
            conditions: [{ if: 'score >= 80', then: '' }],
          },
        },
      }),
    ).toThrow();
  });
});
