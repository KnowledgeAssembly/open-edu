#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROFILE_KEYS = ['neurotypical', 'autism', 'school', 'college'];

const GRADE_BANDS = ['early_primary', 'upper_primary', 'middle_school', 'secondary', 'senior_secondary'];

export { PROFILE_KEYS, GRADE_BANDS };

const ALIASES = new Map([
  ['autistic', 'autism'],
  ['spectrum', 'autism'],
  ['asd', 'autism'],
  ['neurodivergent', 'autism'],
  ['k12', 'school'],
  ['k-12', 'school'],
  ['school-age', 'school'],
  ['schoolage', 'school'],
  ['university', 'college'],
  ['higher-ed', 'college'],
  ['highered', 'college'],
  ['higher education', 'college'],
  ['adult', 'college'],
]);

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Resolves the skill directory, honoring OPENEDU_SKILL_DIR like the other helpers.
 *
 * @returns {string}
 */
export function getSkillDir() {
  return process.env.OPENEDU_SKILL_DIR || join(__dirname, '..');
}

/**
 * Returns the machine-checkable profile config path (profiles.config.json).
 *
 * @returns {string}
 */
export function getProfilesConfigPath() {
  return join(__dirname, 'profiles.config.json');
}

/**
 * Normalizes user input into a supported profile key.
 *
 * - No input -> defaulted to `neurotypical`.
 * - Valid key (case-insensitive) -> explicit.
 * - Known alias -> mapped to the closest supported profile.
 * - Unknown input -> mapped to `neurotypical`.
 *
 * Neurodivergence is never inferred from age/level; it must be explicitly
 * stated or defaulted (see SKILL.md Critical Rule 9).
 *
 * @param {string|undefined|null} userInput
 * @returns {ResolvedProfile}
 */
export function resolveProfile(userInput) {
  if (userInput === undefined || userInput === null || String(userInput).trim() === '') {
    return { key: 'neurotypical', source: 'defaulted' };
  }
  const normalized = String(userInput).trim().toLowerCase();
  if (PROFILE_KEYS.includes(normalized)) {
    return { key: normalized, source: 'explicit' };
  }
  const mapped = ALIASES.get(normalized);
  if (mapped) {
    return { key: mapped, source: 'mapped' };
  }
  return { key: 'neurotypical', source: 'mapped' };
}

/**
 * Loads the machine-checkable config for a profile from profiles.config.json.
 *
 * @param {string} key - profile key or alias (resolved via resolveProfile)
 * @param {object} [options]
 * @param {string} [options.configPath] - override path to profiles.config.json (tests)
 * @returns {ProfileConfig}
 */
export function loadProfileConfig(key, options = {}) {
  const resolved = resolveProfile(key);
  const configPath = options.configPath || getProfilesConfigPath();

  let raw;
  try {
    raw = readFileSync(configPath, 'utf-8');
  } catch (err) {
    throw new Error(`Failed to read profiles config at ${configPath}: ${err instanceof Error ? err.message : String(err)}`);
  }

  let config;
  try {
    config = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Profiles config at ${configPath} is not valid JSON: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!config || typeof config !== 'object' || !config.profiles || typeof config.profiles !== 'object') {
    throw new Error(`Profiles config at ${configPath} is missing a "profiles" object`);
  }

  const profile = config.profiles[resolved.key];
  if (!profile) {
    throw new Error(`No profile config entry for "${resolved.key}" in ${configPath}`);
  }

  return {
    key: resolved.key,
    source: resolved.source,
    schemaVersion: config.schemaVersion,
    defaultProfile: config.defaultProfile || null,
    ...profile,
  };
}

/**
 * Lists the configured profile keys.
 *
 * @param {string} [configPath] - override path to profiles.config.json (tests)
 * @returns {string[]}
 */
export function listProfiles(configPath) {
  const config = loadRawConfig(configPath);
  return Object.keys(config.profiles || {});
}

/**
 * Returns the machine-checkable config for a school grade band, or null when
 * the profile/band has no such config.
 *
 * @param {string} key - profile key or alias (resolved via resolveProfile)
 * @param {string} gradeBand - one of GRADE_BANDS
 * @param {object} [options]
 * @param {string} [options.configPath] - override path to profiles.config.json (tests)
 * @returns {{ pacingRangeMinutes: number[] } | null}
 */
export function getGradeBandConfig(key, gradeBand, options = {}) {
  const config = loadProfileConfig(key, options);
  const bands = config.gradeBands;
  if (!bands || typeof bands !== 'object') return null;
  return bands[gradeBand] || null;
}

function loadRawConfig(configPath) {
  const path = configPath || getProfilesConfigPath();
  let raw;
  try {
    raw = readFileSync(path, 'utf-8');
  } catch (err) {
    throw new Error(`Failed to read profiles config at ${path}: ${err instanceof Error ? err.message : String(err)}`);
  }
  let config;
  try {
    config = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Profiles config at ${path} is not valid JSON: ${err instanceof Error ? err.message : String(err)}`);
  }
  return config;
}

// CLI mode
if (import.meta.url === `file://${process.argv[1]}`) {
  const mode = process.argv[2] || 'list';
  if (mode === 'list') {
    console.log(JSON.stringify(listProfiles(process.argv[3]), null, 2));
  } else {
    console.log(JSON.stringify(resolveProfile(process.argv[3]), null, 2));
  }
}

/**
 * @typedef {object} ResolvedProfile
 * @property {string} key
 * @property {'explicit'|'defaulted'|'mapped'} source
 */

/**
 * @typedef {object} ProfileConfig
 * @property {string} key
 * @property {'explicit'|'defaulted'|'mapped'} source
 * @property {number} schemaVersion
 * @property {string|null} defaultProfile
 * @property {string} name
 * @property {string} audience
 * @property {string[]} accessibility
 * @property {string|null} difficultyBias
 * @property {number[]} pacingRangeMinutes
 * @property {Record<string, { pacingRangeMinutes: number[] }>} [gradeBands]
 */