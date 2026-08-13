import { useMemo } from 'react';
import { Textarea } from '../components/ui/textarea';

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
        <span className="text-on-surface-variant text-xs font-medium">{fileName} (raw JSON)</span>
        <span className="text-on-surface-variant text-xs">{lineCount} lines</span>
      </div>
      <div className="border-outline-variant flex-1 overflow-hidden rounded border">
        <Textarea
          className="size-full resize-none rounded-none border-0 p-3 font-mono text-xs leading-relaxed focus:outline-none focus-visible:ring-0"
          value={content}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          aria-label="Raw JSON editor"
        />
      </div>
    </div>
  );
}
