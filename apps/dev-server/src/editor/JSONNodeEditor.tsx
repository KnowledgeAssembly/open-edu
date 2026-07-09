import { useMemo } from 'react';
import { SchemaForm } from './SchemaForm';

type NodeType = 'lesson' | 'quiz' | 'reflection' | 'exercise' | 'custom';

interface QuizOption {
  id: string;
  text: string;
  correct: boolean;
}

interface ContentNodeData {
  type: NodeType;
  title?: string;
  skills?: string[];
  question?: string;
  options?: QuizOption[];
  prompt?: string;
  widget?: string;
  version?: string;
  config?: Record<string, unknown>;
  remoteWidget?: Record<string, unknown>;
}

interface JSONNodeEditorProps {
  data: ContentNodeData;
  onChange: (data: ContentNodeData) => void;
  fileName: string;
}

const commonFieldLabels: Record<string, string> = {
  type: 'Node Type',
  title: 'Title',
  skills: 'Skills',
};

const commonPlaceholders: Record<string, string> = {
  title: 'Node title (optional)',
};

const typeDescriptions: Record<NodeType, string> = {
  lesson: 'A markdown lesson node with optional title and skills',
  quiz: 'A quiz node with question and multiple-choice options',
  reflection: 'A reflection prompt node',
  exercise: 'An interactive exercise node',
  custom: 'A custom widget node',
};

export function JSONNodeEditor({ data, onChange, fileName }: JSONNodeEditorProps) {
  const formContent = useMemo(() => {
    const base: Record<string, unknown> = {
      type: data.type,
      ...(data.title ? { title: data.title } : {}),
      ...(data.skills ? { skills: data.skills } : {}),
    };

    if (data.type === 'quiz') {
      return {
        ...base,
        question: data.question ?? '',
        options: data.options ?? [{ id: 'a', text: '', correct: false }],
      };
    }

    if (data.type === 'reflection') {
      return {
        ...base,
        prompt: data.prompt ?? '',
      };
    }

    if (data.type === 'exercise') {
      return {
        ...base,
        widget: data.widget ?? '',
        config: data.config ?? {},
      };
    }

    if (data.type === 'custom') {
      return {
        ...base,
        widget: data.widget ?? '',
        version: data.version ?? '',
        config: data.config ?? {},
        remoteWidget: data.remoteWidget ?? {},
      };
    }

    return base;
  }, [data]);

  const handleFormChange = (updated: Record<string, unknown>) => {
    onChange(updated as unknown as ContentNodeData);
  };

  const fields = useMemo(() => {
    const base = ['type', 'title', 'skills'];
    switch (data.type) {
      case 'quiz':
        return [...base, 'question', 'options'];
      case 'reflection':
        return [...base, 'prompt'];
      case 'exercise':
        return [...base, 'widget', 'config'];
      case 'custom':
        return [...base, 'widget', 'version', 'config', 'remoteWidget'];
      default:
        return base;
    }
  }, [data.type]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-purple-100 bg-purple-50 px-3 py-2 text-xs text-purple-700">
        <span className="font-medium">
          {data.type.charAt(0).toUpperCase() + data.type.slice(1)} node
        </span>
        {' — '}
        {typeDescriptions[data.type] ?? 'Edit node configuration'}
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-gray-600">Type</label>
        <select
          className="rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={data.type}
          onChange={(e) => onChange({ ...data, type: e.target.value as NodeType })}
        >
          <option value="lesson">Lesson</option>
          <option value="quiz">Quiz</option>
          <option value="reflection">Reflection</option>
          <option value="exercise">Exercise</option>
          <option value="custom">Custom Widget</option>
        </select>
        <span className="text-xs text-gray-400">{fileName}</span>
      </div>

      <SchemaForm
        data={formContent as Record<string, unknown>}
        onChange={handleFormChange}
        fields={fields}
        fieldLabels={commonFieldLabels}
        placeholders={commonPlaceholders}
      />

      {data.type === 'quiz' && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-600">Answer Options</label>
          {(data.options ?? []).map((opt, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder={`Option ${String.fromCharCode(97 + idx)}...`}
                value={opt.text}
                onChange={(e) => {
                  const opts = [...(data.options ?? [])];
                  const current = opts[idx]!;
                  opts[idx] = { id: current.id, text: e.target.value, correct: current.correct };
                  onChange({ ...data, options: opts });
                }}
              />
              <label className="flex items-center gap-1 text-xs text-gray-600">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  checked={opt.correct}
                  onChange={(e) => {
                    const opts = [...(data.options ?? [])];
                    const current = opts[idx]!;
                    opts[idx] = { id: current.id, text: current.text, correct: e.target.checked };
                    onChange({ ...data, options: opts });
                  }}
                />
                Correct
              </label>
              <button
                type="button"
                className="shrink-0 rounded p-1 text-gray-400 hover:bg-red-100 hover:text-red-600"
                onClick={() => {
                  const opts = data.options?.filter((_, i) => i !== idx);
                  onChange({ ...data, options: opts });
                }}
                aria-label={`Remove option ${idx + 1}`}
              >
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          <button
            type="button"
            className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
            onClick={() => {
              const newId = String.fromCharCode(97 + (data.options?.length ?? 0));
              onChange({
                ...data,
                options: [...(data.options ?? []), { id: newId, text: '', correct: false }],
              });
            }}
          >
            + Add option
          </button>
        </div>
      )}

      {data.type === 'reflection' && (
        <div>
          <label className="mb-0.5 block text-xs font-medium text-gray-600">Prompt</label>
          <textarea
            className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            rows={4}
            placeholder="Enter reflection prompt..."
            value={data.prompt ?? ''}
            onChange={(e) => onChange({ ...data, prompt: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}
