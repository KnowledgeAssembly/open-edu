import { z } from 'zod';

const widgetSchemaRegistry = new Map<string, z.ZodType>();

export function registerWidgetSchema(widgetId: string, schema: z.ZodType): void {
  widgetSchemaRegistry.set(widgetId, schema);
}

export function getWidgetSchema(widgetId: string): z.ZodType | undefined {
  return widgetSchemaRegistry.get(widgetId);
}

// Lightweight validation schemas matching widget config shapes.
// These are less strict than the runtime widget schemas (which live in .tsx files)
// but catch obvious issues like missing required fields.

const matchingSchema = z.object({
  description: z.string().optional(),
  pairs: z
    .array(
      z.object({
        id: z.string().optional(),
        itemA: z.string(),
        itemB: z.string(),
      }),
    )
    .min(1),
  hints: z.array(z.string()).optional(),
  hint: z.string().optional(),
  interactive: z.boolean().optional(),
});

const dragDropSchema = z.object({
  description: z.string().optional(),
  items: z
    .array(z.object({ id: z.string(), label: z.string(), emoji: z.string().optional() }))
    .min(1),
  targets: z.array(z.object({ id: z.string(), label: z.string() })).min(1),
  expectedPositions: z.record(z.string(), z.string()),
  hints: z.array(z.string()).optional(),
  hint: z.string().optional(),
  interactive: z.boolean().optional(),
});

const sequencingSchema = z.object({
  description: z.string().optional(),
  items: z
    .array(z.object({ id: z.string(), label: z.string(), emoji: z.string().optional() }))
    .min(1),
  correctOrder: z.array(z.string()).min(1),
  hints: z.array(z.string()).optional(),
  hint: z.string().optional(),
  interactive: z.boolean().optional(),
});

const storyQuestionSchema = z.object({
  scenario: z.string().optional(),
  story: z.string().optional(),
  // at least one of scenario or story must be present
  questions: z
    .array(
      z.object({
        question: z.string(),
        options: z.array(z.string()).length(4),
        correctIndex: z.number().min(0).max(3),
        explanation: z.string().optional(),
      }),
    )
    .min(1),
  visual: z.string().optional(),
  interactive: z.boolean().optional(),
});

const fillBlankSchema = z.object({
  description: z.string().optional(),
  template: z.string().optional(),
  statement: z.string().optional(),
  blanks: z
    .array(
      z.object({
        id: z.string().optional(),
        position: z.number().optional(),
        correctAnswer: z.union([z.string(), z.number()]),
        options: z.array(z.union([z.string(), z.number()])).optional(),
      }),
    )
    .optional(),
  answers: z.array(z.union([z.string(), z.number()])).optional(),
  mode: z.enum(['select', 'type']).optional(),
  hints: z.array(z.string()).optional(),
  hint: z.string().optional(),
  interactive: z.boolean().optional(),
});

const visualCountingSchema = z.object({
  description: z.string().optional(),
  items: z.array(z.string()).optional(),
  count: z.number().optional(),
  text: z.string().optional(),
  emoji: z.string().optional(),
  left: z.union([z.array(z.string()), z.number()]).optional(),
  right: z.union([z.array(z.string()), z.number()]).optional(),
  sum: z.number().optional(),
  size: z.enum(['sm', 'md', 'lg']).optional(),
  hints: z.array(z.string()).optional(),
  hint: z.string().optional(),
  interactive: z.boolean().optional(),
});

const fractionVisualSchema = z.object({
  numerator: z.number().int().min(0),
  denominator: z.number().int().min(1),
  mode: z.enum(['bar', 'circle']).optional(),
  label: z.string().optional(),
  showLabel: z.boolean().optional(),
  compare: z
    .object({
      numerator: z.number().int().min(0),
      denominator: z.number().int().min(1),
    })
    .optional(),
  size: z.number().optional(),
  interactive: z.boolean().optional(),
});

const chartReaderSchema = z.object({
  type: z.enum(['bar', 'pictograph']),
  data: z
    .array(z.object({ label: z.string(), value: z.number(), emoji: z.string().optional() }))
    .min(1),
  title: z.string().optional(),
  showValues: z.boolean().optional(),
  correctLabel: z.string().optional(),
  interactive: z.boolean().optional(),
  description: z.string().optional(),
});

const clockTimeSchema = z.object({
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59),
  mode: z.enum(['read', 'set']).optional(),
  showDigital: z.boolean().optional(),
  targetTime: z
    .object({ hour: z.number().int().min(0).max(23), minute: z.number().int().min(0).max(59) })
    .optional(),
  size: z.number().optional(),
  interactive: z.boolean().optional(),
});

const measurementScaleSchema = z.object({
  type: z.enum(['ruler', 'thermometer', 'cylinder']),
  min: z.number(),
  max: z.number(),
  step: z.number().positive(),
  unit: z.string().min(1),
  targetValue: z.number().optional(),
  showReading: z.boolean().optional(),
  showLabels: z.boolean().optional(),
  value: z.number().optional(),
  interactive: z.boolean().optional(),
  description: z.string().optional(),
});

const placeValueChartSchema = z.object({
  description: z.string().optional(),
  maxPlaces: z.enum(['lakh', 'crore']),
  digits: z.array(z.union([z.number(), z.null()])).optional(),
  targetNumber: z.number().optional(),
  draggableDigits: z.array(z.number()).optional(),
  showLabels: z.boolean().optional(),
  interactive: z.boolean().optional(),
});

