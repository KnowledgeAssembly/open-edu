import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@open-edu/i18n';
import studioEn from '@open-edu/i18n/locales/en/studio.json';
import { LibraryView } from './LibraryView';
import type { StudioApi } from '../studioApi.js';
import type { LibraryEntry } from '../library/types.js';

function wrap(ui: React.ReactElement) {
  return (
    <I18nProvider locale="en" dictionaries={{ en: { studio: studioEn as Record<string, string> } }}>
      {ui}
    </I18nProvider>
  );
}

const courseEntry: LibraryEntry = {
  id: 'fractions',
  title: 'Fractions',
  kind: 'course',
  relativePath: 'fractions',
  version: '1.0.0',
  updatedAt: 100,
};

const unitEntry: LibraryEntry = {
  id: 'numbers-unit',
  title: 'Numbers unit',
  kind: 'unit',
  relativePath: 'units/numbers-unit',
  version: '1.0.0',
  updatedAt: 200,
};

function makeApi(overrides: Partial<StudioApi> = {}): StudioApi {
  return {
    getPackageDir: vi.fn(),
    validate: vi.fn(),
    getOutline: vi.fn(),
    saveOutlineOrder: vi.fn(),
    applyTemplate: vi.fn(),
    exportOep: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    getAiStatus: vi.fn(),
    generateFromNotes: vi.fn(),
    getLibrary: vi
      .fn()
      .mockResolvedValue({ workspace: '/workspace', entries: [courseEntry, unitEntry] }),
    openLibraryCourse: vi
      .fn()
      .mockResolvedValue({ success: true, packageDir: '/workspace/fractions' }),
    duplicateCourse: vi.fn().mockResolvedValue({ success: true, entry: courseEntry }),
    renameCourse: vi.fn().mockResolvedValue({ success: true, entry: courseEntry }),
    archiveCourse: vi.fn().mockResolvedValue({ success: true, archivedPath: 'archive/fractions' }),
    importCourseFolder: vi.fn(),
    createUnit: vi.fn(),
    exportUnitOep: vi.fn(),
    ...overrides,
  } as unknown as StudioApi;
}

function renderLibrary(
  overrides: {
    api?: StudioApi;
    onOpen?: (relativePath: string) => void;
    onCreateUnit?: () => void;
    onError?: (message: string) => void;
  } = {},
) {
  return render(
    wrap(
      <LibraryView
        api={overrides.api ?? makeApi()}
        onOpen={overrides.onOpen ?? (() => {})}
        onCreateUnit={overrides.onCreateUnit ?? (() => {})}
        onError={overrides.onError ?? (() => {})}
      />,
    ),
  );
}

describe('LibraryView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the workspace path', async () => {
    renderLibrary();
    expect(await screen.findByText('Workspace: /workspace')).toBeInTheDocument();
  });

  it('renders course and unit entries with kind badges', async () => {
    renderLibrary();
    expect(await screen.findByText('Fractions')).toBeInTheDocument();
    expect(screen.getByText('Numbers unit')).toBeInTheDocument();
    expect(screen.getByText('Course')).toBeInTheDocument();
    expect(screen.getByText('Unit')).toBeInTheDocument();
  });

  it('offers Open and Duplicate only for course rows, not unit rows', async () => {
    renderLibrary();
    await screen.findByText('Numbers unit');
    expect(screen.getAllByRole('button', { name: /^open$/i })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: /^duplicate$/i })).toHaveLength(1);
    expect(screen.getByRole('button', { name: /export unit .oep/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^rename$/i })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: /^archive$/i })).toHaveLength(2);
  });

  it('calls onOpen with the relative path when Open is clicked', async () => {
    const onOpen = vi.fn();
    renderLibrary({ onOpen });
    const openButtons = await screen.findAllByRole('button', { name: /open/i });
    await userEvent.click(openButtons[0]!);
    expect(onOpen).toHaveBeenCalledWith('fractions');
  });

  it('duplicates a course and refreshes the library', async () => {
    const api = makeApi();
    renderLibrary({ api });
    const duplicateButtons = await screen.findAllByRole('button', { name: /duplicate/i });
    await userEvent.click(duplicateButtons[0]!);
    expect(api.duplicateCourse).toHaveBeenCalledWith(
      'fractions',
      'fractions-copy',
      'Copy of Fractions',
    );
    expect(api.getLibrary).toHaveBeenCalledTimes(2);
  });

  it('renames a course after confirming the dialog', async () => {
    const api = makeApi();
    renderLibrary({ api });
    const renameButtons = await screen.findAllByRole('button', { name: /rename/i });
    await userEvent.click(renameButtons[0]!);
    expect(screen.getByText('Rename course')).toBeInTheDocument();
    const input = screen.getByLabelText(/new title/i);
    await userEvent.clear(input);
    await userEvent.type(input, 'Fractions 2');
    await userEvent.click(screen.getByRole('button', { name: /confirm/i }));
    expect(api.renameCourse).toHaveBeenCalledWith('fractions', 'Fractions 2');
    expect(api.getLibrary).toHaveBeenCalledTimes(2);
  });

  it('archives a course after confirming the dialog', async () => {
    const api = makeApi();
    renderLibrary({ api });
    const archiveButtons = await screen.findAllByRole('button', { name: /archive/i });
    await userEvent.click(archiveButtons[0]!);
    expect(screen.getByText('Archive this course?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /confirm/i }));
    expect(api.archiveCourse).toHaveBeenCalledWith('fractions');
    expect(api.getLibrary).toHaveBeenCalledTimes(2);
  });

  it('shows the empty state when the library has no entries', async () => {
    const api = makeApi({
      getLibrary: vi.fn().mockResolvedValue({ workspace: '/workspace', entries: [] }),
    });
    renderLibrary({ api });
    expect(await screen.findByText('No courses in this workspace yet.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /import folder/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create unit/i })).toBeInTheDocument();
  });

  it('calls onCreateUnit from the header Create unit button', async () => {
    const onCreateUnit = vi.fn();
    renderLibrary({ onCreateUnit });
    await userEvent.click(await screen.findByRole('button', { name: /create unit/i }));
    expect(onCreateUnit).toHaveBeenCalled();
  });

  it('opens the import dialog from the header Import button', async () => {
    renderLibrary();
    await userEvent.click(await screen.findByRole('button', { name: /import folder/i }));
    expect(await screen.findByText('Import a course folder')).toBeInTheDocument();
  });

  it('surfaces errors from the API via onError', async () => {
    const onError = vi.fn();
    const api = makeApi({
      getLibrary: vi.fn().mockRejectedValue(new Error('scan failed')),
    });
    renderLibrary({ api, onError });
    await screen.findByText('No courses in this workspace yet.');
    expect(onError).toHaveBeenCalledWith('scan failed');
  });
});
