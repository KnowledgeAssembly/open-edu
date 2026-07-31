# Quality Rubric

The quality report evaluates a course spec against pedagogical dimensions. Each check has a severity (`pass`, `warning`, or `error`) and evidence.

## Dimension 1: Objective Coverage

Every learning objective must map to at least one learning activity and one assessment signal.

| Check ID    | Rule                                                                                            | Severity  |
| ----------- | ----------------------------------------------------------------------------------------------- | --------- |
| `QC-OBJ-01` | Every objective is covered by at least one activity                                             | `error`   |
| `QC-OBJ-02` | Every objective has an assessment signal (quiz, exercise with feedback, or mastery_check)       | `warning` |
| `QC-OBJ-03` | No lesson has more than 6 objectives                                                            | `warning` |
| `QC-OBJ-04` | Objectives use measurable action verbs (identify, explain, calculate, compare, construct, etc.) | `warning` |

## Dimension 2: Assessment Alignment

Assessments must test what was taught, not introduce new concepts.

| Check ID    | Rule                                                              | Severity  |
| ----------- | ----------------------------------------------------------------- | --------- |
| `QC-ASM-01` | Quiz questions reference only concepts introduced in the lesson   | `error`   |
| `QC-ASM-02` | Every lesson with > 0 activities has a mastery_check or quiz step | `warning` |
| `QC-ASM-03` | Assessment difficulty matches the stated course difficulty level  | `warning` |

## Dimension 3: Duration Consistency

| Check ID    | Rule                                                              | Severity  |
| ----------- | ----------------------------------------------------------------- | --------- |
| `QC-DUR-01` | Sum of lesson.estimatedMinutes within 20% of total estimatedHours | `warning` |
| `QC-DUR-02` | No single lesson exceeds 45 minutes                               | `warning` |
| `QC-DUR-03` | No single lesson is under 5 minutes                               | `warning` |

## Dimension 4: Activity Progression

| Check ID     | Rule                                                             | Severity  |
| ------------ | ---------------------------------------------------------------- | --------- |
| `QC-PROG-01` | Lesson contains at least one activity from each step type        | `warning` |
| `QC-PROG-02` | Activity `order` values are sequential (1,2,3...) and start at 1 | `warning` |
| `QC-PROG-03` | First activity is observe (introduce concept)                    | `info`    |

## Dimension 5: Widget Decisions

| Check ID    | Rule                                                               | Severity |
| ----------- | ------------------------------------------------------------------ | -------- |
| `QC-WDG-01` | Widget IDs are from the discovered catalog (canonical, not legacy) | `error`  |
| `QC-WDG-02` | Widget is not marked deprecated                                    | `error`  |
| `QC-WDG-03` | widgetConfig includes all required fields for the widget           | `error`  |
| `QC-WDG-04` | Widget choice is justified by learning intent                      | `info`   |

## Dimension 6: Accessibility & Inclusion

| Check ID    | Rule                                                                | Severity  |
| ----------- | ------------------------------------------------------------------- | --------- |
| `QC-ACC-01` | Instructions use plain language (reading level appropriate)         | `warning` |
| `QC-ACC-02` | Widget choices support keyboard-only interaction where possible     | `info`    |
| `QC-ACC-03` | Color is not the sole differentiator (non-color-only distinctions)  | `warning` |
| `QC-ACC-04` | Content is chunked into readable segments (not single large blocks) | `warning` |

## Dimension 7: Completeness

| Check ID    | Rule                                                     | Severity  |
| ----------- | -------------------------------------------------------- | --------- |
| `QC-COM-01` | Every required field in the artifact contract is present | `error`   |
| `QC-COM-02` | No unresolved assumptions in course-brief.md             | `warning` |
| `QC-COM-03` | Every lesson has coreIdea, examples, and misconceptions  | `warning` |

## Dimension 8: Rewards & Cards

| Check ID    | Rule                                                          | Severity  |
| ----------- | ------------------------------------------------------------- | --------- |
| `QC-REW-01` | Reward `condition` is attached to the reward, not the trigger | `error`   |
| `QC-REW-02` | Condition scope matches file placement (module vs bundle)     | `error`   |
| `QC-REW-03` | Card IDs are unique across the whole bundle                   | `error`   |
| `QC-REW-04` | Card definitions include summary, category, and levels        | `warning` |
| `QC-REW-05` | No condition uses a signal the scope cannot evaluate          | `error`   |

## Finding Severity Codes

Findings use these severity levels:

- `error` — fails the run (must be fixed)
- `warning` — degrades quality but does not fail
- `info` — advisory only
- `pass` — check satisfied

## Quality Report Format

```json
{
  "success": true,
  "timestamp": "2026-07-25T...",
  "summary": {
    "lessons": 3,
    "objectives": 9,
    "activities": 12,
    "widgetsUsed": 2,
    "totalEstimatedMinutes": 60,
    "errors": 0,
    "warnings": 2,
    "infos": 3
  },
  "findings": [
    {
      "checkId": "QC-OBJ-04",
      "severity": "warning",
      "message": "Objective \"understand photosynthesis\" uses a non-measurable verb"
    }
  ]
}
```
