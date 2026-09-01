import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CourseSpecJSONSchema } from '@open-edu/course-compiler';
import {
  ProfilesFileSchema,
  QualityRubricFileSchema,
  ArtifactContractSchema,
  type QualityDimension,
  type LearnerProfileDefinition,
} from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const profilesJson = JSON.parse(readFileSync(join(__dirname, 'data/profiles.json'), 'utf-8'));
const qualityRubricJson = JSON.parse(readFileSync(join(__dirname, 'data/quality-rubric.json'), 'utf-8'));

export function buildDerivedSchemaFacts() {
  const schemaShape = CourseSpecJSONSchema.shape;
  const topKeys = Object.keys(schemaShape);
  return {
    format: 'openedu-course-spec',
    version: 1,
    requiredTopLevelKeys: topKeys,
    metadataFields: {
      title: 'string (required)',
      description: 'string (required)',
      author: 'string (optional)',
      version: 'string (optional)',
      difficulty: 'beginner | intermediate | advanced (optional)',
      estimatedHours: 'number (optional)',
      generated: 'boolean (required)',
    },
    lessonFields: {
      id: 'string (kebab-case, required)',
      title: 'string (required)',
      objectives: 'array of strings (required)',
      coreIdea: 'string (required)',
      examples: 'array of strings (optional)',
      misconceptions: 'array of strings (optional)',
      estimatedMinutes: 'number 5-45 (optional)',
      activities: 'array of activity objects (required)',
    },
    activitySteps: [
      'observe',
      'guided_practice',
      'independent_practice',
      'mastery_check',
      'positive_completion',
    ],
    activityTypes: ['reading', 'exercise', 'quiz', 'reflection', 'widget'],
  };
}

export const AUTHORED_PROMPT_RULES = [
  '1 to 6 lessons only (teachers build short courses).',
  'Exactly one activity per lesson with "type": "quiz"; its questions are multiple-choice with exactly 4 options each.',
  'Use measurable objectives, never "understand", "know", or "learn".',
  'Widget ids must be chosen from the AVAILABLE WIDGETS table in this prompt (canonical catalog ids); never "open-edu.*".',
  'All required fields above must be present and non-empty.',
];

export function buildAuthoredPromptView(): string {
  return `
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
${AUTHORED_PROMPT_RULES.map((r: string) => `- ${r}`).join('\n')}
`.trim();
}

export function generateArtifactContractData() {
  const derivedSchemaFacts = buildDerivedSchemaFacts();
  return ArtifactContractSchema.parse({
    schemaVersion: 1,
    format: 'openedu-course-spec',
    version: 1,
    requiredTopLevelKeys: derivedSchemaFacts.requiredTopLevelKeys,
    derivedSchemaFacts,
    authoredPromptRules: AUTHORED_PROMPT_RULES,
  });
}

export function generateAll(): void {
  const rootDir = join(__dirname, '../..');
  const packageDataDir = join(__dirname, 'data');
  const skillRefDir = join(rootDir, 'skills/openedu-course-authoring/references');

  mkdirSync(packageDataDir, { recursive: true });
  mkdirSync(skillRefDir, { recursive: true });

  // 1. Artifact contract JSON
  const artifactContract = generateArtifactContractData();
  writeFileSync(
    join(packageDataDir, 'artifact-contract.json'),
    JSON.stringify(artifactContract, null, 2) + '\n',
  );

  const parsedRubric = QualityRubricFileSchema.parse(qualityRubricJson);
  const parsedProfiles = ProfilesFileSchema.parse(profilesJson);

  // 3. Generate Markdown views for skill references
  const contractMd = `# OpenEdu Course Spec Artifact Contract

Version: ${artifactContract.version}
Format: \`${artifactContract.format}\`

## Top-Level Required Keys
${artifactContract.requiredTopLevelKeys.map((k: string) => `- \`${k}\``).join('\n')}

## Authored Model Prompt Rules
${artifactContract.authoredPromptRules.map((r: string) => `- ${r}`).join('\n')}

## Derived Schema Structure
\`\`\`json
${JSON.stringify(artifactContract.derivedSchemaFacts, null, 2)}
\`\`\`
`;
  writeFileSync(join(skillRefDir, 'artifact-contract.md'), contractMd);

  const rubricMd = `# OpenEdu Quality Rubric Reference

Schema Version: ${parsedRubric.schemaVersion}

## Dimensions

${parsedRubric.dimensions
  .map(
    (d: QualityDimension) => `### ${d.title} (\`${d.id}\`)
- **Description**: ${d.description}
- **Failing Message**: ${d.failingMessage}
- **Prompt Guidance**: ${d.promptGuidance}
`,
  )
  .join('\n')}
`;
  writeFileSync(join(skillRefDir, 'quality-rubric.md'), rubricMd);

  const profilesMd = `# OpenEdu Learner Profiles Reference

Schema Version: ${parsedProfiles.schemaVersion}
Default Profile: \`${parsedProfiles.defaultProfile}\`

## Profiles List
${Object.values(parsedProfiles.profiles)
  .map(
    (p: LearnerProfileDefinition) => `### ${p.name} (\`${p.id}\`)
- **Audience**: ${p.audience}
- **Description**: ${p.description}
- **Accessibility Tags**: ${p.accessibility.length > 0 ? p.accessibility.join(', ') : 'none'}
- **Pacing**: ${p.pacingRangeMinutes[0]}–${p.pacingRangeMinutes[1]} minutes
- **Prompt Instructions**: ${p.promptInstructions || 'none'}
`,
  )
  .join('\n')}
`;
  writeFileSync(join(skillRefDir, 'profiles.md'), profilesMd);

  for (const [id, profile] of Object.entries(parsedProfiles.profiles)) {
    const singleProfileMd = `# Profile: ${profile.name}

- key: ${profile.id}
- default: ${id === parsedProfiles.defaultProfile}
- description: ${profile.description}

## Guidance Deltas

${(profile.guidanceDeltas || []).map((g: string) => `- ${g}`).join('\n')}

## Output Deltas

${(profile.outputDeltas || []).map((o: string) => `- ${o}`).join('\n')}
`;
    writeFileSync(join(skillRefDir, `profile-${id}.md`), singleProfileMd);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  generateAll();
  console.log('Successfully generated domain guidance artifacts.');
}
