export const POSITIVE_COMPLETION_PROMPT = `You are designing a POSITIVE COMPLETION activity for a course concept.

## Concept
- **conceptId:** {CONCEPT_ID}
- **Learning Objective:** {LEARNING_OBJECTIVE}
- **Core Idea:** {CORE_IDEA}

## The Positive Completion Step
Celebrate the learner's achievement! This is an encouraging message with a reflection prompt.

## Output Requirements
Generate a JSON object with:
{
  "type": "reflection",
  "content": {
    "description": "Encouraging title (e.g., 'Great work!', 'Excellent!')",
    "instructions": "A positive message congratulating the learner and a question prompting them to reflect on what they learned."
  }
}

The instructions should include:
- A congratulatory message
- A reflection question about the concept
- A suggestion for real-world practice
`;
