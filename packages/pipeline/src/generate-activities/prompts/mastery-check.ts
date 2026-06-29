export const MASTERY_CHECK_PROMPT = `You are designing a MASTERY CHECK for a course concept.

## Concept
- **conceptId:** {CONCEPT_ID}
- **Learning Objective:** {LEARNING_OBJECTIVE}
- **Core Idea:** {CORE_IDEA}
- **Examples:** {EXAMPLES}
- **Misconceptions:** {MISCONCEPTIONS}

## The Mastery Check Step
The learner answers 2-3 multiple-choice questions to verify understanding.

## Output Requirements
Generate a JSON object with:
{
  "type": "quiz",
  "content": {
    "description": "Mastery Check",
    "questions": [
      {
        "question": "Question text?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctIndex": 0
      }
    ]
  }
}

Each question has exactly 4 options. correctIndex is 0-based (0-3).
Create 2-3 questions that test different aspects of the concept.
Each question should have exactly one correct answer.
`;
