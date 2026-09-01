import { renderWidgetCatalogSection } from './buildPrompt.js';
import { getArtifactContractPromptView } from '@open-edu/domain-guidance';

export const COURSE_SPEC_CONTRACT = getArtifactContractPromptView();

export function buildCourseSpecPrompt(notes: string): string {
  return [
    "You are an expert curriculum designer. Turn the teacher's notes below into a short, high-quality OpenEdu course.",
    '',
    'TEACHER NOTES:',
    notes.trim(),
    '',
    COURSE_SPEC_CONTRACT,
    '',
    renderWidgetCatalogSection(),
  ].join('\n');
}
