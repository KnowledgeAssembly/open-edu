import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { RuntimeThemeProvider, themeIds } from '@open-edu/runtime';
import type { ThemeId } from '@open-edu/runtime';
import axe from 'axe-core';
import { CatalogPage } from '../CatalogPage';
import { HomePage } from '../HomePage';
import { ProgressDashboard } from '../ProgressDashboard';
import { SettingsPage } from '../SettingsPage';
import { LeftNav } from '../LeftNav';
import type { PackageSummary } from '@open-edu/core';

vi.mock('../progressStorage', () => ({
  getAllProgress: vi.fn(() => ({})),
  getProgress: vi.fn(() => null),
  saveProgress: vi.fn(),
}));

vi.mock('virtual:edu-data', () => ({
  catalogPackages: [],
  packageEntries: {},
}));

const samplePackages: PackageSummary[] = [
  {
    manifest: {
      id: 'course-1',
      title: 'Course One',
      version: '1.0.0',
      author: 'Author One',
      entry: 'nodes/lesson-01.md',
    },
    nodeCount: 3,
    availableBadges: 1,
    rootDir: '/test/courses/course-1',
  },
];

function renderWithTheme(ui: React.ReactElement, themeId: ThemeId) {
  return render(<RuntimeThemeProvider themeId={themeId}>{ui}</RuntimeThemeProvider>);
}

const themes = themeIds as readonly ThemeId[];

describe.each(themes)('Accessibility in %s theme', (themeId) => {
  async function expectNoViolations(container: HTMLElement) {
    const result = await axe.run(container);
    if (result.violations.length > 0) {
      const details = result.violations.map(
        (v: { id: string; help: string; nodes: Array<{ html: string }> }) =>
          `\n  [${v.id}] ${v.help}\n    ${v.nodes.map((n) => n.html).join('\n    ')}`,
      );
      expect(result.violations, details.join('')).toHaveLength(0);
    }
  }

  it('CatalogPage has no axe violations', async () => {
    const { container } = renderWithTheme(
      <CatalogPage packages={samplePackages} onStartCourse={vi.fn()} />,
      themeId,
    );
    await expectNoViolations(container);
  });

  it('HomePage has no axe violations', async () => {
    const { container } = renderWithTheme(<HomePage onNavigate={vi.fn()} />, themeId);
    await expectNoViolations(container);
  });

  it('ProgressDashboard has no axe violations', async () => {
    const { container } = renderWithTheme(<ProgressDashboard onNavigate={vi.fn()} />, themeId);
    await expectNoViolations(container);
  });

  it('SettingsPage has no axe violations', async () => {
    const { container } = renderWithTheme(
      <SettingsPage currentThemeId={themeId} onThemeChange={vi.fn()} />,
      themeId,
    );
    await expectNoViolations(container);
  });

  it('LeftNav has no axe violations', async () => {
    const { container } = renderWithTheme(
      <LeftNav currentView={{ view: 'home' }} onNavigate={vi.fn()} />,
      themeId,
    );
    await expectNoViolations(container);
  });
});
