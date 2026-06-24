import { describe, it, expect, vi, afterEach } from 'vitest';
import type { LoadedPackage } from '@open-edu/core';
import { createRuntime } from './embed';

const mockPackage: LoadedPackage = {
  rootDir: '/mock',
  manifest: {
    id: 'mock-pkg',
    title: 'Mock Package',
    version: '1.0.0',
    author: 'Test Author',
    entry: 'nodes/start.md',
  },
  workflow: {
    routing: {
      'nodes/start.md': {
        onComplete: 'COMPLETED',
      },
    },
  },
  rewards: null,
  nodes: [
    {
      path: '/mock/nodes/start.md',
      relativePath: 'nodes/start.md',
      content: '# Hello',
      node: { type: 'lesson' },
    },
  ],
  assetPaths: [],
};

describe('createRuntime embed adapter', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('throws when container is not an HTMLElement', async () => {
    await expect(
      createRuntime({
        packageSource: mockPackage,
        container: null as unknown as HTMLElement,
      }),
    ).rejects.toThrow('must be an HTMLElement');
  });

  it('throws when container is detached from the DOM', async () => {
    const container = document.createElement('div');
    await expect(
      createRuntime({
        packageSource: mockPackage,
        container,
      }),
    ).rejects.toThrow('not attached to the DOM');
  });

  it('mounts into a valid DOM container and renders the package', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const handle = await createRuntime({
      packageSource: mockPackage,
      container,
    });

    await vi.waitFor(() => {
      expect(container.querySelector('.open-edu-runtime')).toBeTruthy();
    });
    handle.unmount();
  });

  it('throws when mounting on an already-mounted container', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const handle = await createRuntime({
      packageSource: mockPackage,
      container,
    });

    await expect(
      createRuntime({
        packageSource: mockPackage,
        container,
      }),
    ).rejects.toThrow('already mounted');

    handle.unmount();
  });

  it('unmount cleans up without leaking', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const handle = await createRuntime({
      packageSource: mockPackage,
      container,
    });

    await vi.waitFor(() => {
      expect(container.querySelector('.open-edu-runtime')).toBeTruthy();
    });
    handle.unmount();
    await vi.waitFor(() => {
      expect(container.innerHTML).toBe('');
    });
  });

  it('unmount is safe to call twice', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const handle = await createRuntime({
      packageSource: mockPackage,
      container,
    });

    handle.unmount();
    expect(() => handle.unmount()).not.toThrow();
  });

  it('unmount called before loading completes returns no-op handle', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const handlePromise = createRuntime({
      packageSource: mockPackage,
      container,
    });

    handlePromise.then((handle) => {
      handle.unmount();
    });

    const handle = await handlePromise;
    expect(() => handle.unmount()).not.toThrow();
  });

  it('getProgress returns null initially when no initialProgress is given', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const handle = await createRuntime({
      packageSource: mockPackage,
      container,
    });

    expect(handle.getProgress()).toBeNull();
    handle.unmount();
  });

  it('getProgress returns initialProgress when provided', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const initialProgress = {
      packageId: 'mock-pkg',
      packageVersion: '1.0.0',
      currentNodeId: 'nodes/start.md',
      visitedNodes: ['nodes/start.md'],
      scores: {},
      isCompleted: false,
      updatedAt: new Date().toISOString(),
    };

    const handle = await createRuntime({
      packageSource: mockPackage,
      container,
      initialProgress,
    });

    const progress = handle.getProgress();
    expect(progress).not.toBeNull();
    expect(progress!.packageId).toBe('mock-pkg');
    expect(progress!.currentNodeId).toBe('nodes/start.md');
    handle.unmount();
  });

  it('reset restarts from package entry', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const handle = await createRuntime({
      packageSource: mockPackage,
      container,
    });

    const beforeReset = handle.getProgress();
    expect(beforeReset).toBeNull();

    await handle.reset();

    expect(handle.getProgress()).toBeNull();
    await vi.waitFor(() => {
      expect(container.querySelector('.open-edu-runtime')).toBeTruthy();
    });
    handle.unmount();
  });

  it('onTelemetryEvent errors are caught and logged', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const handle = await createRuntime({
      packageSource: mockPackage,
      container,
      onTelemetryEvent: () => {
        throw new Error('telemetry error');
      },
    });

    expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('telemetry error'));

    consoleSpy.mockRestore();
    handle.unmount();
  });

  it('renders the package entry node', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const handle = await createRuntime({
      packageSource: mockPackage,
      container,
    });

    await vi.waitFor(() => {
      expect(container.textContent).toContain('Mock Package');
    });

    handle.unmount();
  });
});
