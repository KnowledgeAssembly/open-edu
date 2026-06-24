import { z } from 'zod';

export const SkillDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  dependencies: z.array(z.string()).optional(),
  maxScore: z.number().default(100),
});

export const MasteryLevelSchema = z.enum([
  'not_attempted',
  'in_progress',
  'achieved',
  'mastered',
]);

export const SkillAssessmentSchema = z.object({
  nodeId: z.string(),
  skillId: z.string(),
  weight: z.number().min(0).max(1),
});

export const SkillGraphSchema = z.object({
  skills: z.array(SkillDefinitionSchema),
  assessments: z.array(SkillAssessmentSchema),
});

export type SkillDefinition = z.infer<typeof SkillDefinitionSchema>;
export type MasteryLevel = z.infer<typeof MasteryLevelSchema>;
export type SkillAssessment = z.infer<typeof SkillAssessmentSchema>;
export type SkillGraph = z.infer<typeof SkillGraphSchema>;

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function hasCycle(skills: SkillDefinition[]): boolean {
  const adj = new Map<string, string[]>();
  for (const s of skills) {
    adj.set(s.id, s.dependencies ?? []);
  }

  const visited = new Set<string>();
  const inStack = new Set<string>();

  function dfs(id: string): boolean {
    if (inStack.has(id)) return true;
    if (visited.has(id)) return false;
    visited.add(id);
    inStack.add(id);
    for (const dep of adj.get(id) ?? []) {
      if (dfs(dep)) return true;
    }
    inStack.delete(id);
    return false;
  }

  for (const id of adj.keys()) {
    if (dfs(id)) return true;
  }
  return false;
}

export function validateSkillGraph(graph: SkillGraph): ValidationResult {
  const errors: string[] = [];
  const skillIds = new Set(graph.skills.map((s) => s.id));

  for (const skill of graph.skills) {
    if (skill.dependencies) {
      for (const depId of skill.dependencies) {
        if (!skillIds.has(depId)) {
          errors.push(`Skill "${skill.id}" depends on unknown skill "${depId}"`);
        }
      }
    }
  }

  if (hasCycle(graph.skills)) {
    errors.push('Circular dependency detected in skill graph');
  }

  for (const assessment of graph.assessments) {
    if (!skillIds.has(assessment.skillId)) {
      errors.push(`Assessment references unknown skillId "${assessment.skillId}"`);
    }
  }

  return { valid: errors.length === 0, errors };
}
