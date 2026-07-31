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

test('passes valid bundle-scope rewards', () => {
  const dir = writeBundle({
    'bundle.json': { modules: [], rewards: './rewards.json' },
    'rewards.json': {
      triggers: [
        {
          onEvent: 'bundle_complete',
          rewards: [{ action: 'badge.award', spec: {}, condition: { type: 'bundleCompleted' } }],
        },
      ],
    },
  });
  const report = validateRewardsCards(dir, { scope: 'bundle' });
  assert.equal(report.success, true);
  assert.equal(report.findings.filter((f) => f.severity === 'error').length, 0);
});

test('reports a condition on the trigger as QC-REW-01', () => {
  const dir = writeBundle({
    'rewards.json': {
      triggers: [
        {
          onEvent: 'step_completed',
          condition: { type: 'stepCompleted', stepId: 's' },
          rewards: [{ action: 'badge.award', spec: {} }],
        },
      ],
    },
  });
  const report = validateRewardsCards(dir, { scope: 'module' });
  assert.ok(report.findings.some((f) => f.checkId === 'QC-REW-01' && f.severity === 'error'));
});

test('reports a module-local condition at bundle scope as QC-REW-02', () => {
  const dir = writeBundle({
    'rewards.json': {
      triggers: [
        {
          onEvent: 'step_completed',
          rewards: [{ action: 'badge.award', spec: {}, condition: { type: 'stepCompleted', stepId: 's' } }],
        },
      ],
    },
  });
  const report = validateRewardsCards(dir, { scope: 'bundle' });
  assert.ok(report.findings.some((f) => f.checkId === 'QC-REW-02'));
});

test('reports duplicate card ids as QC-REW-03', () => {
  const dir = writeBundle({
    'cards.json': {
      cards: [
        { id: 'x', category: 'badge', summary: 'a', unlock: { type: 'bundleCompleted' }, levels: [{}] },
        { id: 'x', category: 'badge', summary: 'b', unlock: { type: 'bundleCompleted' }, levels: [{}] },
      ],
    },
  });
  const report = validateRewardsCards(dir, { scope: 'bundle' });
  assert.ok(report.findings.some((f) => f.checkId === 'QC-REW-03'));
});

test('reports missing bundle.json referenced rewards file', () => {
  const dir = writeBundle({
    'bundle.json': { modules: [], rewards: './rewards.json' },
  });
  const report = validateRewardsCards(dir, { scope: 'bundle' });
  assert.ok(report.findings.some((f) => f.checkId === 'QC-REW-01' && f.severity === 'error'));
});
