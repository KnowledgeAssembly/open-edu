import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@open-edu/i18n';
import studioEn from '@open-edu/i18n/locales/en/studio.json';
import { ImportCourseDialog } from './ImportCourseDialog';
import type { StudioApi } from '../studioApi.js';
import type { LibraryEntry } from '../library/types.js';

function wrap(ui: React.ReactElement) {
  return (
    <I18nProvider locale="en" dictionaries={{ en: { studio: studioEn as Record<string, string> } }}>
      {ui}
    </I18nProvider>
  );
}

const importedEntry: LibraryEntry = {
  id: 'imported',
  title: 'Imported',
  kind: 'course',
  relativePath: 'imported',
  version: '1.0.0',
  updatedAt: 1,
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
    getLibrary: vi.fn(),
    openLibraryCourse: vi.fn(),
    duplicateCourse: vi.fn(),
    renameCourse: vi.fn(),
    archiveCourse: vi.fn(),
    importCourseFolder: vi.fn().mockResolvedValue({ success: true, entry: importedEntry }),
    createUnit: vi.fn(),
    exportUnitOep: vi.fn(),
    ...overrides,
  } as unknown as StudioApi;
}

function renderDialog(
  overrides: {
    api?: StudioApi;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onImported?: () => void;
    onError?: (message: string) => void;
  } = {},
) {
  const props = {
    api: overrides.api ?? makeApi(),
    open: overrides.open ?? true,
    onOpenChange: overrides.onOpenChange ?? (() => {}),
    onImported: overrides.onImported ?? (() => {}),
    onError: overrides.onError ?? (() => {}),
  };
  return render(wrap(<ImportCourseDialog {...props} />));
}

describe('ImportCourseDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the title and help text', () => {
    renderDialog();
    expect(screen.getByText('Import a course folder')).toBeInTheDocument();
    expect(
      screen.getByText('Choose a folder that already contains an OpenEdu package.json.'),
    ).toBeInTheDocument();
  });

  it('disables Confirm while the path is empty', () => {
    renderDialog();
    const confirm = screen.getByRole('button', { name: /confirm/i });
    expect(confirm).toBeDisabled();
  });

  it('calls importCourseFolder with the typed path and reports success', async () => {
    const api = makeApi();
    const onImported = vi.fn();
    renderDialog({ api, onImported });
    await userEvent.type(screen.getByLabelText(/folder that already contains/i), '/tmp/my-course');
    const confirm = screen.getByRole('button', { name: /confirm/i });
    expect(confirm).toBeEnabled();
    await userEvent.click(confirm);
    expect(api.importCourseFolder).toHaveBeenCalledWith('/tmp/my-course');
    expect(await screen.findByText('Imported')).toBeInTheDocument();
    expect(onImported).toHaveBeenCalled();
  });

  it('shows the API error message and does not call onImported on failure', async () => {
    const api = makeApi({
      importCourseFolder: vi.fn().mockRejectedValue(new Error('Not a package')),
    });
    const onImported = vi.fn();
    renderDialog({ api, onImported });
    await userEvent.type(screen.getByLabelText(/folder that already contains/i), '/tmp/nope');
    await userEvent.click(screen.getByRole('button', { name: /confirm/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Not a package');
    expect(onImported).not.toHaveBeenCalled();
  });

  it('closes the dialog when canceled', async () => {
    const onOpenChange = vi.fn();
    renderDialog({ onOpenChange });
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
