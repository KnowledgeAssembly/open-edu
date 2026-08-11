import { renderWidgetCatalogSection } from './buildPrompt.js';

export const COURSE_SPEC_CONTRACT = `
Output ONLY a single JSON object that conforms EXACTLY to this JSON schema (no markdown, no comments, no extra text):

{
  "format": "openedu-course-spec",
  "version": 1,
  "generatedAt": "<ISO 8601 timestamp>",
  "metadata": {
    "title": "<short course title>",
    "description": "<1-2 sentence summary>",
    "author": "OpenEdu Studio",
    "version": "1.0.0",
    "difficulty": "beginner | intermediate | advanced",
    "estimatedHours": <number, e.g. 1>,
    "generated": true
  },
  "lessons": [
    {
      "id": "<kebab-case lesson id>",
      "title": "<lesson title>",
      "objectives": ["<measurable objective, starts with an action verb like explain, identify, calculate, compare, construct — NEVER 'understand' or 'know'>"],
      "coreIdea": "<1-2 sentence core idea>",
      "examples": ["<example>"],
      "misconceptions": ["<common mistake>"],
      "estimatedMinutes": <5-45>,
      "activities": [
        {
          "step": "observe | guided_practice | independent_practice | mastery_check | positive_completion",
          "order": <1-based number>,
          "type": "reading | exercise | quiz | reflection | widget",
          "description": "<what the learner does>",
          "instructions": "<optional instructions>",
          "questions": [
            { "question": "<question>", "options": ["<exactly 4 options>"], "correctIndex": <0-3> }
          ],
          "widgetId": "<canonical-widget-id>",
          "widgetConfig": {}
        }
      ]
    }
  ]
}

RULES:
- 1 to 6 lessons only (teachers build short courses).
- Exactly one activity per lesson with "type": "quiz"; its questions are multiple-choice with exactly 4 options each.
- Use measurable objectives, never "understand", "know", or "learn".
- Widget ids must be chosen from the AVAILABLE WIDGETS table in this prompt (canonical catalog ids); never "open-edu.*".
- All required fields above must be present and non-empty.
`;

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
