import { describe, it, expect } from 'vitest';
import { MemoryWorkspace } from './memory-workspace.js';
import { createTransaction, type WorkspaceTransaction } from './transaction.js';
import { WorkspaceTransactionError } from './errors.js';
import type { CourseWorkspace } from './types.js';

const enc = (s: string) => new Uint8Array(new TextEncoder().encode(s));
const dec = (b: Uint8Array) => new TextDecoder().decode(b);

class FailingWorkspace implements CourseWorkspace {
  readonly inner = new MemoryWorkspace();
  failOnWrite: string | null = null;

  list = (p: string) => this.inner.list(p);
  exists = (p: string) => this.inner.exists(p);
  read = (p: string) => this.inner.read(p);
  readText = (p: string) => this.inner.readText(p);
  writeText = (p: string, c: string) => this.inner.writeText(p, c);
  delete = (p: string) => this.inner.delete(p);
  move = (f: string, t: string) => this.inner.move(f, t);
  copy = (f: string, t: string) => this.inner.copy(f, t);
  stat = (p: string) => this.inner.stat(p);

  async write(path: string, data: Uint8Array): Promise<void> {
    if (this.failOnWrite === path) {
      throw new Error(`injected write failure: ${path}`);
    }
    return this.inner.write(path, data);
  }
}

describe('WorkspaceTransaction', () => {
  it('commits a single-file write', async () => {
    const ws = new MemoryWorkspace();
    await ws.writeText('a.md', 'old');
    const tx = createTransaction(ws);
    tx.write('a.md', enc('new'));
    const result = await tx.commit();
    expect(result.success).toBe(true);
    expect(await ws.readText('a.md')).toBe('new');
    expect(result.changeSet.changes).toHaveLength(1);
    expect(result.changeSet.changes[0]!.operation).toBe('update');
    expect(dec(result.changeSet.changes[0]!.previousContent!)).toBe('old');
  });

  it('commits creates, updates, deletes and moves atomically', async () => {
    const ws = new MemoryWorkspace();
    await ws.writeText('a.md', 'a');
    await ws.writeText('b.md', 'b');
    await ws.writeText('nodes/x.md', 'x');
    const tx = createTransaction(ws, { source: 'ai', description: 'multi' });
    tx.write('c.md', enc('c'));
    tx.delete('b.md');
    tx.move('nodes/x.md', 'nodes/y.md');
    tx.write('nodes/y.md', enc('y2')); // overwrite moved file
    const result = await tx.commit();
    expect(result.success).toBe(true);
    expect(await ws.readText('c.md')).toBe('c');
    expect(await ws.exists('b.md')).toBe(false);
    expect(await ws.readText('nodes/y.md')).toBe('y2');
    // The overwrite after the move is modeled as a create (independently of
    // transaction ordering) plus the move entry.
    expect(result.changeSet.changes.map((ch) => ch.operation).sort()).toEqual([
      'create',
      'create',
      'delete',
      'move',
    ]);
  });

  it('restores canonical state when a mid-commit write fails', async () => {
    const ws = new FailingWorkspace();
    await ws.writeText('keep.md', 'keep');
    await ws.writeText('second.md', 'second');
    const tx = createTransaction(ws);
    tx.write('new1.md', enc('n1'));
    tx.write('new2.md', enc('n2'));
    ws.failOnWrite = 'new2.md';
    const result = await tx.commit();
    expect(result.success).toBe(false);
    expect(result.error).toContain('restored');
    // No partial canonical state: new1.md must not exist, keep.md untouched.
    expect(await ws.exists('new1.md')).toBe(false);
    expect(await ws.exists('new2.md')).toBe(false);
    expect(await ws.readText('keep.md')).toBe('keep');
    expect(await ws.readText('second.md')).toBe('second');
  });

  it('surfaces a prescribed error when a failing path also blocks restore', async () => {
    const ws = new FailingWorkspace();
    await ws.writeText('a.md', 'original');
    const tx = createTransaction(ws);
    tx.write('a.md', enc('changed'));
    ws.failOnWrite = 'a.md';
    await expect(tx.commit()).rejects.toBeInstanceOf(WorkspaceTransactionError);
    // The write never landed, so the canonical state still matches.
    expect(await ws.readText('a.md')).toBe('original');
  });

  it('rollback discards staged changes without touching the workspace', async () => {
    const ws = new MemoryWorkspace();
    await ws.writeText('a.md', 'a');
    const tx = createTransaction(ws);
    tx.write('b.md', enc('b'));
    tx.delete('a.md');
    await tx.rollback();
    expect(await ws.readText('a.md')).toBe('a');
    expect(await ws.exists('b.md')).toBe(false);
    const result = await tx.commit();
    expect(result.success).toBe(true);
    expect(result.changeSet.changes).toHaveLength(0);
  });

  it('reports validation failures before touching the workspace', async () => {
    const ws = new MemoryWorkspace();
    await ws.writeText('a.md', 'a');
    const tx = createTransaction(ws);
    tx.move('a.md', 'a.md/nested');
    const validation = await tx.validate();
    expect(validation.valid).toBe(false);
    const result = await tx.commit();
    expect(result.success).toBe(false);
    expect(await ws.readText('a.md')).toBe('a');
  });

  it('exposes binary-only write (no writeText on the transaction interface)', async () => {
    const ws = new MemoryWorkspace();
    const tx: WorkspaceTransaction = createTransaction(ws);
    expect('writeText' in tx).toBe(false);
    tx.write('bin.dat', new Uint8Array([1, 2, 3]));
    const result = await tx.commit();
    expect(result.success).toBe(true);
    expect(await ws.read('bin.dat')).toEqual(new Uint8Array([1, 2, 3]));
  });
});
