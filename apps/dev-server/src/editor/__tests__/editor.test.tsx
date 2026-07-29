import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SchemaForm } from '../SchemaForm';
import { FileTree } from '../FileTree';
import { ManifestEditor } from '../ManifestEditor';
import { RawJsonEditor } from '../RawJsonEditor';
import { MarkdownEditor } from '../MarkdownEditor';
import { JSONNodeEditor } from '../JSONNodeEditor';
import type { FileEntry } from '../types';

describe('SchemaForm', () => {
  const defaultData = { id: 'test', title: 'Test', count: 42, active: true };

  it('renders text input for string values', () => {
    const onChange = vi.fn();
    render(<SchemaForm data={defaultData} onChange={onChange} />);
    const input = screen.getByDisplayValue('test');
    expect(input).toBeInTheDocument();
  });

  it('renders number input for number values', () => {
    const onChange = vi.fn();
    render(<SchemaForm data={defaultData} onChange={onChange} />);
    const input = screen.getByDisplayValue('42');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'number');
  });

  it('renders checkbox for boolean values', () => {
    const onChange = vi.fn();
    render(<SchemaForm data={defaultData} onChange={onChange} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toBeChecked();
  });

  it('calls onChange when text value changes', () => {
    const onChange = vi.fn();
    render(<SchemaForm data={defaultData} onChange={onChange} />);
    const input = screen.getByDisplayValue('test');
    fireEvent.change(input, { target: { value: 'new-id' } });
    expect(onChange).toHaveBeenCalledWith({ ...defaultData, id: 'new-id' });
  });

  it('calls onChange when checkbox is toggled', () => {
    const onChange = vi.fn();
    render(<SchemaForm data={defaultData} onChange={onChange} />);
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(onChange).toHaveBeenCalledWith({ ...defaultData, active: false });
  });

  it('renders textarea for long strings', () => {
    const longData = { description: 'A'.repeat(100) };
    const onChange = vi.fn();
    render(<SchemaForm data={longData} onChange={onChange} />);
    const textarea = screen.getByDisplayValue('A'.repeat(100));
    expect(textarea).toBeInTheDocument();
  });

  it('renders array of strings with add/remove', () => {
    const data = { tags: ['a', 'b'] };
    const onChange = vi.fn();
    render(<SchemaForm data={data} onChange={onChange} />);
    expect(screen.getByDisplayValue('a')).toBeInTheDocument();
    expect(screen.getByDisplayValue('b')).toBeInTheDocument();
    expect(screen.getByText('+ Add item')).toBeInTheDocument();
  });

  it('renders object values as JSON textarea', () => {
    const data = { config: { key: 'value' } };
    const onChange = vi.fn();
    render(<SchemaForm data={data} onChange={onChange} />);
    const textarea = screen.getByText(/[{]/);
    expect(textarea).toBeInTheDocument();
  });

  it('renders array of objects as JSON textarea', () => {
    const data = { items: [{ id: 1 }, { id: 2 }] };
    const onChange = vi.fn();
    render(<SchemaForm data={data} onChange={onChange} />);
    const textarea = screen.getByText(/\[/);
    expect(textarea).toBeInTheDocument();
  });

  it('respects fields prop to show subset', () => {
    const onChange = vi.fn();
    render(<SchemaForm data={defaultData} onChange={onChange} fields={['id', 'title']} />);
    expect(screen.getByDisplayValue('test')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('42')).not.toBeInTheDocument();
  });

  it('respects hideFields prop', () => {
    const onChange = vi.fn();
    render(<SchemaForm data={defaultData} onChange={onChange} hideFields={['active']} />);
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });
});

describe('FileTree', () => {
  const sampleFiles: FileEntry[] = [
    {
      path: 'package.json',
      label: 'Manifest (package.json)',
      category: 'manifest',
      extension: '.json',
    },
    {
      path: 'workflow.json',
      label: 'Workflow (workflow.json)',
      category: 'workflow',
      extension: '.json',
    },
    { path: 'nodes/intro.md', label: 'intro.md', category: 'nodes', extension: '.md' },
    { path: 'assets/image.png', label: 'image.png', category: 'assets', extension: '.png' },
  ];

  it('renders file categories', () => {
    const onSelect = vi.fn();
    const onDelete = vi.fn();
    render(
      <FileTree files={sampleFiles} selectedPath={null} onSelect={onSelect} onDelete={onDelete} />,
    );
    expect(screen.getByText('Manifest')).toBeInTheDocument();
    expect(screen.getByText('Workflow')).toBeInTheDocument();
    expect(screen.getByText('Content Nodes')).toBeInTheDocument();
    expect(screen.getByText('Assets')).toBeInTheDocument();
  });

  it('renders file labels', () => {
    const onSelect = vi.fn();
    const onDelete = vi.fn();
    render(
      <FileTree files={sampleFiles} selectedPath={null} onSelect={onSelect} onDelete={onDelete} />,
    );
    expect(screen.getByText('Manifest (package.json)')).toBeInTheDocument();
    expect(screen.getByText('intro.md')).toBeInTheDocument();
  });

  it('calls onSelect when file clicked', () => {
    const onSelect = vi.fn();
    const onDelete = vi.fn();
    render(
      <FileTree files={sampleFiles} selectedPath={null} onSelect={onSelect} onDelete={onDelete} />,
    );
    fireEvent.click(screen.getByText('Manifest (package.json)'));
    expect(onSelect).toHaveBeenCalledWith('package.json');
  });

  it('highlights selected file', () => {
    const onSelect = vi.fn();
    const onDelete = vi.fn();
    const { container } = render(
      <FileTree
        files={sampleFiles}
        selectedPath="workflow.json"
        onSelect={onSelect}
        onDelete={onDelete}
      />,
    );
    const selected = container.querySelector('[aria-selected="true"]');
    expect(selected).toBeInTheDocument();
    expect(selected).toHaveTextContent('Workflow (workflow.json)');
  });

  it('calls onContextMenu on right-click', () => {
    const onContextMenu = vi.fn();
    render(
      <FileTree
        files={sampleFiles}
        selectedPath={null}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onContextMenu={onContextMenu}
      />,
    );
    const item = screen.getByText('Manifest (package.json)');
    fireEvent.contextMenu(item);
    expect(onContextMenu).toHaveBeenCalledWith(
      expect.objectContaining({
        file: expect.objectContaining({ path: 'package.json' }),
      }),
    );
  });

  it('shows empty state when no files', () => {
    const onSelect = vi.fn();
    const onDelete = vi.fn();
    render(<FileTree files={[]} selectedPath={null} onSelect={onSelect} onDelete={onDelete} />);
    expect(screen.getByText('No editable files found')).toBeInTheDocument();
  });

  it('supports keyboard selection', () => {
    const onSelect = vi.fn();
    const onDelete = vi.fn();
    render(
      <FileTree files={sampleFiles} selectedPath={null} onSelect={onSelect} onDelete={onDelete} />,
    );
    const item = screen.getByText('Manifest (package.json)').closest('[role="treeitem"]');
    expect(item).toBeInTheDocument();
    if (item) {
      fireEvent.keyDown(item, { key: 'Enter' });
      expect(onSelect).toHaveBeenCalledWith('package.json');
    }
  });

  it('renders New Node button in nodes section header', () => {
    const onNewNode = vi.fn();
    render(
      <FileTree
        files={sampleFiles}
        selectedPath={null}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onNewNode={onNewNode}
      />,
    );
    const newBtn = screen.getByTitle('New Content Node');
    expect(newBtn).toBeInTheDocument();
    fireEvent.click(newBtn);
    expect(onNewNode).toHaveBeenCalled();
  });

  it('renders Upload button in assets section header', () => {
    const onUploadAsset = vi.fn();
    render(
      <FileTree
        files={sampleFiles}
        selectedPath={null}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onUploadAsset={onUploadAsset}
      />,
    );
    const uploadBtn = screen.getByTitle('Upload Asset');
    expect(uploadBtn).toBeInTheDocument();
    fireEvent.click(uploadBtn);
    expect(onUploadAsset).toHaveBeenCalled();
  });

  it('shows rename input on double-click', () => {
    const files: FileEntry[] = [
      { path: 'nodes/test.md', label: 'test.md', category: 'nodes', extension: '.md' },
    ];
    render(<FileTree files={files} selectedPath={null} onSelect={vi.fn()} onDelete={vi.fn()} />);
    const label = screen.getByText('test.md');
    fireEvent.doubleClick(label);
    const input = document.querySelector('input');
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('test.md');
  });

  it('renders create config rows for missing config files', () => {
    const onCreateFile = vi.fn();
    render(
      <FileTree
        files={[]}
        selectedPath={null}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onCreateFile={onCreateFile}
      />,
    );
    expect(screen.getByText('Create package.json')).toBeInTheDocument();
    expect(screen.getByText('Create workflow.json')).toBeInTheDocument();
    expect(screen.getByText('Create rewards.json')).toBeInTheDocument();
    expect(screen.getByText('Create cards.json')).toBeInTheDocument();
  });

  it('calls onRenameFile when rename is confirmed', () => {
    const onRenameFile = vi.fn();
    const files: FileEntry[] = [
      { path: 'nodes/old.md', label: 'old.md', category: 'nodes', extension: '.md' },
    ];
    render(
      <FileTree
        files={files}
        selectedPath={null}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onRenameFile={onRenameFile}
      />,
    );
    const label = screen.getByText('old.md');
    fireEvent.doubleClick(label);
    const input = document.querySelector('input');
    expect(input).toBeInTheDocument();
    fireEvent.change(input!, { target: { value: 'new.md' } });
    fireEvent.keyDown(input!, { key: 'Enter' });
    expect(onRenameFile).toHaveBeenCalledWith('nodes/old.md', 'nodes/new.md');
  });

  it('cancels rename on Escape key', () => {
    const files: FileEntry[] = [
      { path: 'nodes/test.md', label: 'test.md', category: 'nodes', extension: '.md' },
    ];
    const { container } = render(
      <FileTree files={files} selectedPath={null} onSelect={vi.fn()} onDelete={vi.fn()} />,
    );
    const label = screen.getByText('test.md');
    fireEvent.doubleClick(label);
    expect(container.querySelector('input')).toBeInTheDocument();
    const input = container.querySelector('input')!;
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(container.querySelector('input')).not.toBeInTheDocument();
  });
});

describe('ManifestEditor', () => {
  const defaultData = {
    id: 'test',
    title: 'Test',
    version: '1.0.0',
    author: 'Me',
    entry: 'nodes/start.md',
    tags: ['a'],
  };
  const nodePaths = ['nodes/start.md', 'nodes/end.md', 'nodes/middle.md'];

  it('renders manifest fields', () => {
    const onChange = vi.fn();
    render(<ManifestEditor data={defaultData} onChange={onChange} />);
    expect(screen.getByDisplayValue('test')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1.0.0')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Me')).toBeInTheDocument();
  });

  it('renders entry node dropdown when nodePaths provided', () => {
    const onChange = vi.fn();
    render(<ManifestEditor data={defaultData} onChange={onChange} nodePaths={nodePaths} />);
    const entryNodeLabels = screen.getAllByText('Entry Node');
    expect(entryNodeLabels.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('nodes/start.md')).toBeInTheDocument();
  });

  it('renders entry node combobox with available paths', () => {
    const onChange = vi.fn();
    render(<ManifestEditor data={defaultData} onChange={onChange} nodePaths={nodePaths} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText('nodes/start.md')).toBeInTheDocument();
  });

  it('shows info banner', () => {
    const onChange = vi.fn();
    render(<ManifestEditor data={defaultData} onChange={onChange} />);
    expect(screen.getByText(/Edit your package manifest/)).toBeInTheDocument();
  });
});

describe('RawJsonEditor', () => {
  it('renders content in textarea', () => {
    const onChange = vi.fn();
    render(<RawJsonEditor content='{"key":"value"}' onChange={onChange} fileName="test.json" />);
    const textarea = screen.getByDisplayValue('{"key":"value"}');
    expect(textarea).toBeInTheDocument();
    expect(screen.getByText(/test.json/)).toBeInTheDocument();
  });

  it('calls onChange when content changes', () => {
    const onChange = vi.fn();
    render(<RawJsonEditor content='{"key":"value"}' onChange={onChange} fileName="test.json" />);
    const textarea = screen.getByDisplayValue('{"key":"value"}');
    fireEvent.change(textarea, { target: { value: '{"key":"new"}' } });
    expect(onChange).toHaveBeenCalledWith('{"key":"new"}');
  });

  it('shows line count', () => {
    const onChange = vi.fn();
    const content = 'line1\nline2\nline3';
    render(<RawJsonEditor content={content} onChange={onChange} fileName="test.json" />);
    expect(screen.getByText('3 lines')).toBeInTheDocument();
  });
});

describe('SchemaForm with field errors', () => {
  const defaultData = { id: 'test', title: 'Hello', count: 42, active: true };

  it('shows error text beneath fields with errors', () => {
    const fieldErrors = {
      id: [
        { path: 'id', message: 'ID is required', severity: 'error' as const, code: 'invalid_type' },
      ],
    };
    render(<SchemaForm data={defaultData} onChange={() => {}} fieldErrors={fieldErrors} />);
    expect(screen.getByText('ID is required')).toBeInTheDocument();
  });

  it('adds aria-invalid to errored fields', () => {
    const fieldErrors = {
      title: [
        {
          path: 'title',
          message: 'Title too short',
          severity: 'error' as const,
          code: 'too_small',
        },
      ],
    };
    render(<SchemaForm data={defaultData} onChange={() => {}} fieldErrors={fieldErrors} />);
    const input = screen.getByDisplayValue('Hello');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby');
  });
});

describe('JSONNodeEditor with field errors', () => {
  it('passes fieldErrors to SchemaForm', () => {
    const fieldErrors = {
      title: [
        { path: 'title', message: 'Required', severity: 'error' as const, code: 'invalid_type' },
      ],
    };
    render(
      <JSONNodeEditor
        data={{ type: 'lesson' }}
        onChange={() => {}}
        fileName="test.json"
        fieldErrors={fieldErrors}
      />,
    );
    expect(screen.getByText('Required')).toBeInTheDocument();
  });
});

describe('MarkdownEditor', () => {
  it('renders content in textarea', () => {
    const onChange = vi.fn();
    render(<MarkdownEditor content="# Hello" onChange={onChange} fileName="test.md" />);
    expect(screen.getByDisplayValue('# Hello')).toBeInTheDocument();
    expect(screen.getByText('test.md')).toBeInTheDocument();
  });

  it('shows preview by default', () => {
    const onChange = vi.fn();
    render(<MarkdownEditor content="# Hello" onChange={onChange} fileName="test.md" />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('toggles preview on button click', () => {
    const onChange = vi.fn();
    render(<MarkdownEditor content="# Hello" onChange={onChange} fileName="test.md" />);
    const toggleButton = screen.getByText('Hide Preview');
    fireEvent.click(toggleButton);
    expect(screen.getByText('Show Preview')).toBeInTheDocument();
  });

  it('shows line count', () => {
    const onChange = vi.fn();
    const content = 'line1\nline2';
    render(<MarkdownEditor content={content} onChange={onChange} fileName="test.md" />);
    expect(screen.getByText('Line 2')).toBeInTheDocument();
  });

  it('calls onChange when content changes', () => {
    const onChange = vi.fn();
    render(<MarkdownEditor content="# Hello" onChange={onChange} fileName="test.md" />);
    const textarea = screen.getByDisplayValue('# Hello');
    fireEvent.change(textarea, { target: { value: '# World' } });
    expect(onChange).toHaveBeenCalledWith('# World');
  });
});
