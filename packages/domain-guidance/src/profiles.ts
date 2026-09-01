import profilesRaw from './data/profiles.json';
import { ProfilesFileSchema, type LearnerProfileDefinition, type ProfilesFile } from './types.js';

/**
 * Browser-safe profile accessors. Unlike `./index.js` (Node-only, reads
 * committed JSON via `node:fs`), this module imports the committed
 * `src/data/profiles.json` directly so bundlers can resolve it in client
 * code without externalizing `node:fs`.
 */
const profilesFile = ProfilesFileSchema.parse(profilesRaw);

export function getProfile(id: string): LearnerProfileDefinition | undefined {
  return profilesFile.profiles[id];
}

export function getProfilesData(): ProfilesFile {
  return profilesFile;
}

export function listProfiles(): LearnerProfileDefinition[] {
  return Object.values(profilesFile.profiles);
}
