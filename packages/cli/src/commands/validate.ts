import { loadPackage } from '@open-edu/core';
import { formatValidationSuccess, formatValidationError, printMessages } from '../utils/format.js';

export async function validatePackage(packageDir: string): Promise<number> {
  try {
    const pkg = await loadPackage(packageDir);
    const messages = formatValidationSuccess(pkg);
    printMessages(messages);
    return 0;
  } catch (error) {
    const messages = formatValidationError(error);
    printMessages(messages);
    return 1;
  }
}
