import { useState, useMemo } from 'react';

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  fileName: string;
}

export function MarkdownEditor({ content, onChange, fileName }: MarkdownEditorProps) {
  const [showPreview, setShowPreview] = useState(true);

  const renderedPreview = useMemo(() => {
    if (!showPreview) return '';
    return renderBasicMarkdown(content);
  }, [content, showPreview]);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">{fileName}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Line {content.split('\n').length}</span>
          <button
            type="button"
            className={`rounded px-2 py-1 text-xs font-medium ${
              showPreview
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>
        </div>
      </div>
      <div className="flex flex-1 gap-2 overflow-hidden">
        <textarea
          className="min-w-0 flex-1 resize-none rounded border border-gray-300 p-3 font-mono text-sm leading-relaxed focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={content}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          aria-label="Markdown editor"
        />
        {showPreview && (
          <div className="w-1/2 min-w-0 overflow-auto rounded border border-gray-200 bg-white p-3">
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: renderedPreview }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function renderBasicMarkdown(md: string): string {
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
    .replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    .replace(/`(.+?)`/g, '<code>$1</code>');

  // Wrap consecutive <li> in <ul> or <ol>
  html = html.replace(/((?:<li>.*?<\/li>\n?)+)/g, (match) => {
    return `<ul class="list-disc pl-5">\n${match}\n</ul>`;
  });

  // Wrap paragraphs
  const parts = html.split(/\n\n+/);
  html = parts
    .map((part) => {
      part = part.trim();
      if (!part) return '';
      if (
        part.startsWith('<h') ||
        part.startsWith('<ul') ||
        part.startsWith('<ol') ||
        part.startsWith('<pre') ||
        part.startsWith('<li')
      ) {
        return part;
      }
      return `<p>${part.replace(/\n/g, '<br>')}</p>`;
    })
    .join('\n');

  return html;
}
