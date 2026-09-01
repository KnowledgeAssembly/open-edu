import type { z } from 'zod';

export interface CompanionSkill {
  id: string;
  description: string;
  instructions?: string;
  tools?: string[];
  permissions?: string[];
  inputSchema?: z.ZodType;
  outputSchema?: z.ZodType;
}

export interface SkillRegistry {
  register(skill: CompanionSkill): void;
  list(): CompanionSkill[];
}

export interface SkillResolver {
  resolve(context: unknown): CompanionSkill[];
}
