import { describe, it, expect, vi } from 'vitest';
import { handleScriptAction } from './script-handler';
import type { ScriptAction } from '@open-edu/schemas';

vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

import { exec } from 'child_process';
const mockExec = vi.mocked(exec);

describe('handleScriptAction', () => {
  it('should execute a script successfully', async () => {
    mockExec.mockImplementation((_cmd: string, _opts: any, cb?: any) => {
      if (cb) cb(null, { stdout: 'success', stderr: '' });
      return { stdout: 'success', stderr: '' } as any;
    });

    const action: ScriptAction = { action: 'script', exec: 'echo hello' };
    const result = await handleScriptAction(action);
    expect(result.success).toBe(true);
    expect(result.detail).toContain('echo hello');
  });

  it('should handle script failure', async () => {
    mockExec.mockImplementation((_cmd: string, _opts: any, cb?: any) => {
      if (cb) cb(new Error('Command failed: exit code 1'), { stdout: '', stderr: 'error' });
      return { stdout: '', stderr: 'error' } as any;
    });

    const action: ScriptAction = { action: 'script', exec: 'invalid-command' };
    const result = await handleScriptAction(action);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
