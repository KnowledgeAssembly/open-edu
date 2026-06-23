import { loadPackage } from '@open-edu/core';
import { startDevServer } from '@open-edu/dev-server';
import { formatValidationError, printMessages } from '../utils/format.js';

export async function devPackage(packageDir: string): Promise<number> {
  try {
    const pkg = await loadPackage(packageDir);
    console.log(`Starting dev server for "${pkg.manifest.title}" (${pkg.manifest.version})`);
    console.log(`  Nodes: ${pkg.nodes.length}`);
    console.log('');

    await startDevServer(packageDir);
    return 0;
  } catch (error) {
    const messages = formatValidationError(error);
    printMessages(messages);
    return 1;
  }
}
