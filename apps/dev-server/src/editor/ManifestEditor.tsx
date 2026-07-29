import { useMemo } from 'react';
import { SchemaForm } from './SchemaForm';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

interface ManifestData {
  id: string;
  title: string;
  version: string;
  author: string;
  entry: string;
  tags?: string[];
  description?: string;
}

interface ManifestEditorProps {
  data: ManifestData;
  onChange: (data: ManifestData) => void;
  /** List of available node paths for the entry dropdown */
  nodePaths?: string[];
}

const fieldLabels: Record<string, string> = {
  id: 'Package ID',
  title: 'Title',
  version: 'Version',
  author: 'Author',
  entry: 'Entry Node',
  tags: 'Tags',
};

const placeholders: Record<string, string> = {
  id: 'my-package',
  title: 'My Package',
  version: '0.1.0',
  author: 'Your Name',
  entry: 'nodes/intro.md',
};

export function ManifestEditor({ data, onChange, nodePaths = [] }: ManifestEditorProps) {
  const sortedPaths = useMemo(() => [...nodePaths].sort(), [nodePaths]);

  return (
    <div className="space-y-4">
      <div className="border-primary-container bg-primary-container text-on-primary-container rounded-lg border px-3 py-2 text-xs">
        Edit your package manifest. Changes are validated against the OpenEdu schema before saving.
      </div>

      <SchemaForm
        data={data as unknown as Record<string, unknown>}
        onChange={(d: Record<string, unknown>) => onChange(d as unknown as ManifestData)}
        fields={['id', 'title', 'version', 'author', 'entry', 'tags']}
        fieldLabels={fieldLabels}
        placeholders={placeholders}
      />

      {sortedPaths.length > 0 && (
        <div>
          <label className="text-on-surface-variant mb-0.5 block text-xs font-medium">
            Entry Node
          </label>
          <Select value={data.entry} onValueChange={(value) => onChange({ ...data, entry: value })}>
            <SelectTrigger className="border-outline-variant text-on-surface focus:border-primary focus:ring-primary w-full rounded border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortedPaths.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
