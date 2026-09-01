export function getFileCategory(filePath: string): string {
  if (filePath === 'package.json') return 'manifest';
  if (filePath === 'workflow.json') return 'workflow';
  if (filePath === 'rewards.json') return 'rewards';
  if (filePath === 'cards.json') return 'cards';
  if (filePath.startsWith('nodes/') || filePath.startsWith('nodes\\')) return 'nodes';
  if (filePath.startsWith('assets/') || filePath.startsWith('assets\\')) return 'assets';
  return 'other';
}
