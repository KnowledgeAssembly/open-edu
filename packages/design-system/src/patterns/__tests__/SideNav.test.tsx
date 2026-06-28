import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SideNav } from '../SideNav.js';

describe('SideNav', () => {
  it('renders OpenEdu heading', () => {
    render(<SideNav />);
    expect(screen.getByText('OpenEdu')).toBeInTheDocument();
  });

  it('renders all navigation tabs', () => {
    render(<SideNav />);
    expect(screen.getByText('Course Overview')).toBeInTheDocument();
    expect(screen.getByText('Modules')).toBeInTheDocument();
    expect(screen.getByText('My Progress')).toBeInTheDocument();
    expect(screen.getByText('Bookmarks')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('sets first tab active by default', () => {
    render(<SideNav />);
    const overviewTab = screen.getByTestId('sidenav-tab-overview');
    expect(overviewTab.getAttribute('aria-current')).toBe('page');
  });

  it('clicking a tab activates it', () => {
    render(<SideNav />);
    const settingsTab = screen.getByTestId('sidenav-tab-settings');
    fireEvent.click(settingsTab);
    expect(settingsTab.getAttribute('aria-current')).toBe('page');

    const overviewTab = screen.getByTestId('sidenav-tab-overview');
    expect(overviewTab.getAttribute('aria-current')).toBeNull();
  });

  it('renders course title when provided', () => {
    render(<SideNav courseTitle="Introduction to JavaScript" />);
    expect(screen.getByText('Introduction to JavaScript')).toBeInTheDocument();
  });

  it('renders children in course section', () => {
    render(
      <SideNav courseTitle="Test">
        <div data-testid="child">child content</div>
      </SideNav>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('renders Resume Last Lesson button', () => {
    render(<SideNav />);
    expect(screen.getByTestId('sidenav-resume')).toBeInTheDocument();
  });

  it('Resume button calls onResumeLesson', () => {
    const onResumeLesson = vi.fn();
    render(<SideNav onResumeLesson={onResumeLesson} />);
    fireEvent.click(screen.getByTestId('sidenav-resume'));
    expect(onResumeLesson).toHaveBeenCalled();
  });

  it('has aria-label on aside', () => {
    render(<SideNav />);
    const aside = screen.getByTestId('side-nav');
    expect(aside.getAttribute('aria-label')).toBe('Course navigation');
  });

  it('calls onTabChange when a tab is clicked', () => {
    const onTabChange = vi.fn();
    render(<SideNav onTabChange={onTabChange} />);
    fireEvent.click(screen.getByTestId('sidenav-tab-settings'));
    expect(onTabChange).toHaveBeenCalledWith('settings');
  });

  it('uses controlled activeTab when provided', () => {
    render(<SideNav activeTab="settings" />);
    const settingsTab = screen.getByTestId('sidenav-tab-settings');
    expect(settingsTab.getAttribute('aria-current')).toBe('page');
    const overviewTab = screen.getByTestId('sidenav-tab-overview');
    expect(overviewTab.getAttribute('aria-current')).toBeNull();
  });

  it('uses defaultActiveTab when provided', () => {
    render(<SideNav defaultActiveTab="progress" />);
    const progressTab = screen.getByTestId('sidenav-tab-progress');
    expect(progressTab.getAttribute('aria-current')).toBe('page');
  });
});
