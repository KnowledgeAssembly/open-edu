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
}

export type AccessibilityProfile = 'autism' | 'adhd' | 'dyslexia';

export interface LearningHistory {
  completedLessons: string[];
  recentPages: Array<{ pageId: string; timeSpent: number }>;
  strengths: string[];
  weakConcepts: string[];
}
