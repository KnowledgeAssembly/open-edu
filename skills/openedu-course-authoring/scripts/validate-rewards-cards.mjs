#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const MODULE_LOCAL_CONDITIONS = [
  'stepCompleted',
  'exerciseCompleted',
  'score',
  'chain',
  'activityCompleted',
  'moduleUnlocked',
  'moduleFailed',
  'attempts',
  'answeredCorrectly',
];

const BUNDLE_ONLY_CONDITIONS = ['bundleCompleted', 'moduleCompleted', 'skill', 'bundleCondition'];

const VALID_ACTIONS = ['badge.award', 'webhook', 'script'];

/**
 * Validates rewards.json/cards.json at a target directory.
 *
 * @param {string} dir - Target directory (package root or bundle root).
 * @param {{ scope?: 'module' | 'bundle' }} [options]
 * @returns {{ success: boolean, findings: Array<{ checkId: string, severity: 'error'|'warning'|'info', message: string }> }}
 */
export function validateRewardsCards(dir, { scope = 'module' } = {}) {
  const findings = [];

  const rewardsPath = join(dir, 'rewards.json');
  if (existsSync(rewardsPath)) {
    let rewards;
    try {
      rewards = JSON.parse(readFileSync(rewardsPath, 'utf-8'));
    } catch (err) {
      findings.push({
        checkId: 'QC-REW-01',
        severity: 'error',
        message: `rewards.json is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
      });
      rewards = null;
    }
    if (rewards) validateRewards(rewards, { scope, path: rewardsPath, findings });
  }

  const cardsPath = join(dir, 'cards.json');
  if (existsSync(cardsPath)) {
    let cards;
    try {
      cards = JSON.parse(readFileSync(cardsPath, 'utf-8'));
    } catch (err) {
      findings.push({
        checkId: 'QC-REW-03',
        severity: 'error',
        message: `cards.json is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
      });
      cards = null;
    }
    if (cards) validateCards(cards, { scope, path: cardsPath, findings });
  }

  if (scope === 'bundle') {
    const bundleJsonPath = join(dir, 'bundle.json');
    if (existsSync(bundleJsonPath)) {
      let bundleManifest;
      try {
        bundleManifest = JSON.parse(readFileSync(bundleJsonPath, 'utf-8'));
      } catch {
        bundleManifest = null;
      }
      if (bundleManifest && typeof bundleManifest === 'object') {
        for (const key of ['rewards', 'cards']) {
          const rel = bundleManifest[key];
          if (typeof rel === 'string') {
            const refPath = join(dir, rel.replace(/^\.\//, ''));
            if (!existsSync(refPath)) {
              findings.push({
                checkId: 'QC-REW-01',
                severity: 'error',
                message: `bundle.json references ${key} (${rel}) but the file does not exist`,
              });
            }
          }
        }
      }
    }
  }

  return { success: findings.every((f) => f.severity !== 'error'), findings };
}

function validateRewards(rewards, { scope, path, findings }) {
  const triggers = rewards.triggers;
  if (!Array.isArray(triggers) || triggers.length === 0) {
    findings.push({
      checkId: 'QC-REW-01',
      severity: 'error',
      message: `${path}: triggers must be a non-empty array`,
    });
    return;
  }

  for (const [triggerIndex, trigger] of triggers.entries()) {
    if (!trigger || typeof trigger !== 'object') continue;

    if (typeof trigger.onEvent !== 'string' || trigger.onEvent.length === 0) {
      findings.push({
        checkId: 'QC-REW-01',
        severity: 'error',
        message: `${path}: trigger ${triggerIndex} missing string onEvent`,
      });
    }

    if (trigger.condition) {
      findings.push({
        checkId: 'QC-REW-01',
        severity: 'error',
        message: `${path}: trigger ${triggerIndex} has a condition — conditions belong on the reward, not the trigger`,
      });
    }

    const rewardActions = trigger.rewards;
    if (!Array.isArray(rewardActions) || rewardActions.length === 0) {
      findings.push({
        checkId: 'QC-REW-01',
        severity: 'error',
        message: `${path}: trigger ${triggerIndex} missing non-empty rewards array`,
      });
      continue;
    }

    for (const [rewardIndex, reward] of rewardActions.entries()) {
      if (!reward || typeof reward !== 'object') continue;

      if (!VALID_ACTIONS.includes(reward.action)) {
        findings.push({
          checkId: 'QC-REW-01',
          severity: 'error',
          message: `${path}: reward ${triggerIndex}.${rewardIndex} has invalid action "${reward.action}" (expected one of ${VALID_ACTIONS.join(', ')})`,
        });
      }

      if (!reward.spec || typeof reward.spec !== 'object') {
        findings.push({
          checkId: 'QC-REW-04',
          severity: 'warning',
          message: `${path}: reward ${triggerIndex}.${rewardIndex} missing spec object`,
        });
      }

      if (reward.condition) {
        validateConditionScope(reward.condition, { scope, path, findings, label: `reward ${triggerIndex}.${rewardIndex}` });
      }
    }
  }
}

function validateConditionScope(condition, { scope, path, findings, label }) {
  if (!condition || typeof condition !== 'object') return;
  const type = condition.type;
  if (typeof type !== 'string' || type.length === 0) {
    findings.push({
      checkId: 'QC-REW-01',
      severity: 'error',
      message: `${path}: ${label} condition missing type`,
    });
    return;
  }

  if (scope === 'bundle' && MODULE_LOCAL_CONDITIONS.includes(type)) {
    findings.push({
      checkId: 'QC-REW-02',
      severity: 'error',
      message: `${path}: ${label} uses module-local condition "${type}" in a bundle-scoped file`,
    });
  }

  if (scope === 'module' && BUNDLE_ONLY_CONDITIONS.includes(type)) {
    findings.push({
      checkId: 'QC-REW-02',
      severity: 'error',
      message: `${path}: ${label} uses bundle-level condition "${type}" in a module-scoped file`,
    });
  }

  if (type === 'and' || type === 'or') {
    for (const [i, child] of (condition.conditions ?? []).entries()) {
      validateConditionScope(child, { scope, path, findings, label: `${label}.${type}[${i}]` });
    }
  }
}

function validateCards(cards, { scope, path, findings }) {
  const list = cards.cards;
  if (!Array.isArray(list) || list.length === 0) {
    findings.push({
      checkId: 'QC-REW-03',
      severity: 'error',
      message: `${path}: cards must be a non-empty array`,
    });
    return;
  }

  const seen = new Set();
  for (const [index, card] of list.entries()) {
    if (!card || typeof card !== 'object') continue;

    for (const field of ['id', 'category', 'summary']) {
      if (typeof card[field] !== 'string' || card[field].length === 0) {
        findings.push({
          checkId: 'QC-REW-04',
          severity: 'warning',
          message: `${path}: card ${index} missing string ${field}`,
        });
      }
    }

    if (!Array.isArray(card.levels) || card.levels.length === 0) {
      findings.push({
        checkId: 'QC-REW-04',
        severity: 'warning',
        message: `${path}: card ${index} missing non-empty levels array`,
      });
    }

    if (!card.unlock || typeof card.unlock.type !== 'string') {
      findings.push({
        checkId: 'QC-REW-05',
        severity: 'error',
        message: `${path}: card ${index} missing unlock.type`,
      });
    }

    if (typeof card.id === 'string') {
      if (seen.has(card.id)) {
        findings.push({
          checkId: 'QC-REW-03',
          severity: 'error',
          message: `${path}: duplicate card id "${card.id}"`,
        });
      }
      seen.add(card.id);
    }

    if (scope === 'bundle' && card.unlock) {
      validateConditionScope(card.unlock, { scope, path, findings, label: `card ${index} unlock` });
      if (card.nextLevel) {
        validateConditionScope(card.nextLevel, { scope, path, findings, label: `card ${index} nextLevel` });
      }
    }
  }
}

// CLI mode
if (import.meta.url === `file://${process.argv[1]}`) {
  const targetDir = process.argv[2];
  const scopeArg = process.argv.find((a) => a.startsWith('--scope='));
  const scope = scopeArg ? scopeArg.split('=')[1] : 'module';
  if (!targetDir) {
    console.error('Usage: node validate-rewards-cards.mjs <target-dir> [--scope=module|bundle]');
    process.exit(1);
  }
  const report = validateRewardsCards(targetDir, { scope });
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.success ? 0 : 1);
}

/**
 * @typedef {object} RewardsCardsValidationResult
 * @property {boolean} success
 * @property {Array<{ checkId: string, severity: 'error'|'warning'|'info', message: string }>} findings
 */
