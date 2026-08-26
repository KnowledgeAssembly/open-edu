import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { PROTOCOL_API_VERSION } from '@open-edu/widget-sdk';
import type { ResolvedWidget, WidgetResolver } from '@open-edu/widgets';
import { DEFAULT_WIDGET_POLICY } from '@open-edu/schemas';
import type { WidgetManifest } from '@open-edu/schemas';
import type { CuratedWidget } from './curatedCatalog';
import { CommunityWidgetPreview } from './CommunityWidgetPreview';
import type { CommunityWidgetPreviewProps } from './CommunityWidgetPreview';

const MOCK_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function makeRegistryWidget(overrides: Partial<CuratedWidget> = {}): CuratedWidget {
  return {
    id: 'community.example.counter',
    name: 'Counter',
    source: 'registry',
    registryId: 'registry.example',
    trustTier: 'sandboxed',
    version: '1.0.0',
    integrity: 'sha256-abc123',
    ...overrides,
  };
}

const SANDBOX_MANIFEST: WidgetManifest = {
  id: 'community.example.counter',
  version: '1.0.0',
  apiVersion: 'open-edu.widget/1',
  artifact: {
    documentUrl: 'https://registry.example.com/counter.html',
    documentIntegrity: 'sha256-9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    sizeBytes: 1,
    format: 'self-contained-html',
  },
  publisher: { id: 'example', name: 'Example Publisher' },
  metadata: {},
  schemas: {},
  capabilities: [],
  accessibility: {},
  supportedThemes: ['light', 'dark'],
  reducedMotion: 'supported',
  compatibility: { runtime: 'open-edu' },
  distribution: { offline: false, cachePolicy: 'immutable' },
  status: 'verified',
};

function makeProps(
  overrides: Partial<CommunityWidgetPreviewProps> = {},
): CommunityWidgetPreviewProps {
  return {
    widget: makeRegistryWidget(),
    config: { prompt: 'Count to five' },
    policy: { ...DEFAULT_WIDGET_POLICY },
    catalogs: {},
    ...overrides,
  };
}

const SANDBOX_RESULT: ResolvedWidget = {
  ok: true,
  tier: 'sandboxed',
  widgetId: 'community.example.counter',
  version: '1.0.0',
  manifest: SANDBOX_MANIFEST,
  documentBytes: new ArrayBuffer(0),
  srcDoc: '<html></html>',
  grantedCapabilities: [],
};

function makeResolver(result: ResolvedWidget): WidgetResolver {
  return {
    normalize: vi.fn(),
    resolve: vi.fn().mockResolvedValue(result),
  } as unknown as WidgetResolver;
}

beforeEach(() => {
  vi.spyOn(crypto, 'randomUUID').mockReturnValue(MOCK_ID as ReturnType<typeof crypto.randomUUID>);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function envelope(
  type: string,
  sequence: number,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    apiVersion: PROTOCOL_API_VERSION,
    type,
    instanceId: MOCK_ID,
    nonce: MOCK_ID,
    sequence,
    payload: {},
    ...overrides,
  };
}

function dispatchMessage(data: unknown, origin = 'null') {
  const event = new MessageEvent('message', { data, origin });
  window.dispatchEvent(event);
}

describe('CommunityWidgetPreview', () => {
  it('renders a sandboxed iframe with allow-scripts and never allow-same-origin', async () => {
    const resolver = makeResolver(SANDBOX_RESULT);
    const { container } = render(<CommunityWidgetPreview {...makeProps({ resolver })} />);
    await waitFor(() => {
      expect(container.querySelector('iframe')).not.toBeNull();
    });
    const iframe = container.querySelector('iframe')!;
    const sandbox = iframe.getAttribute('sandbox') ?? '';
    expect(sandbox).toContain('allow-scripts');
    expect(sandbox).not.toContain('allow-same-origin');
  });

  it('resolves through the resolver exactly once before the adapter mounts', async () => {
    const resolver = makeResolver(SANDBOX_RESULT);
    const { container } = render(<CommunityWidgetPreview {...makeProps({ resolver })} />);

    const resolveSpy = resolver.resolve as ReturnType<typeof vi.fn>;

    expect(container.querySelector('iframe')).toBeNull();

    await waitFor(() => {
      expect(resolveSpy).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(container.querySelector('iframe')).not.toBeNull();
    });
  });

  it('never lets a complete from the preview reach course side effects', async () => {
    const resolver = makeResolver(SANDBOX_RESULT);
    const onComplete = vi.fn();
    const onStateSave = vi.fn();
    const { container } = render(
      <CommunityWidgetPreview
        {...makeProps({
          resolver,
          onComplete,
          onStateSave,
        })}
      />,
    );
    await waitFor(() => {
      expect(container.querySelector('iframe')).not.toBeNull();
    });

    const iframe = container.querySelector('iframe')!;
    fireEvent.load(iframe);

    act(() => {
      dispatchMessage(envelope('ready', 1));
    });
    act(() => {
      dispatchMessage(envelope('complete', 2, { payload: { score: 100, state: { done: true } } }));
    });

    expect(onComplete).not.toHaveBeenCalled();
    expect(onStateSave).not.toHaveBeenCalled();
  });

  it('shows the resolver failure reason and no iframe on integrity failure', async () => {
    const resolver = makeResolver({
      ok: false,
      failure: 'integrity',
      message: 'document-integrity-mismatch',
    });
    const { container, getByTestId } = render(
      <CommunityWidgetPreview {...makeProps({ resolver })} />,
    );
    await waitFor(() => {
      expect(getByTestId('community-preview-error')).toBeTruthy();
    });
    expect(container.querySelector('iframe')).toBeNull();
    expect(getByTestId('community-preview-error').textContent).toContain(
      'document-integrity-mismatch',
    );
  });

  it('shows a native note without an iframe for native-tier results', async () => {
    const resolver = makeResolver(
      (() => {
        const definition = { id: 'builtin.chart', version: '0.1.0' } as never;
        return {
          ok: true,
          tier: 'native',
          widgetId: 'builtin.chart',
          version: '0.1.0',
          definition,
          grantedCapabilities: [],
        } as ResolvedWidget;
      })(),
    );
    const { container, getByTestId } = render(
      <CommunityWidgetPreview {...makeProps({ resolver })} />,
    );
    await waitFor(() => {
      expect(getByTestId('community-preview-native')).toBeTruthy();
    });
    expect(container.querySelector('iframe')).toBeNull();
  });
});
