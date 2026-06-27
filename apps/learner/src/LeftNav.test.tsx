import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LeftNav } from './LeftNav';

const { mockUseRuntimeOptional, mockNavigateToNode } = vi.hoisted(() => ({
  mockUseRuntimeOptional: vi.fn().mockReturnValue(null),
  mockNavigateToNode: vi.fn(),
}));

vi.mock('@open-edu/runtime', () => ({
  useRuntimeOptional: mockUseRuntimeOptional,
}));

function createMockRuntime() {
  return {
    loadedPackage: {
      manifest: {
        id: 'test-course',
        title: 'Test Course',
        entry: 'nodes/lesson-01.md',
        version: '1.0.0',
        author: 'Test',
      },
      workflow: {
        version: '0.1.0',
        routing: {
          'nodes/lesson-01.md': { onComplete: 'nodes/lesson-02.md' },
          'nodes/lesson-02.md': {},
        },
      },
      nodes: [
        {
          relativePath: 'nodes/lesson-01.md',
          path: '/test/nodes/lesson-01.md',
          content: '# Lesson 1',
          node: { type: 'lesson', title: 'Lesson 1' },
        },
        {
          relativePath: 'nodes/lesson-02.md',
          path: '/test/nodes/lesson-02.md',
          content: '# Lesson 2',
          node: { type: 'lesson', title: 'Lesson 2' },
        },
      ] as any,
      rootDir: '/test',
      assetPaths: [],
      rewards: null,
    },
    currentNodeId: 'nodes/lesson-01.md',
    visitedNodes: ['nodes/lesson-01.md'],
    navigateToNode: mockNavigateToNode,
  };
}

vi.mock('@open-edu/workflow', () => ({
  getOrderedNodes: vi.fn(() => ['nodes/lesson-01.md', 'nodes/lesson-02.md']),
}));

describe('LeftNav', () => {
  it('renders Section 1 navigation items', () => {
    render(<LeftNav currentView={{ view: 'home' }} onNavigate={vi.fn()} />);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('My Progress')).toBeInTheDocument();
    expect(screen.getByText('Course Catalog')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('marks the active view with aria-current="page"', () => {
    const { rerender } = render(<LeftNav currentView={{ view: 'home' }} onNavigate={vi.fn()} />);
    expect(screen.getByTestId('leftnav-home')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId('leftnav-catalog')).not.toHaveAttribute('aria-current');

    rerender(<LeftNav currentView={{ view: 'catalog' }} onNavigate={vi.fn()} />);
    expect(screen.getByTestId('leftnav-catalog')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId('leftnav-home')).not.toHaveAttribute('aria-current');
  });

  it('calls onNavigate when a nav item is clicked', () => {
    const onNavigate = vi.fn();
    render(<LeftNav currentView={{ view: 'home' }} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByText('Course Catalog'));
    expect(onNavigate).toHaveBeenCalledWith({ view: 'catalog' });
  });

  it('does not render Section 2 when not in course view', () => {
    render(<LeftNav currentView={{ view: 'home' }} onNavigate={vi.fn()} />);
    expect(screen.queryByTestId('course-step-list')).not.toBeInTheDocument();
    expect(screen.queryByTestId('leftnav-back-to-catalog')).not.toBeInTheDocument();
  });

  it('does not render Section 2 when in course view outside RuntimeProvider', () => {
    render(<LeftNav currentView={{ view: 'course', packageId: 'test' }} onNavigate={vi.fn()} />);
    expect(screen.queryByTestId('course-step-list')).not.toBeInTheDocument();
  });
});

describe('LeftNav with RuntimeProvider context', () => {
  const commonProps = {
    currentView: { view: 'course' as const, packageId: 'test' as const },
    onNavigate: vi.fn(),
    onBackToCatalog: vi.fn(),
  };

  beforeEach(() => {
    mockUseRuntimeOptional.mockReturnValue(createMockRuntime());
  });

  it('renders course step list and back to catalog in course view', () => {
    render(<LeftNav {...commonProps} />);
    expect(screen.getByTestId('course-step-list')).toBeInTheDocument();
    expect(screen.getByTestId('leftnav-back-to-catalog')).toBeInTheDocument();
  });

  it('renders step indicators with correct shapes for current, completed, and future steps', () => {
    render(<LeftNav {...commonProps} />);
    const currentStep = screen.getByTestId('step-nodes/lesson-01.md');
    expect(currentStep).toBeInTheDocument();
    expect(currentStep).toHaveAttribute('aria-current', 'step');

    const futureStep = screen.getByTestId('step-nodes/lesson-02.md');
    expect(futureStep).toBeInTheDocument();
    expect(futureStep).not.toHaveAttribute('aria-current');
  });

  it('dims non-active nav items when in course view', () => {
    render(<LeftNav {...commonProps} />);
    const catalogBtn = screen.getByTestId('leftnav-catalog');
    expect(catalogBtn.className).toContain('opacity-50');
  });

  it('disables future step buttons', () => {
    render(<LeftNav {...commonProps} />);
    const futureStep = screen.getByTestId('step-nodes/lesson-02.md');
    expect(futureStep).toBeDisabled();
  });

  it('back to catalog button has aria-label', () => {
    render(<LeftNav {...commonProps} />);
    const backBtn = screen.getByTestId('leftnav-back-to-catalog');
    expect(backBtn).toHaveAttribute('aria-label', 'Back to course catalog');
  });

  it('step buttons have descriptive aria-labels with state', () => {
    render(<LeftNav {...commonProps} />);
    const step1 = screen.getByTestId('step-nodes/lesson-01.md');
    expect(step1.getAttribute('aria-label')).toMatch(/Step 1:.*current/);
  });
});