const gridAreaSchema = z.object({
  description: z.string().optional(),
  rows: z.number().int().min(1).max(20),
  cols: z.number().int().min(1).max(20),
  mode: z.enum(['area', 'perimeter']).optional(),
  highlighted: z.array(z.object({ row: z.number(), col: z.number() })).optional(),
  maxHighlights: z.number().int().min(1).optional(),
  cellSize: z.number().int().min(10).max(100).optional(),
  showCount: z.boolean().optional(),
  interactive: z.boolean().optional(),
});

const realWorldSchema = z.object({
  scenario: z.string().min(1),
  taskDescription: z.string().optional(),
  prompt: z.string().optional(),
  expectedAnswer: z.string().optional(),
  visualExample: z.string().optional(),
  hint: z.string().optional(),
  interactive: z.boolean().optional(),
});

const multipleChoiceSchema = z.object({
  questions: z
    .array(
      z.object({
        question: z.string(),
        options: z.array(z.string()).length(4),
        correctIndex: z.number().min(0).max(3),
        explanation: z.string().optional(),
      }),
    )
    .min(1),
  interactive: z.boolean().optional(),
});

const audioPlayerSchema = z.object({
  audio: z.string().min(1),
  title: z.string().optional(),
  transcript: z.string().optional(),
  captions: z.array(z.object({ start: z.number(), end: z.number(), text: z.string() })).optional(),
  showTranscript: z.boolean().optional(),
  interactive: z.boolean().optional(),
  bookmarks: z.boolean().optional(),
});

const videoPlayerSchema = z.object({
  video: z.string().min(1),
  title: z.string().optional(),
  poster: z.string().optional(),
  chapters: z.array(z.object({ time: z.number(), title: z.string() })).optional(),
  transcript: z.string().optional(),
  showTranscript: z.boolean().optional(),
  interactive: z.boolean().optional(),
});

const flashcardSchema = z.object({
  cards: z
    .array(
      z.object({
        front: z.string().min(1),
        back: z.string().min(1),
        hint: z.string().optional(),
        image: z.string().optional(),
      }),
    )
    .min(1),
  mode: z.enum(['flip', 'multiple', 'spaced']).optional(),
  interactive: z.boolean().optional(),
  shuffle: z.boolean().optional(),
});

const processDiagramSchema = z.object({
  nodes: z
    .array(z.object({ id: z.string(), title: z.string(), description: z.string().optional() }))
    .min(2),
  connections: z
    .array(
      z.object({
        from: z.string(),
        to: z.string(),
        type: z.enum(['arrow', 'dashed', 'double', 'loop']).optional(),
      }),
    )
    .min(1),
  layout: z.enum(['horizontal', 'vertical', 'cycle', 'radial']).optional(),
  title: z.string().optional(),
  interactive: z.boolean().optional(),
  stepByStep: z.boolean().optional(),
});

const numberLineSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  target: z.number().optional(),
  markers: z.array(z.object({ value: z.number(), label: z.string().optional() })).optional(),
  showLabels: z.boolean().optional(),
  mode: z.enum(['integers', 'decimals', 'fractions', 'negative', 'measurement']).optional(),
  interactive: z.boolean().optional(),
});

const socialMapSchema = z.object({
  regions: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        color: z.string().optional(),
        description: z.string().optional(),
      }),
    )
    .min(1),
  labels: z.boolean().optional(),
  legend: z.array(z.object({ color: z.string(), label: z.string() })).optional(),
  markers: z
    .array(z.object({ id: z.string(), label: z.string(), x: z.number(), y: z.number() }))
    .optional(),
  title: z.string().optional(),
  interactive: z.boolean().optional(),
  targetRegion: z.string().optional(),
});

// Register all widget schemas
const WIDGET_SCHEMAS: Record<string, z.ZodType> = {
  'open-edu.matching': matchingSchema,
  'open-edu.drag-drop': dragDropSchema,
  'open-edu.sequencing': sequencingSchema,
  'open-edu.story-question': storyQuestionSchema,
  'open-edu.fill-blank': fillBlankSchema,
  'open-edu.visual-counting': visualCountingSchema,
  'open-edu.fraction-visual': fractionVisualSchema,
  'open-edu.chart-reader': chartReaderSchema,
  'open-edu.clock-time': clockTimeSchema,
  'open-edu.measurement-scale': measurementScaleSchema,
  'open-edu.place-value-chart': placeValueChartSchema,
  'open-edu.grid-area': gridAreaSchema,
  'open-edu.real-world': realWorldSchema,
  'open-edu.multiple-choice': multipleChoiceSchema,
  'open-edu.multiple-choice-practice': multipleChoiceSchema,
  'core.audio-player': audioPlayerSchema,
  'core.video-player': videoPlayerSchema,
  'language.flashcard': flashcardSchema,
  'science.process-diagram': processDiagramSchema,
  'math.number-line': numberLineSchema,
  'social.map': socialMapSchema,
};

export function registerAllWidgetSchemas(): void {
  for (const [id, schema] of Object.entries(WIDGET_SCHEMAS)) {
    registerWidgetSchema(id, schema);
  }
}
