import { describe, it, expect } from 'vitest';
import type { Workflow } from '@open-edu/schemas';
import { getOrderedNodes } from './topology';

describe('getOrderedNodes', () => {
  it('linear workflow returns nodes in order', () => {
    const workflow: Workflow = {
      routing: {
        a: { onComplete: 'b' },
        b: { onComplete: 'c' },
      },
    };
    expect(getOrderedNodes(workflow, 'a')).toEqual(['a', 'b', 'c']);
  });

  it('conditional branches are traversed breadth-first', () => {
    const workflow: Workflow = {
      routing: {
        a: {
          conditions: [
            { if: 'x', then: 'b' },
            { if: 'y', then: 'c' },
          ],
        },
      },
    };
    expect(getOrderedNodes(workflow, 'a')).toEqual(['a', 'b', 'c']);
  });

  it('cycle guard prevents infinite loops', () => {
    const workflow: Workflow = {
      routing: {
        a: { onComplete: 'b' },
        b: { onComplete: 'a' },
      },
    };
    expect(getOrderedNodes(workflow, 'a')).toEqual(['a', 'b']);
  });

  it('entry node not in routing returns only the entry', () => {
    const workflow: Workflow = {
      routing: {},
    };
    expect(getOrderedNodes(workflow, 'start')).toEqual(['start']);
  });

  it('empty entry string returns empty array', () => {
    const workflow: Workflow = {
      routing: {},
    };
    expect(getOrderedNodes(workflow, '')).toEqual([]);
  });

  it('missing entry in routing returns only the entry', () => {
    const workflow: Workflow = {
      routing: {
        b: { onComplete: 'c' },
      },
    };
    expect(getOrderedNodes(workflow, 'a')).toEqual(['a']);
  });

  it('diamond pattern merges at the sink node', () => {
    const workflow: Workflow = {
      routing: {
        a: {
          conditions: [
            { if: 'x', then: 'b' },
            { if: 'y', then: 'c' },
          ],
        },
        b: { onComplete: 'd' },
        c: { onComplete: 'd' },
      },
    };
    expect(getOrderedNodes(workflow, 'a')).toEqual(['a', 'b', 'c', 'd']);
  });

  it('single node returns that node', () => {
    const workflow: Workflow = {
      routing: {},
    };
    expect(getOrderedNodes(workflow, 'only')).toEqual(['only']);
  });

  it('excludes COMPLETED sentinel from linear workflow', () => {
    const workflow: Workflow = {
      routing: {
        a: { onComplete: 'COMPLETED' },
      },
    };
    expect(getOrderedNodes(workflow, 'a')).toEqual(['a']);
  });

  it('excludes COMPLETED sentinel from conditional workflow', () => {
    const workflow: Workflow = {
      routing: {
        a: {
          conditions: [
            { if: 'x', then: 'COMPLETED' },
            { if: 'y', then: 'COMPLETED' },
          ],
        },
      },
    };
    expect(getOrderedNodes(workflow, 'a')).toEqual(['a']);
  });

  it('excludes COMPLETED and continues with remaining nodes', () => {
    const workflow: Workflow = {
      routing: {
        a: { onComplete: 'b' },
        b: { onComplete: 'COMPLETED' },
        c: { onComplete: 'd' },
      },
    };
    expect(getOrderedNodes(workflow, 'a')).toEqual(['a', 'b']);
  });

  it('excludes COMPLETED in mixed conditional targets', () => {
    const workflow: Workflow = {
      routing: {
        a: {
          conditions: [
            { if: 'score >= 80', then: 'COMPLETED' },
            { if: 'score < 80', then: 'b' },
          ],
        },
        b: { onComplete: 'COMPLETED' },
      },
    };
    expect(getOrderedNodes(workflow, 'a')).toEqual(['a', 'b']);
  });
});
