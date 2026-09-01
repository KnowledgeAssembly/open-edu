# OpenEdu Course Spec Artifact Contract

Version: 1
Format: `openedu-course-spec`

## Top-Level Required Keys

- `format`
- `version`
- `generatedAt`
- `metadata`
- `lessons`

## Authored Model Prompt Rules

- 1 to 6 lessons only (teachers build short courses).
- Exactly one activity per lesson with "type": "quiz"; its questions are multiple-choice with exactly 4 options each.
- Use measurable objectives, never "understand", "know", or "learn".
- Widget ids must be chosen from the AVAILABLE WIDGETS table in this prompt (canonical catalog ids); never "open-edu.\*".
- All required fields above must be present and non-empty.

## Derived Schema Structure

```json
{
  "format": "openedu-course-spec",
  "version": 1,
  "requiredTopLevelKeys": ["format", "version", "generatedAt", "metadata", "lessons"],
  "metadataFields": {
    "title": "string (required)",
    "description": "string (required)",
    "author": "string (optional)",
    "version": "string (optional)",
    "difficulty": "beginner | intermediate | advanced (optional)",
    "estimatedHours": "number (optional)",
    "generated": "boolean (required)"
  },
  "lessonFields": {
    "id": "string (kebab-case, required)",
    "title": "string (required)",
    "objectives": "array of strings (required)",
    "coreIdea": "string (required)",
    "examples": "array of strings (optional)",
    "misconceptions": "array of strings (optional)",
    "estimatedMinutes": "number 5-45 (optional)",
    "activities": "array of activity objects (required)"
  },
  "activitySteps": [
    "observe",
    "guided_practice",
    "independent_practice",
    "mastery_check",
    "positive_completion"
  ],
  "activityTypes": ["reading", "exercise", "quiz", "reflection", "widget"]
}
```
