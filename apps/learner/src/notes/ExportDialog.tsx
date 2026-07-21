import { useState, useCallback } from 'react';
import { useTranslation } from '@open-edu/i18n';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  RadioGroup,
  RadioGroupItem,
} from '@open-edu/design-system';
import type { NoteRecord } from '../notesStorage';
import { safeListNotes, safeGetNoteTags } from '../notesStorage';

export interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note?: NoteRecord;
}

type ExportScope = 'single' | 'all';
type ExportFormat = 'markdown' | 'json';

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'untitled'
  );
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function noteToMarkdown(note: NoteRecord, tags: string[]): string {
  return [
    `# ${note.title || 'Untitled'}`,
    '',
    note.content,
    '',
    '---',
    `_course: ${note.courseId ?? '-'}  lesson: ${note.lessonId ?? '-'}_`,
    `_created: ${note.createdAt}  updated: ${note.updatedAt}_`,
    `_tags: ${tags.join(', ') || 'none'}_`,
  ].join('\n');
}

export function ExportDialog({ open, onOpenChange, note }: ExportDialogProps): JSX.Element {
  const { t } = useTranslation();
  const [scope, setScope] = useState<ExportScope>('single');
  const [format, setFormat] = useState<ExportFormat>('markdown');

  const handleExport = useCallback(async () => {
    const notes = scope === 'single' && note ? [note] : await safeListNotes();
    const tagsMap: Record<string, string[]> = {};
    for (const n of notes) {
      tagsMap[n.id] = await safeGetNoteTags(n.id);
    }

    if (format === 'markdown') {
      const content = notes.map((n) => noteToMarkdown(n, tagsMap[n.id] ?? [])).join('\n\n---\n\n');
      const filename = scope === 'single' ? `${slugify(note?.title ?? '')}.md` : 'all-notes.md';
      downloadBlob(content, filename, 'text/markdown');
    } else {
      const data = notes.map((n) => ({ ...n, tags: tagsMap[n.id] ?? [] }));
      const content = JSON.stringify(scope === 'single' ? data[0] : data, null, 2);
      const filename = scope === 'single' ? `${slugify(note?.title ?? '')}.json` : 'all-notes.json';
      downloadBlob(content, filename, 'application/json');
    }

    onOpenChange(false);
  }, [scope, format, note, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('notes.export.title')}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <fieldset>
            <legend className="text-label mb-2 font-medium">{t('notes.export.title')}</legend>
            <RadioGroup value={scope} onValueChange={(v) => setScope(v as ExportScope)}>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="single" id="export-single" />
                <label htmlFor="export-single" className="text-body-ui">
                  {t('notes.export.single')}
                </label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="all" id="export-all" />
                <label htmlFor="export-all" className="text-body-ui">
                  {t('notes.export.all')}
                </label>
              </div>
            </RadioGroup>
          </fieldset>
          <fieldset>
            <legend className="text-label mb-2 font-medium">{t('notes.export.title')}</legend>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="markdown" id="export-md" />
                <label htmlFor="export-md" className="text-body-ui">
                  {t('notes.export.markdown')}
                </label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="json" id="export-json" />
                <label htmlFor="export-json" className="text-body-ui">
                  {t('notes.export.json')}
                </label>
              </div>
            </RadioGroup>
          </fieldset>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('notes.export.cancel')}
          </Button>
          <Button onClick={() => void handleExport()}>{t('notes.editor.export')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
