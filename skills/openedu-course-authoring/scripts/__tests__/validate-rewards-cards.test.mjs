import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateRewardsCards } from '../validate-rewards-cards.mjs';

function writeBundle(files) {
  const dir = mkdtempSync(join(tmpdir(), 'rew-'));
  for (const [rel, content] of Object.entries(files)) {
    const p = join(dir, rel);
    mkdirSync(join(p, '..'), { recursive: true });
    writeFileSync(p, typeof content === 'string' ? content : JSON.stringify(content));
  }
  return dir;
}

const VALID_BUNDLE_REWARD = {
  action: 'badge.award',
  badge: 'bundle-finisher',
  condition: { type: 'bundleCompleted' },
};

test('passes valid bundle-scope rewards', () => {
  const dir = writeBundle({
    'bundle.json': { modules: [], rewards: './rewards.json' },
    'rewards.json': {
      triggers: [{ onEvent: 'bundle_complete', rewards: [VALID_BUNDLE_REWARD] }],
    },
  });
  const report = validateRewardsCards(dir, { scope: 'bundle' });
  assert.equal(report.success, true);
  assert.equal(report.findings.filter((f) => f.severity === 'error').length, 0);
});

test('reports a condition on the trigger as QC-REW-07', () => {
  const dir = writeBundle({
    'rewards.json': {
      triggers: [
        {
          onEvent: 'step_completed',
          condition: { type: 'chain', completedNodeIds: ['s'] },
          rewards: [{ action: 'badge.award', badge: 'b' }],
        },
      ],
    },
  });
  const report = validateRewardsCards(dir, { scope: 'module' });
  assert.ok(report.findings.some((f) => f.checkId === 'QC-REW-07' && f.severity === 'error'));
});

test('reports a module-signal condition at bundle scope as QC-REW-02', () => {
  const dir = writeBundle({
    'rewards.json': {
      triggers: [
        {
          onEvent: 'bundle_complete',
          rewards: [
            {
              action: 'badge.award',
              badge: 'b',
              condition: { type: 'chain', completedNodeIds: ['nodes/lesson.md'] },
            },
          ],
        },
      ],
    },
  });
  const report = validateRewardsCards(dir, { scope: 'bundle' });
  assert.ok(report.findings.some((f) => f.checkId === 'QC-REW-02'));
});

test('reports a bundle-only condition at module scope as QC-REW-02', () => {
  const dir = writeBundle({
    'rewards.json': {
      triggers: [
        {
          onEvent: 'module_complete',
          rewards: [
            {
              action: 'badge.award',
              badge: 'b',
              condition: { type: 'moduleCompleted', moduleId: 'other-module' },
            },
          ],
        },
      ],
    },
  });
  const report = validateRewardsCards(dir, { scope: 'module' });
  assert.ok(report.findings.some((f) => f.checkId === 'QC-REW-02' && f.severity === 'error'));
});

test('reports an unknown condition type as QC-REW-06', () => {
  const dir = writeBundle({
    'rewards.json': {
      triggers: [
        {
          onEvent: 'step_completed',
          rewards: [
            {
              action: 'badge.award',
              badge: 'b',
              condition: { type: 'stepCompleted', stepId: 's' },
            },
          ],
        },
      ],
    },
  });
  const report = validateRewardsCards(dir, { scope: 'module' });
  assert.ok(report.findings.some((f) => f.checkId === 'QC-REW-06' && f.severity === 'error'));
});

test('reports a badge reward missing the badge field as QC-REW-04', () => {
  const dir = writeBundle({
    'rewards.json': {
      triggers: [
        {
          onEvent: 'step_completed',
          rewards: [
            { action: 'badge.award', condition: { type: 'chain', completedNodeIds: ['s'] } },
          ],
        },
      ],
    },
  });
  const report = validateRewardsCards(dir, { scope: 'module' });
  assert.ok(report.findings.some((f) => f.checkId === 'QC-REW-04' && f.severity === 'error'));
});

test('reports duplicate card ids as QC-REW-03', () => {
  const dir = writeBundle({
    'cards.json': {
      cards: [
        {
          id: 'x',
          title: 'a',
          category: 'badge',
          type: 'achievement',
          summary: 'a',
          unlock: { type: 'bundleCompleted' },
        },
        {
          id: 'x',
          title: 'b',
          category: 'badge',
          type: 'achievement',
          summary: 'b',
          unlock: { type: 'bundleCompleted' },
        },
      ],
    },
  });
  const report = validateRewardsCards(dir, { scope: 'bundle' });
  assert.ok(report.findings.some((f) => f.checkId === 'QC-REW-03' && f.severity === 'error'));
});

test('reports a card missing required fields as QC-REW-05', () => {
  const dir = writeBundle({
    'cards.json': {
      cards: [{ id: 'x', unlock: { type: 'bundleCompleted' } }],
    },
  });
  const report = validateRewardsCards(dir, { scope: 'bundle' });
  const findings = report.findings.filter((f) => f.checkId === 'QC-REW-05');
  assert.ok(findings.some((f) => f.message.includes('title')));
  assert.ok(findings.some((f) => f.message.includes('type')));
});

test('reports card level above maximumLevel as QC-REW-09', () => {
  const dir = writeBundle({
    'cards.json': {
      cards: [
        {
          id: 'x',
          title: 'a',
          category: 'badge',
          type: 'achievement',
          summary: 'a',
          level: 3,
          maximumLevel: 2,
          unlock: { type: 'bundleCompleted' },
        },
      ],
    },
  });
  const report = validateRewardsCards(dir, { scope: 'bundle' });
  assert.ok(report.findings.some((f) => f.checkId === 'QC-REW-09' && f.severity === 'error'));
});

test('reports a module-scope card unlock with a bundle-only condition as QC-REW-02', () => {
  const dir = writeBundle({
    'cards.json': {
      cards: [
        {
          id: 'x',
          title: 'a',
          category: 'badge',
          type: 'achievement',
          summary: 'a',
          unlock: { type: 'bundleCompleted' },
        },
      ],
    },
  });
  const report = validateRewardsCards(dir, { scope: 'module' });
  assert.ok(report.findings.some((f) => f.checkId === 'QC-REW-02' && f.severity === 'error'));
});

test('reports missing bundle.json referenced rewards file as QC-REW-08', () => {
  const dir = writeBundle({
    'bundle.json': { modules: [], rewards: './rewards.json' },
  });
  const report = validateRewardsCards(dir, { scope: 'bundle' });
  assert.ok(report.findings.some((f) => f.checkId === 'QC-REW-08' && f.severity === 'error'));
});
