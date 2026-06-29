export const OBSERVE_PROMPT = `You are designing an OBSERVE activity for a course concept.

## Concept
- **conceptId:** {CONCEPT_ID}
- **Learning Objective:** {LEARNING_OBJECTIVE}
- **Core Idea:** {CORE_IDEA}
- **Examples:** {EXAMPLES}
- **Misconceptions:** {MISCONCEPTIONS}

## The Observe Step
The observe step is the first activity. The instructor demonstrates the concept. Show, don't just tell.
- Use clear, simple explanations
- Include concrete examples
- Be visual and descriptive
- This activity type is "reading" — it presents information for the learner to study

## Output Requirements
Generate a JSON object with:
{
  "type": "reading",
  "content": {
    "description": "Short title for this activity",
    "instructions": "The main explanatory markdown content. Explain the concept clearly with examples.",
    "examples": ["Example 1 description", "Example 2 description"]
  }
}

The instructions should be 2-4 paragraphs of clear explanatory text suitable for a course-spec.md format.
`;
