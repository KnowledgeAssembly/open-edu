import { useCallback } from 'react';
import { X } from 'lucide-react';

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
                className="border-outline-variant focus:border-primary focus:ring-primary w-full rounded border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1"
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
                  className="border-outline-variant focus:border-primary focus:ring-primary w-full rounded border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1"
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
                className="border-outline-variant focus:border-primary focus:ring-primary w-full rounded border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1"
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
                className="border-outline-variant focus:border-primary focus:ring-primary w-full rounded border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1"
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
                  className="border-outline-variant text-primary focus:ring-primary h-4 w-4 rounded"
                  checked={value}
                  onChange={(e) => handleFieldChange(key, e.target.checked)}
                  id={`field-${key}`}
                />
                <label htmlFor={`field-${key}`} className="text-on-surface-variant text-sm">
                  {label}
                </label>
              </div>
            </FieldWrapper>
          );
        }

        if (Array.isArray(value)) {
          const hasObjectItems = value.some((item) => typeof item === 'object' && item !== null);
          if (hasObjectItems) {
            return (
              <FieldWrapper key={key} label={label}>
                <textarea
                  className="border-outline-variant focus:border-primary focus:ring-primary w-full rounded border px-2.5 py-1.5 font-mono text-sm focus:outline-none focus:ring-1"
                  rows={4}
                  value={JSON.stringify(value, null, 2)}
                  onChange={(e) => {
                    try {
                      handleFieldChange(key, JSON.parse(e.target.value));
                    } catch {
                      // Allow invalid JSON during editing
                    }
                  }}
                />
              </FieldWrapper>
            );
          }
          return (
            <FieldWrapper key={key} label={label}>
              <div className="space-y-1">
                {value.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1">
                    <input
                      type="text"
                      className="border-outline-variant focus:border-primary focus:ring-primary w-full rounded border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1"
                      value={typeof item === 'string' ? item : String(item)}
                      onChange={(e) => {
                        const newArray = [...value];
                        newArray[idx] = e.target.value;
                        handleFieldChange(key, newArray);
                      }}
                    />
                    <button
                      type="button"
                      className="text-on-surface-variant hover:bg-error-container hover:text-error shrink-0 rounded p-1"
                      onClick={() => {
                        const newArray = value.filter((_, i) => i !== idx);
                        handleFieldChange(key, newArray);
                      }}
                      aria-label={`Remove item ${idx + 1}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="text-primary hover:bg-primary-container mt-1 rounded px-2 py-1 text-xs font-medium"
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
                className="border-outline-variant focus:border-primary focus:ring-primary w-full rounded border px-2.5 py-1.5 font-mono text-sm focus:outline-none focus:ring-1"
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
      <label className="text-on-surface-variant mb-0.5 block text-xs font-medium">{label}</label>
      {children}
    </div>
  );
}

export { FieldWrapper };
