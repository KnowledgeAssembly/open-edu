import { describe, expect, it } from 'vitest';
import { WorkflowSchema, type Workflow } from '@open-edu/schemas';
import {
  applyScoreBranch,
  clearScoreBranch,
  extractScoreBranches,
  outlineSuccessor,
  type ScoreBranchRule,
} from './branchModel';

const ADAPTIVE_STUDY: Workflow = {
  routing: {
    'nodes/intro.md': { onComplete: 'nodes/checkpoint.json' },
    'nodes/checkpoint.json': {
      conditions: [
        { if: 'score >= 80', then: 'nodes/reflection.json' },
        { if: 'score < 80', then: 'nodes/remediation.md' },
      ],
    },
    'nodes/remediation.md': { onComplete: 'nodes/checkpoint.json' },
    'nodes/reflection.json': { onComplete: 'COMPLETED' },
  },
};

function linearWorkflow(paths: string[]): Workflow {
  const routing: Workflow['routing'] = {};
  paths.forEach((path, index) => {
    routing[path] = { onComplete: paths[index + 1] ?? 'COMPLETED' };
  });
  return { routing };
}

describe('branchModel', () => {
  describe('extractScoreBranches', () => {
    it('recognizes the canonical adaptive-study paired pattern', () => {
      const branches = extractScoreBranches(ADAPTIVE_STUDY);
      expect(branches).toHaveLength(1);
      expect(branches[0]).toEqual({
        afterPath: 'nodes/checkpoint.json',
        minScore: 80,
        passPath: 'nodes/reflection.json',
        failPath: 'nodes/remediation.md',
      });
    });

    it('recognizes the mirrored `> N` / `<= N` pattern', () => {
      const workflow: Workflow = {
        routing: {
          'nodes/quiz.json': {
            conditions: [
              { if: 'score > 60', then: 'nodes/advanced.md' },
              { if: 'score <= 60', then: 'nodes/remediation.md' },
            ],
          },
        },
      };
      const branches = extractScoreBranches(workflow);
      expect(branches[0]).toEqual({
        afterPath: 'nodes/quiz.json',
        minScore: 60,
        passPath: 'nodes/advanced.md',
        failPath: 'nodes/remediation.md',
      });
    });

    it('returns [] for a fully linear workflow', () => {
      expect(extractScoreBranches(linearWorkflow(['nodes/a.md', 'nodes/b.json']))).toEqual([]);
    });

    it('ignores complex score expressions', () => {
      const workflow: Workflow = {
        routing: {
          'nodes/q.json': {
            conditions: [
              { if: 'score >= 90 && attempts < 3', then: 'nodes/next.md' },
              { if: 'score < 90', then: 'nodes/again.md' },
            ],
          },
        },
      };
      expect(extractScoreBranches(workflow)).toEqual([]);
    });

    it('ignores non-score conditions', () => {
      const workflow: Workflow = {
        routing: {
          'nodes/q.json': {
            conditions: [
              { if: 'attempts >= 2', then: 'nodes/next.md' },
              { if: 'attempts < 2', then: 'nodes/again.md' },
            ],
          },
        },
      };
      expect(extractScoreBranches(workflow)).toEqual([]);
    });

    it('returns [] when a route has a single condition', () => {
      const workflow: Workflow = {
        routing: {
          'nodes/q.json': {
            conditions: [{ if: 'score >= 80', then: 'nodes/next.md' }],
          },
        },
      };
      expect(extractScoreBranches(workflow)).toEqual([]);
    });

    it('returns [] when paired conditions use mismatched thresholds', () => {
      const workflow: Workflow = {
        routing: {
          'nodes/q.json': {
            conditions: [
              { if: 'score >= 80', then: 'nodes/pass.md' },
              { if: 'score < 70', then: 'nodes/fail.md' },
            ],
          },
        },
      };
      expect(extractScoreBranches(workflow)).toEqual([]);
    });
  });

  describe('applyScoreBranch', () => {
    it('adds a conditions route for afterPath and leaves others untouched', () => {
      const linear = linearWorkflow(['nodes/a.md', 'nodes/b.json', 'nodes/c.md']);
      const rule: ScoreBranchRule = {
        afterPath: 'nodes/a.md',
        minScore: 80,
        passPath: 'nodes/c.md',
        failPath: 'COMPLETED',
      };
      const result = applyScoreBranch(linear, rule);
      expect(result.routing['nodes/a.md']).toEqual({
        conditions: [
          { if: 'score >= 80', then: 'nodes/c.md' },
          { if: 'score < 80', then: 'COMPLETED' },
        ],
      });
      expect(result.routing['nodes/b.json']).toEqual({ onComplete: 'nodes/c.md' });
      expect(result.routing['nodes/c.md']).toEqual({ onComplete: 'COMPLETED' });
    });

    it('rounds non-integer min scores', () => {
      const linear = linearWorkflow(['nodes/a.md', 'nodes/b.json']);
      const result = applyScoreBranch(linear, {
        afterPath: 'nodes/a.md',
        minScore: 84.6,
        passPath: 'nodes/b.json',
        failPath: 'COMPLETED',
      });
      expect(result.routing['nodes/a.md']).toEqual({
        conditions: [
          { if: 'score >= 85', then: 'nodes/b.json' },
          { if: 'score < 85', then: 'COMPLETED' },
        ],
      });
    });

    it('round-trips linear -> apply -> clear back to the original linear workflow', () => {
      const linear = linearWorkflow(['nodes/a.md', 'nodes/b.json', 'nodes/c.md']);
      const branched = applyScoreBranch(linear, {
        afterPath: 'nodes/b.json',
        minScore: 75,
        passPath: 'COMPLETED',
        failPath: 'nodes/a.md',
      });
      const restored = clearScoreBranch(branched, 'nodes/b.json');
      expect(restored).toEqual(linear);
    });

    it('preserves unrelated routes through apply and clear', () => {
      const workflow: Workflow = {
        routing: {
          'nodes/a.md': { onComplete: 'nodes/b.json' },
          'nodes/b.json': {
            conditions: [
              { if: 'score >= 80', then: 'nodes/c.md' },
              { if: 'score < 80', then: 'nodes/a.md' },
            ],
          },
          'nodes/c.md': { onComplete: 'COMPLETED' },
          'nodes/special.json': { onComplete: 'nodes/c.md' },
        },
      };
      const afterApply = applyScoreBranch(workflow, {
        afterPath: 'nodes/a.md',
        minScore: 90,
        passPath: 'nodes/c.md',
        failPath: 'COMPLETED',
      });
      const afterClear = clearScoreBranch(afterApply, 'nodes/b.json');
      expect(afterClear.routing['nodes/special.json']).toEqual({ onComplete: 'nodes/c.md' });
      expect(afterClear.routing['nodes/c.md']).toEqual({ onComplete: 'COMPLETED' });
      expect(afterClear.routing['nodes/a.md']).toEqual({
        conditions: [
          { if: 'score >= 90', then: 'nodes/c.md' },
          { if: 'score < 90', then: 'COMPLETED' },
        ],
      });
    });
  });

  describe('clearScoreBranch', () => {
    it('restores the next routing key as the linear successor', () => {
      const workflow: Workflow = {
        routing: {
          'nodes/a.md': {
            conditions: [
              { if: 'score >= 80', then: 'nodes/c.md' },
              { if: 'score < 80', then: 'COMPLETED' },
            ],
          },
          'nodes/b.json': { onComplete: 'nodes/c.md' },
        },
      };
      const cleared = clearScoreBranch(workflow, 'nodes/a.md');
      expect(cleared.routing['nodes/a.md']).toEqual({ onComplete: 'nodes/b.json' });
    });

    it('uses COMPLETED as the successor when afterPath is last', () => {
      const workflow: Workflow = {
        routing: {
          'nodes/a.md': { onComplete: 'nodes/b.json' },
          'nodes/b.json': {
            conditions: [
              { if: 'score >= 80', then: 'COMPLETED' },
              { if: 'score < 80', then: 'COMPLETED' },
            ],
          },
        },
      };
      const cleared = clearScoreBranch(workflow, 'nodes/b.json');
      expect(cleared.routing['nodes/b.json']).toEqual({ onComplete: 'COMPLETED' });
    });

    it('honors an explicit linearSuccessor', () => {
      const workflow: Workflow = {
        routing: { 'nodes/a.md': { onComplete: 'nodes/b.json' } },
      };
      const cleared = clearScoreBranch(workflow, 'nodes/a.md', 'COMPLETED');
      expect(cleared.routing['nodes/a.md']).toEqual({ onComplete: 'COMPLETED' });
    });
  });

  describe('outlineSuccessor', () => {
    it('returns the next path in outline order', () => {
      expect(outlineSuccessor(['nodes/a.md', 'nodes/b.json', 'nodes/c.md'], 'nodes/a.md')).toBe(
        'nodes/b.json',
      );
    });

    it('returns COMPLETED for the last path', () => {
      expect(outlineSuccessor(['nodes/a.md', 'nodes/b.json'], 'nodes/b.json')).toBe('COMPLETED');
    });
  });

  describe('schema validity', () => {
    it('emits schema-valid workflows from apply and clear', () => {
      const linear = linearWorkflow(['nodes/a.md', 'nodes/b.json', 'nodes/c.md']);
      const branched = applyScoreBranch(linear, {
        afterPath: 'nodes/a.md',
        minScore: 80,
        passPath: 'nodes/c.md',
        failPath: 'COMPLETED',
      });
      expect(WorkflowSchema.safeParse(branched).success).toBe(true);
      const restored = clearScoreBranch(branched, 'nodes/a.md');
      expect(WorkflowSchema.safeParse(restored).success).toBe(true);
      expect(restored).toEqual(linear);
    });
  });
});
