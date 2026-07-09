import { useMemo } from 'react';

interface RawJsonEditorProps {
  content: string;
  onChange: (content: string) => void;
  fileName: string;
}

export function RawJsonEditor({ content, onChange, fileName }: RawJsonEditorProps) {
  const lineCount = useMemo(() => content.split('\n').length, [content]);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">{fileName} (raw JSON)</span>
        <span className="text-xs text-gray-400">{lineCount} lines</span>
      </div>
      <div className="flex-1 overflow-hidden rounded border border-gray-300">
        <textarea
          className="h-full w-full resize-none p-3 font-mono text-xs leading-relaxed focus:outline-none"
          value={content}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          aria-label="Raw JSON editor"
        />
      </div>
    </div>
  );
}
