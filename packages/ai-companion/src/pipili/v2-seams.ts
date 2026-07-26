export interface ConceptGraphProvider {
  getPrerequisites(conceptId: string): Promise<string[]>;
  getRelatedConcepts(conceptId: string): Promise<string[]>;
  getConceptPath(from: string, to: string): Promise<string[]>;
}

export interface MasteryProvider {
  getMasteryScore(learnerId: string, conceptId: string): Promise<number>;
  getMisconceptions(learnerId: string): Promise<string[]>;
  getInterventionHistory(learnerId: string): Promise<unknown[]>;
}

export interface LearningPlanService {
  generateStudyPlan(
    learnerId: string,
    goals: string[],
  ): Promise<{ steps: unknown[]; timeline: string }>;
  updateProgress(learnerId: string, planId: string, progress: unknown): Promise<void>;
}

export interface InterventionPolicy {
  shouldIntervene(learnerId: string, telemetryEvent: unknown): Promise<boolean>;
  getSuggestion(learnerId: string, context: unknown): Promise<string>;
}

export interface TeacherReadModel {
  getClassProgress(classId: string): Promise<unknown>;
  getLearnerInsights(learnerId: string): Promise<unknown>;
}

export interface ParentReadModel {
  getLearnerSummary(learnerId: string, consentVerified: boolean): Promise<unknown>;
}
