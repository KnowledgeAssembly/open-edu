import { describe, it, expect } from 'vitest';
import { parseExerciseNode, serializeExerciseNode, createEmptyExercise } from './exerciseNode';
import { ExerciseNodeSchema } from '@open-edu/schemas';

describe('exerciseNode', () => {
  it('parses a valid exercise node', () => {
    const node = parseExerciseNode(
      JSON.stringify({
        type: 'exercise',
        title: 'Practice',
        widget: 'core.multiple-choice',
        config: {},
      }),
    );
    expect(node).not.toBeNull();
    expect(node?.widget).toBe('core.multiple-choice');
    expect(node?.config).toEqual({});
  });

  it('returns null for non-exercise content', () => {
    expect(parseExerciseNode('{"type":"quiz","question":"Q"}')).toBeNull();
    expect(parseExerciseNode('not json')).toBeNull();
  });

  it('round-trips serialize -> parse', () => {
    const node = createEmptyExercise('core.matching', 'Match it');
    const parsed = parseExerciseNode(serializeExerciseNode(node));
    expect(parsed).toEqual(node);
  });

  it('serialized node satisfies ContentNodeSchema', () => {
    const node = createEmptyExercise('core.multiple-choice');
    const result = ExerciseNodeSchema.safeParse(JSON.parse(serializeExerciseNode(node)));
    expect(result.success).toBe(true);
  });
});
