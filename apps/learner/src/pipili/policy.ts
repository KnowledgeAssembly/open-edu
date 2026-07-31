import type {
  AccessibilityProfile,
  BoundedContext,
  Citation,
  ExplanationStyle,
  PipiliMode,
  PipiliResponseMetadata,
} from '@open-edu/ai-companion/pipili';

export interface SystemPromptParams {
  boundedContext: BoundedContext;
  assessmentActive: boolean;
  learnerLanguage: string;
  readingLevel: string;
  accessibilityProfile?: AccessibilityProfile;
  explanationStyle?: ExplanationStyle;
  emojiVisualMode?: boolean;
}

export function buildSystemPrompt(params: SystemPromptParams): string {
  const {
    boundedContext,
    assessmentActive,
    accessibilityProfile,
    explanationStyle,
    emojiVisualMode,
  } = params;

  let prompt = `You are Pipili, a learning companion in the OpenEdu platform. Your role is to help learners understand, reflect, and progress through their educational content.

## Educational Context
${boundedContext.entries.map((e) => `### ${e.source}\n${e.content}`).join('\n\n')}

## Response Guidelines
1. Start with a direct answer or first useful hint.
2. Ground your explanation in the strongest available educational source from the context above.
3. Include a small example where useful.
4. End with a reflection prompt or check for understanding.
5. Suggest one concrete next step.

## Core Rules
- Guide learning rather than maximize answer completion.
- Ask for learner effort before providing level-4 walkthroughs.
- Do not change topics unless the learner explicitly asks.
- If information is absent from the provided context, say: "I cannot find that information in the current course" and offer a safe way to continue.
- NEVER invent course facts, citations, or educational content not present in the context.

`;

  if (assessmentActive) {
    prompt += `## Assessment Mode (ACTIVE)
- Do NOT reveal the answer, answer choice, or answer key.
- Do NOT solve the entire active assessment.
- You MAY: explain concepts, compare approaches, ask about reasoning, provide progressive hints.
- The question being assessed is provided in the context — reference it but do not solve it.
`;
  }

  if (accessibilityProfile) {
    prompt += `## Accessibility Adaptation
${getAccessibilityInstructions(accessibilityProfile)}
`;
  }

  if (explanationStyle) {
    prompt += `## Explanation Style (${explanationStyle})
${getExplanationStyleInstructions(explanationStyle)}
`;
  }

  if (emojiVisualMode) {
    prompt += `## Emoji Use
- Use a few small, friendly emojis (e.g. 🌟, 💡, ✅) to encourage the learner.
- Keep emojis relevant and never let them replace meaning.
- Use at most one or two emojis per response.
`;
  }

  return prompt;
}

function getExplanationStyleInstructions(style: ExplanationStyle): string {
  switch (style) {
    case 'simple':
      return `- Use short sentences and plain words.
- Explain one idea at a time.
- Prefer examples over abstract definitions.`;
    case 'detailed':
      return `- Give thorough, well-structured explanations.
- Include reasoning, examples, and connections to related ideas.
- Use headings or numbered points to organize longer answers.`;
    case 'exam':
      return `- Teach toward exam-style questions.
- Highlight key definitions and facts the learner should memorise.
- Suggest practice questions and mark-relevant points.`;
    case 'child_friendly':
      return `- Use warm, playful, age-appropriate language.
- Keep sentences short and concrete.
- Use simple analogies from everyday life.`;
    case 'autism_friendly':
      return `- Use literal, concrete wording — avoid metaphors and sarcasm.
- Keep structure predictable: headings, short paragraphs, numbered steps.
- Avoid sensory overload; keep sentences short.`;
    default:
      return '';
  }
}

function getAccessibilityInstructions(profile: AccessibilityProfile): string {
  switch (profile) {
    case 'autism':
      return `- Use predictable headings and structure.
- Use literal, concrete wording — avoid metaphors and sarcasm.
- Keep paragraphs short and well-separated.
- Give clear, numbered instructions.
- Avoid unnecessary sensory language or emotional tone.`;

    case 'adhd':
      return `- Chunk content into small, scannable sections.
- Highlight key points at the start.
- Use short, actionable steps.
- Provide visible progress cues (e.g., "Step 2 of 4").
- Keep responses concise and avoid tangents.`;

    case 'dyslexia':
      return `- Use simpler wording and shorter sentences.
- Reduce dense prose — prefer bullet points and lists.
- Avoid complex sentence structures with multiple clauses.
- Use consistent terminology throughout.
- Break explanations into digestible parts.`;

    default:
      return '';
  }
}

export function isAssessmentActive(context: { assessment?: { isActive?: boolean } }): boolean {
  return context.assessment?.isActive === true;
}

export interface ExtractMetadataParams {
  text: string;
  boundedContext: BoundedContext;
  assessmentActive: boolean;
  toolCalls?: ReadonlyArray<{ toolName: string }>;
}

export function extractMetadata(params: ExtractMetadataParams): PipiliResponseMetadata {
  const { text, boundedContext, assessmentActive, toolCalls } = params;

  const mode = inferMode(text, toolCalls);

  const citations = deriveCitations(boundedContext, text);

  const hintLevel = inferHintLevel(toolCalls);

  const assessmentSafe = assessmentActive ? !looksLikeAnswerLeak(text) : true;

  const suggestedNextSteps = deriveNextSteps(text, boundedContext);

  return {
    mode,
    citations,
    hintLevel,
    assessmentSafe,
    suggestedNextSteps,
  };
}

function inferMode(text: string, toolCalls?: ReadonlyArray<{ toolName: string }>): PipiliMode {
  if (toolCalls?.some((t) => t.toolName === 'createProgressiveHint')) {
    return 'coach';
  }
  const t = text.toLowerCase();
  if (t.includes('reflect') || t.includes('what do you think')) {
    return 'reflection';
  }
  if (t.includes('let me find') || t.includes('search your notes')) {
    return 'navigator';
  }
  return 'tutor';
}

function deriveCitations(boundedContext: BoundedContext, text: string): Citation[] {
  const seen = new Set<string>();
  const citations: Citation[] = [];
  for (const entry of boundedContext.entries) {
    const signature = entry.content
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l.length > 0 && !l.startsWith('[') && !l.startsWith('Title:'));
    if (!signature) continue;
    if (text.includes(signature.slice(0, 40)) && !seen.has(entry.source)) {
      seen.add(entry.source);
      citations.push({
        source: entry.source,
        text: signature.slice(0, 160),
        type:
          entry.source === 'notes' ? 'note' : entry.source === 'history' ? 'glossary' : 'lesson',
      });
    }
  }
  return citations;
}

function inferHintLevel(
  toolCalls?: ReadonlyArray<{ toolName: string }>,
): 1 | 2 | 3 | 4 | undefined {
  return toolCalls?.some((t) => t.toolName === 'createProgressiveHint') ? 1 : undefined;
}

function looksLikeAnswerLeak(text: string): boolean {
  return /\bthe answer is\b/i.test(text) && text.length < 200;
}

function deriveNextSteps(text: string, _boundedContext: BoundedContext): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const last = sentences[sentences.length - 1] ?? '';
  const directives = [/^try\b/i, /^next\b/i, /^you (could|might|should)\b/i, /^consider\b/i];
  if (directives.some((re) => re.test(last.trim()))) {
    return [last.trim()];
  }
  return [];
}
