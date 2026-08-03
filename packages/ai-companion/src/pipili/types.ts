import type { ExplanationStyle } from '../providers/types.js';
import type { AnimationConfigInput } from '@open-edu/schemas';

export type { ExplanationStyle } from '../providers/types.js';

/**
 * OAS animation states for the Pipili mascot. Each state maps to a dotLottie
 * animation binding (see `PipiliAnimationBinding`).
 */
export type PipiliAnimationState = 'idle' | 'thinking' | 'celebrating' | 'hinting';

export interface PipiliAnimationBinding {
  state: PipiliAnimationState;
  animation: AnimationConfigInput;
}

export interface PipiliOasBindings {
  bindings: PipiliAnimationBinding[];
  /** Default animation used when no state-specific binding matches. */
  fallback?: AnimationConfigInput;
}

/**
 * Default example bindings matching the OAS spec §4.1 (AI Companion & Mascot).
 * Content authors override these with their own `.lottie` assets.
 */
export const DEFAULT_PIPILI_OAS_BINDINGS: PipiliOasBindings = {
  fallback: {
    backend: 'lottie',
    src: 'assets/pipili/pipili-idle.lottie',
    loop: true,
    reducedMotion: 'static-pose',
  },
  bindings: [
    {
      state: 'idle',
      animation: {
        backend: 'lottie',
        src: 'assets/pipili/pipili-idle.lottie',
        loop: true,
        reducedMotion: 'static-pose',
      },
    },
    {
      state: 'thinking',
      animation: {
        backend: 'lottie',
        src: 'assets/pipili/pipili-thinking.lottie',
        loop: true,
        reducedMotion: 'static-pose',
      },
    },
    {
      state: 'celebrating',
      animation: {
        backend: 'lottie',
        src: 'assets/pipili/pipili-celebrate.lottie',
        trigger: 'lesson-complete',
        reducedMotion: 'static-pose',
      },
    },
    {
      state: 'hinting',
      animation: {
        backend: 'lottie',
        src: 'assets/pipili/pipili-hint.lottie',
        reducedMotion: 'static-pose',
      },
    },
  ],
};

export interface PipiliRequest {
  conversationId: string;
  messages: PipiliMessage[];
  context: PipiliContextSnapshot;
}

export interface PipiliMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface PipiliContextSnapshot {
  page?: PageContext;
  widget?: WidgetContext;
  lesson?: LessonContext;
  module?: ModuleContext;
  course?: CourseContext;
  notes?: NotesContext;
  assessment?: AssessmentContext;
  learner?: LearnerProfile;
  history?: LearningHistory;
}

export interface PageContext {
  id: string;
  title: string;
  content: string;
  nodeType: string;
}

export interface WidgetContext {
  id: string;
  type: string;
  state: Record<string, unknown>;
  question?: string;
  answer?: string;
  userResponse?: string;
}

export interface LessonContext {
  id: string;
  title: string;
  objectives: string[];
  topics: string[];
}

export interface ModuleContext {
  id: string;
  title: string;
  lessons: Array<{ id: string; title: string }>;
}

export interface CourseContext {
  id: string;
  title: string;
  description: string;
  subject: string;
  level: string;
  language: string;
}

export interface NotesContext {
  entries: NoteEntry[];
  searchQuery?: string;
}

export interface NoteEntry {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  pageId?: string;
  lessonId?: string;
}

export interface AssessmentContext {
  isActive: boolean;
  assessmentId?: string;
  questionType?: string;
  questionText?: string;
  maxAttempts?: number;
  attemptsUsed?: number;
}

export interface LearnerProfile {
  language: string;
  readingLevel: string;
  accessibilityProfile?: AccessibilityProfile;
  explanationStyle?: ExplanationStyle;
  emojiMode?: 'native' | 'openmoji';
}

export type AccessibilityProfile = 'autism' | 'adhd' | 'dyslexia';

export interface LearningHistory {
  completedLessons: string[];
  recentPages: Array<{ pageId: string; timeSpent: number }>;
  strengths: string[];
  weakConcepts: string[];
}
