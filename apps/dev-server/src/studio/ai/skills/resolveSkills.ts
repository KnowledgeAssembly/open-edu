import type { CompanionSkill, SkillResolver } from '@open-edu/companion';
import type { StudioContextSnapshot } from '@open-edu/companion/context';

/**
 * Resolve skills per-request (spec §13) so the whole skill library is never
 * injected into every model call. The resolver is deliberately trivial now: one
 * rule — a learner profile present in the context → `learner-adaptation`. Its
 * `resolve(context)` contract keeps future skills additive: add a rule + a skill
 * definition without loop changes.
 */
export function createSkillResolver(registry: { list(): CompanionSkill[] }): SkillResolver {
  return {
    resolve(context: unknown): CompanionSkill[] {
      const ctx = context as StudioContextSnapshot;
      if (ctx?.learner) {
        return registry.list().filter((skill) => skill.id === 'learner-adaptation');
      }
      return [];
    },
  };
}
