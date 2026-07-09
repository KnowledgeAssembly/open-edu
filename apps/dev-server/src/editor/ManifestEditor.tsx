import { SchemaForm } from './SchemaForm';

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

export function ManifestEditor({ data, onChange }: ManifestEditorProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
        Edit your package manifest. Changes are validated against the OpenEdu schema before saving.
      </div>
      <SchemaForm
        data={data as unknown as Record<string, unknown>}
        onChange={(d: Record<string, unknown>) => onChange(d as unknown as ManifestData)}
        fields={['id', 'title', 'version', 'author', 'entry', 'tags']}
        fieldLabels={fieldLabels}
        placeholders={placeholders}
      />
    </div>
  );
}
