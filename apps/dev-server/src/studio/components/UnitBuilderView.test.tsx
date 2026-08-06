import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@open-edu/i18n';
import studioEn from '@open-edu/i18n/locales/en/studio.json';
import { UnitBuilderView } from './UnitBuilderView';
import type { StudioApi } from '../studioApi.js';
import type { LibraryEntry } from '../library/types.js';

function wrap(ui: React.ReactElement) {
  return (
    <I18nProvider locale="en" dictionaries={{ en: { studio: studioEn as Record<string, string> } }}>
      {ui}
    </I18nProvider>
  );
}

const courseA: LibraryEntry = {
  id: 'fractions',
  title: 'Fractions',
  kind: 'course',
  relativePath: 'fractions',
  version: '1.0.0',
  updatedAt: 100,
};

const courseB: LibraryEntry = {
  id: 'decimals',
  title: 'Decimals',
  kind: 'course',
  relativePath: 'decimals',
  version: '1.0.0',
  updatedAt: 110,
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
      .mockResolvedValue({ workspace: '/workspace', entries: [courseA, courseB, unitEntry] }),
    openLibraryCourse: vi.fn(),
    duplicateCourse: vi.fn(),
    renameCourse: vi.fn(),
    archiveCourse: vi.fn(),
    importCourseFolder: vi.fn(),
    createUnit: vi.fn().mockResolvedValue({
      success: true,
      entry: {
        id: 'my-unit',
        title: 'My unit',
        kind: 'unit',
        relativePath: 'units/my-unit',
        version: '1.0.0',
        updatedAt: 300,
      },
    }),
    exportUnitOep: vi.fn(),
    ...overrides,
  } as unknown as StudioApi;
}

function renderBuilder(
  overrides: {
    api?: StudioApi;
    onCreated?: (entry: LibraryEntry) => void;
    onError?: (message: string) => void;
  } = {},
) {
  return render(
    wrap(
      <UnitBuilderView
        api={overrides.api ?? makeApi()}
        onCreated={overrides.onCreated ?? (() => {})}
        onError={overrides.onError ?? (() => {})}
      />,
    ),
  );
}

async function selectCourse(title: string) {
  await userEvent.click(await screen.findByRole('checkbox', { name: title }));
}

describe('UnitBuilderView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders only courses and filters out units', async () => {
    renderBuilder();
    expect(await screen.findByText('Fractions')).toBeInTheDocument();
    expect(screen.getByText('Decimals')).toBeInTheDocument();
    expect(screen.queryByText('Numbers unit')).not.toBeInTheDocument();
    expect(screen.getAllByText('Course')).toHaveLength(2);
  });

  it('keeps the create button disabled until a name and at least two courses are selected', async () => {
    renderBuilder();
    await screen.findByText('Fractions');
    const createButton = screen.getByRole('button', { name: /create unit/i });
    expect(createButton).toBeDisabled();

    await userEvent.type(screen.getByRole('textbox', { name: /unit name/i }), 'My unit');
    await selectCourse('Fractions');
    expect(createButton).toBeDisabled();

    await selectCourse('Decimals');
    expect(createButton).toBeEnabled();
  });

  it('creates a unit with the chosen courses and calls onCreated', async () => {
    const api = makeApi();
    const onCreated = vi.fn();
    renderBuilder({ api, onCreated });
    await screen.findByText('Fractions');
    await userEvent.type(screen.getByRole('textbox', { name: /unit name/i }), 'My unit');
    await selectCourse('Fractions');
    await selectCourse('Decimals');
    await userEvent.click(screen.getByRole('button', { name: /create unit/i }));
    expect(api.createUnit).toHaveBeenCalledWith('My unit', ['fractions', 'decimals']);
    expect(onCreated).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'my-unit', title: 'My unit', kind: 'unit' }),
    );
  });

  it('shows a hint when fewer than two courses are selected', async () => {
    renderBuilder();
    await screen.findByText('Fractions');
    await selectCourse('Fractions');
    expect(screen.getByText('Pick at least two courses.')).toBeInTheDocument();
  });

  it('shows a hint when more than five courses are selected', async () => {
    const sixCourses: LibraryEntry[] = Array.from({ length: 6 }, (_, index) => ({
      id: `course-${index}`,
      title: `Course ${index + 1}`,
      kind: 'course',
      relativePath: `course-${index}`,
      version: '1.0.0',
      updatedAt: 100 + index,
    }));
    const api = makeApi({
      getLibrary: vi.fn().mockResolvedValue({ workspace: '/workspace', entries: sixCourses }),
    });
    renderBuilder({ api });
    for (let index = 0; index < 6; index += 1) {
      await selectCourse(`Course ${index + 1}`);
    }
    expect(screen.getByText('Pick up to five courses.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create unit/i })).toBeDisabled();
  });

  it('shows an empty state when the workspace has no courses', async () => {
    const api = makeApi({
      getLibrary: vi.fn().mockResolvedValue({ workspace: '/workspace', entries: [] }),
    });
    renderBuilder({ api });
    expect(
      await screen.findByText('Create or import at least two courses first.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('surfaces errors from the API via onError', async () => {
    const onError = vi.fn();
    const api = makeApi({
      getLibrary: vi.fn().mockRejectedValue(new Error('scan failed')),
    });
    renderBuilder({ api, onError });
    await screen.findByText('Create or import at least two courses first.');
    expect(onError).toHaveBeenCalledWith('scan failed');
  });
});
