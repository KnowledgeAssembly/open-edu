import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RuntimeThemeProvider, themeIds } from '@open-edu/runtime';
import type { ThemeId } from '@open-edu/runtime';
import axe from 'axe-core';
import { FontSizeProvider } from '@open-edu/design-system';
import { CatalogPage } from '../CatalogPage';
import { HomePage } from '../HomePage';
import { ProgressDashboard } from '../ProgressDashboard';
import { SettingsPage } from '../SettingsPage';
import { CompanionProvider } from '../ai';
import { CourseExitWarningDialog } from '../CourseExitWarningDialog';
import { AppSidebar } from '@open-edu/design-system';
import type { PackageSummary } from '@open-edu/core';

vi.mock('../progressStorage', () => ({
  getAllProgress: vi.fn(() => Promise.resolve({})),
  getProgress: vi.fn(() => Promise.resolve(null)),
  saveProgress: vi.fn(() => Promise.resolve()),
}));

vi.mock('../badgesStorage', () => ({
  addBadge: vi.fn(),
  getBadges: vi.fn(() => Promise.resolve([])),
  getAllBadges: vi.fn(() => Promise.resolve({})),
}));

vi.mock('@open-edu/pwa-core', () => ({
  getInstallState: vi.fn().mockReturnValue({
    isInstallable: false,
    isInstalled: false,
    platform: 'desktop',
  }),
  promptInstall: vi.fn().mockResolvedValue({ outcome: 'dismissed' }),
  registerUpdateListener: vi.fn().mockResolvedValue(vi.fn()),
  skipWaiting: vi.fn().mockResolvedValue(undefined),
  getUpdateState: vi.fn().mockReturnValue({ updateAvailable: false, registration: null }),
  getOnlineStatus: vi.fn().mockReturnValue(true),
  onOnlineStatusChange: vi.fn().mockReturnValue(vi.fn()),
  getStorageUsage: vi.fn().mockReturnValue({ usage: 0, quota: 0 }),
}));

const mockBreakTimer = {
  mode: 'off' as const,
  setMode: vi.fn(),
};

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
  return render(
    <RuntimeThemeProvider themeId={themeId}>
      <FontSizeProvider>
        <CompanionProvider>{ui}</CompanionProvider>
      </FontSizeProvider>
    </RuntimeThemeProvider>,
  );
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
      <SettingsPage currentThemeId={themeId} onThemeChange={vi.fn()} breakTimer={mockBreakTimer} />,
      themeId,
    );
    await expectNoViolations(container);
  });

  it('AppSidebar has no axe violations', async () => {
    const { container } = renderWithTheme(
      <AppSidebar
        items={[
          { id: 'home', label: 'Home', icon: <span aria-hidden="true">🏠</span> },
          { id: 'catalog', label: 'Catalog', icon: <span aria-hidden="true">📚</span> },
        ]}
        currentItemId="home"
        onNavigate={vi.fn()}
      />,
      themeId,
    );
    await expectNoViolations(container);
  });

  it('CourseExitWarningDialog has no axe violations', async () => {
    const { container } = renderWithTheme(
      <CourseExitWarningDialog open onStay={vi.fn()} onLeave={vi.fn()} />,
      themeId,
    );
    await screen.findByRole('dialog');
    await expectNoViolations(container);
  });
});
