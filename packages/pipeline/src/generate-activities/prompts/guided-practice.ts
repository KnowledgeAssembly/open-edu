export const GUIDED_PRACTICE_PROMPT = `You are designing a GUIDED PRACTICE activity for a course concept.

## Concept
- **conceptId:** {CONCEPT_ID}
- **Learning Objective:** {LEARNING_OBJECTIVE}
- **Core Idea:** {CORE_IDEA}
- **Examples:** {EXAMPLES}
- **Misconceptions:** {MISCONCEPTIONS}

## The Guided Practice Step
The learner tries with hints and support. Provide step-by-step guidance.

## Output Requirements
Generate a JSON object with:
{
  "type": "exercise",
  "content": {
    "description": "Short title for this practice activity",
    "instructions": "Practice problems with step-by-step guidance and hints. Include 2-3 problems.",
    "examples": ["Problem 1 with solution hint", "Problem 2 with solution hint"]
  }
}

The instructions should contain practice problems with hints or scaffolding to help the learner.
`;
