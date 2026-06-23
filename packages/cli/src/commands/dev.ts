import { loadPackage } from '@open-edu/core';
import { formatDevMessage, formatValidationError, printMessages } from '../utils/format';

export async function devPackage(packageDir: string): Promise<number> {
  try {
    const pkg = await loadPackage(packageDir);
    const messages = formatDevMessage(pkg);
    printMessages(messages);
    return 0;
  } catch (error) {
    const messages = formatValidationError(error);
    printMessages(messages);
    return 1;
  }
}
