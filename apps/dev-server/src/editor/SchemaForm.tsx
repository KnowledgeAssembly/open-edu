import { useCallback } from 'react';

interface SchemaFormProps {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
  /** Optional subset of fields to show (e.g., ['id', 'title']) */
  fields?: string[];
  /** Labels for fields */
  fieldLabels?: Record<string, string>;
  /** Placeholders for fields */
  placeholders?: Record<string, string>;
  /** Hide fields with these paths */
  hideFields?: string[];
}

export function SchemaForm({
  data,
  onChange,
  fields,
  fieldLabels = {},
  placeholders = {},
  hideFields = [],
}: SchemaFormProps) {
  const handleFieldChange = useCallback(
    (key: string, value: unknown) => {
      onChange({ ...data, [key]: value });
    },
    [data, onChange],
  );

  const visibleKeys = fields ?? Object.keys(data).filter((k) => !hideFields.includes(k));

  return (
    <div className="space-y-3">
      {visibleKeys.map((key) => {
        const value = data[key];
        const label = fieldLabels[key] ?? key;
        const placeholder = placeholders[key] ?? '';

        if (value === null || value === undefined) {
          return (
            <FieldWrapper key={key} label={label}>
              <input
                type="text"
                className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder={placeholder || `Enter ${label.toLowerCase()}...`}
                value=""
                onChange={(e) => handleFieldChange(key, e.target.value)}
              />
            </FieldWrapper>
          );
        }

        if (typeof value === 'string') {
          const isLongText = value.length > 80 || value.includes('\n');
          if (isLongText) {
            return (
              <FieldWrapper key={key} label={label}>
                <textarea
                  className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  rows={4}
                  placeholder={placeholder || `Enter ${label.toLowerCase()}...`}
                  value={value}
                  onChange={(e) => handleFieldChange(key, e.target.value)}
                />
              </FieldWrapper>
            );
          }
          return (
            <FieldWrapper key={key} label={label}>
              <input
                type="text"
                className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder={placeholder || `Enter ${label.toLowerCase()}...`}
                value={value}
                onChange={(e) => handleFieldChange(key, e.target.value)}
              />
            </FieldWrapper>
          );
        }

        if (typeof value === 'number') {
          return (
            <FieldWrapper key={key} label={label}>
              <input
                type="number"
                className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder={placeholder || `Enter ${label.toLowerCase()}...`}
                value={value}
                onChange={(e) => handleFieldChange(key, Number(e.target.value))}
              />
            </FieldWrapper>
          );
        }

        if (typeof value === 'boolean') {
          return (
            <FieldWrapper key={key} label={label}>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={value}
                  onChange={(e) => handleFieldChange(key, e.target.checked)}
                  id={`field-${key}`}
                />
                <label htmlFor={`field-${key}`} className="text-sm text-gray-600">
                  {label}
                </label>
              </div>
            </FieldWrapper>
          );
        }

        if (Array.isArray(value)) {
          return (
            <FieldWrapper key={key} label={label}>
              <div className="space-y-1">
                {value.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1">
                    <input
                      type="text"
                      className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={typeof item === 'string' ? item : JSON.stringify(item)}
                      onChange={(e) => {
                        const newArray = [...value];
                        newArray[idx] = e.target.value;
                        handleFieldChange(key, newArray);
                      }}
                    />
                    <button
                      type="button"
                      className="shrink-0 rounded p-1 text-gray-400 hover:bg-red-100 hover:text-red-600"
                      onClick={() => {
                        const newArray = value.filter((_, i) => i !== idx);
                        handleFieldChange(key, newArray);
                      }}
                      aria-label={`Remove item ${idx + 1}`}
                    >
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="mt-1 rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                  onClick={() => handleFieldChange(key, [...value, ''])}
                >
                  + Add item
                </button>
              </div>
            </FieldWrapper>
          );
        }

        if (typeof value === 'object') {
          return (
            <FieldWrapper key={key} label={label}>
              <textarea
                className="w-full rounded border border-gray-300 px-2.5 py-1.5 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                rows={3}
                value={JSON.stringify(value, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    handleFieldChange(key, parsed);
                  } catch {
                    // Allow invalid JSON during editing
                  }
                }}
              />
            </FieldWrapper>
          );
        }

        return null;
      })}
    </div>
  );
}

function FieldWrapper({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-0.5 block text-xs font-medium text-gray-600">{label}</label>
      {children}
    </div>
  );
}

export { FieldWrapper };
