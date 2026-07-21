import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import axe from 'axe-core';
import { RuntimeThemeProvider } from '@open-edu/runtime';
import { FontSizeProvider } from '@open-edu/design-system';
import { DownloadedCourseList } from '../components/DownloadedCourseList';
import type { StoredCourse } from '@open-edu/storage';

const mockCourses: StoredCourse[] = [
  {
    id: 'course-1',
    version: '1.0.0',
    manifest: { title: 'Math 101' },
    nodes: [],
    assets: [],
    downloadedAt: '2026-07-20T10:00:00Z',
  },
  {
    id: 'course-2',
    version: '2.0.0',
    manifest: { title: 'Science 101' },
    nodes: [],
    assets: [],
    downloadedAt: '2026-07-19T08:00:00Z',
  },
];

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <RuntimeThemeProvider themeId="lumina-scholastica">
      <FontSizeProvider>{ui}</FontSizeProvider>
    </RuntimeThemeProvider>,
  );
}

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

describe('DownloadedCourseList accessibility', () => {
  it('has no axe violations with courses', async () => {
    const { container } = renderWithProviders(
      <DownloadedCourseList courses={mockCourses} onDelete={vi.fn()} />,
    );
    await expectNoViolations(container);
  });

  it('has no axe violations in empty state', async () => {
    const { container } = renderWithProviders(<DownloadedCourseList courses={[]} />);
    await expectNoViolations(container);
  });
});
