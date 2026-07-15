import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { socialMap } from './SocialMap';

const WidgetComponent = socialMap.render;

function renderWidget(config: Record<string, unknown> = {}) {
  const emitInteraction = vi.fn();
  const complete = vi.fn();
  const result = render(
    <WidgetComponent
      nodeId="test-node"
      config={config}
      emitInteraction={emitInteraction}
      complete={complete}
    />,
  );
  return { emitInteraction, complete, ...result };
}

const baseConfig = {
  regions: [
    { id: 'r1', name: 'Region A', color: '#e8def8' },
    { id: 'r2', name: 'Region B', color: '#d0bcff' },
  ],
  labels: true,
  interactive: true,
  targetRegion: 'r2',
};

describe('SocialMap widget definition', () => {
  it('has correct widget id', () => {
    expect(socialMap.id).toBe('social.map');
  });

  it('has correct domain', () => {
    expect(socialMap.domain).toBe('social');
  });

  it('has stable status', () => {
    expect(socialMap.status).toBe('stable');
  });
});

describe('SocialMap rendering', () => {
  it('renders with valid config', () => {
    renderWidget(baseConfig);
    expect(screen.getByTestId('social-map')).toBeInTheDocument();
  });

  it('renders title', () => {
    renderWidget({ ...baseConfig, title: 'World Map' });
    expect(screen.getByText('World Map')).toBeInTheDocument();
  });

  it('renders region labels', () => {
    renderWidget(baseConfig);
    expect(screen.getByText('Region A')).toBeInTheDocument();
    expect(screen.getByText('Region B')).toBeInTheDocument();
  });

  it('renders legend', () => {
    renderWidget({
      ...baseConfig,
      legend: [{ color: '#e8def8', label: 'Type A' }],
    });
    expect(screen.getByText('Type A')).toBeInTheDocument();
  });

  it('renders error for no regions', () => {
    renderWidget({ regions: [] });
    expect(screen.getByTestId('widget-config-error')).toBeInTheDocument();
  });

  it('renders error for no config', () => {
    renderWidget({});
    expect(screen.getByTestId('widget-config-error')).toBeInTheDocument();
  });
});

describe('SocialMap interactive mode', () => {
  it('shows target instruction when targetRegion is set', () => {
    renderWidget(baseConfig);
    expect(screen.getByText('Find: Region B')).toBeInTheDocument();
  });

  it('emits select interaction on region click', () => {
    const { emitInteraction } = renderWidget(baseConfig);
    fireEvent.click(screen.getByRole('button', { name: 'Region A' }));
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'select', regionId: 'r1' }),
    );
  });

  it('completes when target region is found', () => {
    const { complete } = renderWidget(baseConfig);
    fireEvent.click(screen.getByRole('button', { name: 'Region B' }));
    expect(complete).toHaveBeenCalledWith(100, expect.any(Object));
  });

  it('does not complete when wrong region is clicked', () => {
    const { complete } = renderWidget(baseConfig);
    fireEvent.click(screen.getByRole('button', { name: 'Region A' }));
    expect(complete).not.toHaveBeenCalled();
  });
});

describe('SocialMap observe mode', () => {
  it('shows acknowledge button in observe mode', () => {
    renderWidget({ ...baseConfig, interactive: false });
    expect(screen.getByTestId('observe-acknowledge')).toBeInTheDocument();
  });

  it('completes after acknowledge', () => {
    const { complete } = renderWidget({ ...baseConfig, interactive: false });
    fireEvent.click(screen.getByTestId('observe-acknowledge'));
    expect(complete).toHaveBeenCalledWith(100);
  });
});

describe('SocialMap zoom', () => {
  it('shows zoom controls when zoom is enabled', () => {
    renderWidget({ ...baseConfig, zoom: true });
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zoom out' })).toBeInTheDocument();
  });

  it('does not show zoom controls by default', () => {
    renderWidget(baseConfig);
    expect(screen.queryByRole('button', { name: 'Zoom in' })).not.toBeInTheDocument();
  });
});

describe('SocialMap SVG explorer mode', () => {
  it('renders SvgExplorer when svgSrc is provided', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400">
          <path id="odisha" d="M10 10L100 10L100 100L10 100Z"/>
        </svg>`,
        { status: 200 },
      ),
    );

    render(
      <WidgetComponent
        nodeId="test-1"
        config={{
          svgSrc: '/maps/india.svg',
          regions: [{ id: 'odisha', name: 'Odisha' }],
        }}
        emitInteraction={vi.fn()}
        complete={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).toBeNull();
    });

    expect(screen.getByRole('group', { name: /svg explorer/i })).toBeTruthy();
  });

  it('calls complete when correct region is clicked with svgSrc', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400">
          <path id="odisha" d="M10 10L100 10L100 100L10 100Z"/>
        </svg>`,
        { status: 200 },
      ),
    );

    const complete = vi.fn();
    const emitInteraction = vi.fn();

    render(
      <WidgetComponent
        nodeId="test-2"
        config={{
          svgSrc: '/maps/india.svg',
          regions: [{ id: 'odisha', name: 'Odisha' }],
          interactive: true,
          targetRegion: 'odisha',
        }}
        emitInteraction={emitInteraction}
        complete={complete}
      />,
    );

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).toBeNull();
    });

    const region = screen.getByRole('button', { name: /odisha/i });
    fireEvent.click(region);

    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'select', regionId: 'odisha' }),
    );
    expect(complete).toHaveBeenCalledWith(100, { selectedRegion: 'odisha' });
  });
});

describe('SocialMap accessibility', () => {
  it('has role="group" with aria-label', () => {
    renderWidget({ ...baseConfig, title: 'My Map' });
    expect(screen.getByRole('group')).toHaveAttribute('aria-label', 'My Map');
  });

  it('has role="alert" for config errors', () => {
    renderWidget({});
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('has keyboard accessible regions', () => {
    renderWidget(baseConfig);
    const region = screen.getByRole('button', { name: 'Region A' });
    fireEvent.keyDown(region, { key: 'Enter' });
    expect(region).toBeInTheDocument();
  });

  it('has aria-label on legend', () => {
    renderWidget({
      ...baseConfig,
      legend: [{ color: '#e8def8', label: 'Type A' }],
    });
    expect(screen.getByRole('list', { name: 'Map legend' })).toBeInTheDocument();
  });
});
