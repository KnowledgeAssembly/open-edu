import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppSidebar } from '../AppSidebar.js';
import { checkAccessibility } from '@open-edu/design-system/test-utils';

const navItems = [
  { id: 'home', label: 'Home', icon: <span data-testid="icon-home">🏠</span> },
  { id: 'catalog', label: 'Catalog', icon: <span data-testid="icon-catalog">📚</span> },
];

const sections = [
  {
    title: 'Module 1',
    items: [
      { id: 'step1', label: 'Introduction', status: 'completed' as const },
      { id: 'step2', label: 'Core Concepts', status: 'current' as const },
      { id: 'step3', label: 'Advanced', status: 'future' as const, onClick: vi.fn() },
    ],
  },
];

describe('AppSidebar', () => {
  it('renders title and subtitle', () => {
    render(<AppSidebar items={navItems} currentItemId="home" onNavigate={() => {}} />);
    expect(screen.getByText('OpenEdu')).toBeInTheDocument();
    expect(screen.getByText('Interactive learning platform')).toBeInTheDocument();
  });

  it('renders nav items', () => {
    render(<AppSidebar items={navItems} currentItemId="home" onNavigate={() => {}} />);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Catalog')).toBeInTheDocument();
  });

  it('highlights current nav item', () => {
    render(<AppSidebar items={navItems} currentItemId="catalog" onNavigate={() => {}} />);
    const catalogBtn = screen.getByTestId('appsidebar-nav-catalog');
    expect(catalogBtn).toHaveAttribute('aria-current', 'page');
    const homeBtn = screen.getByTestId('appsidebar-nav-home');
    expect(homeBtn).not.toHaveAttribute('aria-current');
  });

  it('calls onNavigate when nav item clicked', () => {
    const onNavigate = vi.fn();
    render(<AppSidebar items={navItems} currentItemId="home" onNavigate={onNavigate} />);
    fireEvent.click(screen.getByTestId('appsidebar-nav-catalog'));
    expect(onNavigate).toHaveBeenCalledWith('catalog');
  });

  it('applies hover tint only to non-selected nav items', () => {
    render(<AppSidebar items={navItems} currentItemId="catalog" onNavigate={() => {}} />);
    const catalogBtn = screen.getByTestId('appsidebar-nav-catalog');
    const homeBtn = screen.getByTestId('appsidebar-nav-home');
    expect(catalogBtn.className).not.toContain('hover:bg-surface-variant/30');
    expect(homeBtn.className).toContain('hover:bg-surface-variant/30');
  });

  it('applies hover tint only to non-current step items', () => {
    render(
      <AppSidebar
        items={navItems}
        currentItemId="home"
        onNavigate={() => {}}
        sections={sections}
      />,
    );
    const currentBtn = screen.getByTestId('step-step2');
    const completedBtn = screen.getByTestId('step-step1');
    expect(currentBtn.className).not.toContain('hover:bg-surface-variant/30');
    expect(completedBtn.className).toContain('hover:bg-surface-variant/30');
  });

  it('renders course step sections', () => {
    render(
      <AppSidebar
        items={navItems}
        currentItemId="home"
        onNavigate={() => {}}
        sections={sections}
      />,
    );
    expect(screen.getByText('Module 1')).toBeInTheDocument();
    expect(screen.getByText('Introduction')).toBeInTheDocument();
    expect(screen.getByText('Core Concepts')).toBeInTheDocument();
    expect(screen.getByText('Advanced')).toBeInTheDocument();
  });

  it('disables future step buttons', () => {
    render(
      <AppSidebar
        items={navItems}
        currentItemId="home"
        onNavigate={() => {}}
        sections={sections}
      />,
    );
    const advancedBtn = screen.getByTestId('step-step3');
    expect(advancedBtn).toBeDisabled();
  });

  it('renders back button when onBack provided', () => {
    const onBack = { label: 'Back to Catalog', onClick: vi.fn() };
    render(
      <AppSidebar items={navItems} currentItemId="home" onNavigate={() => {}} onBack={onBack} />,
    );
    expect(screen.getByText('Back to Catalog')).toBeInTheDocument();
  });

  it('back button calls onBack.onClick', () => {
    const onBack = { label: 'Back', onClick: vi.fn() };
    render(
      <AppSidebar items={navItems} currentItemId="home" onNavigate={() => {}} onBack={onBack} />,
    );
    fireEvent.click(screen.getByTestId('appsidebar-back'));
    expect(onBack.onClick).toHaveBeenCalled();
  });

  it('collapses and expands via toggle', () => {
    render(<AppSidebar items={navItems} currentItemId="home" onNavigate={() => {}} />);
    const toggle = screen.getByLabelText('Collapse sidebar');
    expect(screen.getByText('Home')).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(screen.queryByText('Home')).toBeNull();
    expect(screen.getByLabelText('Expand sidebar')).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(screen.getByText('Home')).toBeInTheDocument();
  });

  it('hides back button when collapsed', () => {
    const onBack = { label: 'Back', onClick: vi.fn() };
    render(
      <AppSidebar
        items={navItems}
        currentItemId="home"
        onNavigate={() => {}}
        onBack={onBack}
        defaultCollapsed
      />,
    );
    expect(screen.queryByText('Back')).toBeNull();
  });

  it('calls onCollapseChange when toggled', () => {
    const onCollapseChange = vi.fn();
    render(
      <AppSidebar
        items={navItems}
        currentItemId="home"
        onNavigate={() => {}}
        onCollapseChange={onCollapseChange}
      />,
    );
    fireEvent.click(screen.getByLabelText('Collapse sidebar'));
    expect(onCollapseChange).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getByLabelText('Expand sidebar'));
    expect(onCollapseChange).toHaveBeenCalledWith(false);
  });

  it('respects controlled collapsed prop', () => {
    const { rerender } = render(
      <AppSidebar items={navItems} currentItemId="home" onNavigate={() => {}} collapsed />,
    );
    expect(screen.queryByText('Home')).toBeNull();

    rerender(
      <AppSidebar items={navItems} currentItemId="home" onNavigate={() => {}} collapsed={false} />,
    );
    expect(screen.getByText('Home')).toBeInTheDocument();
  });

  it('has aria-label on aside', () => {
    render(<AppSidebar items={navItems} currentItemId="home" onNavigate={() => {}} />);
    expect(screen.getByTestId('app-sidebar')).toHaveAttribute('aria-label', 'Main navigation');
  });

  it('has no accessibility violations', async () => {
    await checkAccessibility(
      <AppSidebar items={navItems} currentItemId="home" onNavigate={() => {}} />,
    );
  });

  describe('logo', () => {
    it('renders logo instead of title when provided', () => {
      render(
        <AppSidebar
          items={navItems}
          currentItemId="home"
          onNavigate={() => {}}
          logo={<span data-testid="sidebar-logo">Custom Logo</span>}
        />,
      );
      expect(screen.getByTestId('sidebar-logo')).toBeInTheDocument();
      expect(screen.getByText('Custom Logo')).toBeInTheDocument();
      expect(screen.queryByText('OpenEdu')).toBeNull();
    });

    it('hides expanded logo when collapsed', () => {
      render(
        <AppSidebar
          items={navItems}
          currentItemId="home"
          onNavigate={() => {}}
          logo={<span data-testid="sidebar-logo">Custom Logo</span>}
          defaultCollapsed
        />,
      );
      expect(screen.queryByTestId('sidebar-logo')).toBeNull();
    });

    it('shows collapsed logo when collapsed and logoCollapsed provided', () => {
      render(
        <AppSidebar
          items={navItems}
          currentItemId="home"
          onNavigate={() => {}}
          logo={<span data-testid="sidebar-logo">Expanded</span>}
          logoCollapsed={<span data-testid="sidebar-logo-collapsed">Collapsed</span>}
          defaultCollapsed
        />,
      );
      expect(screen.queryByTestId('sidebar-logo')).toBeNull();
      expect(screen.getByTestId('sidebar-logo-collapsed')).toBeInTheDocument();
      expect(screen.getByText('Collapsed')).toBeInTheDocument();
    });

    it('shows OE text when collapsed without logo or logoCollapsed', () => {
      render(
        <AppSidebar items={navItems} currentItemId="home" onNavigate={() => {}} defaultCollapsed />,
      );
      expect(screen.getByText('OE')).toBeInTheDocument();
    });

    it('shows expanded logo when not collapsed', () => {
      render(
        <AppSidebar
          items={navItems}
          currentItemId="home"
          onNavigate={() => {}}
          logo={<span data-testid="sidebar-logo">Expanded</span>}
          logoCollapsed={<span data-testid="sidebar-logo-collapsed">Collapsed</span>}
        />,
      );
      expect(screen.getByTestId('sidebar-logo')).toBeInTheDocument();
      expect(screen.queryByTestId('sidebar-logo-collapsed')).toBeNull();
    });
  });
});
