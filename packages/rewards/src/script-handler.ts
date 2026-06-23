import { exec } from 'child_process';
import { promisify } from 'util';
import type { ScriptAction } from '@open-edu/schemas';
import type { RewardResult } from './types';

const execAsync = promisify(exec);

export async function handleScriptAction(action: ScriptAction): Promise<RewardResult> {
  try {
    const { stdout, stderr } = await execAsync(action.exec, { timeout: 30000 });
    const parts: string[] = [`Executed: ${action.exec.substring(0, 100)}`];
    if (stdout.trim()) parts.push(`stdout: ${stdout.trim()}`);
    if (stderr.trim()) parts.push(`stderr: ${stderr.trim()}`);
    return { success: true, action: 'script', detail: parts.join(' — ') };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      action: 'script',
      detail: `Script failed: ${message}`,
      error: err instanceof Error ? err : new Error(message),
    };
  }
}
