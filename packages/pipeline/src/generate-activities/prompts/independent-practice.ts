export const INDEPENDENT_PRACTICE_PROMPT = `You are designing an INDEPENDENT PRACTICE activity for a course concept.

## Concept
- **conceptId:** {CONCEPT_ID}
- **Learning Objective:** {LEARNING_OBJECTIVE}
- **Core Idea:** {CORE_IDEA}
- **Examples:** {EXAMPLES}
- **Misconceptions:** {MISCONCEPTIONS}

## The Independent Practice Step
The learner practices on their own with NO hints. This step should be slightly harder than guided practice.

## Output Requirements
Generate a JSON object with:
{
  "type": "exercise",
  "content": {
    "description": "Short title for this practice activity",
    "instructions": "Practice problems for the learner to solve independently. Include 3-4 problems without hints.",
    "examples": ["Problem 1", "Problem 2", "Problem 3"]
  }
}

The instructions should contain practice problems without hints — the learner should solve these on their own.
`;
