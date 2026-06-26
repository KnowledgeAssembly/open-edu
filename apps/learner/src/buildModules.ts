import type { LoadedPackage } from '@open-edu/core';
import type { CourseTreeModule } from '@open-edu/runtime';

export function buildModules(pkg: LoadedPackage, activeNodeId?: string): CourseTreeModule[] {
  const nodes = pkg.nodes;
  if (nodes.length === 0) return [];

  const grouped: Record<string, CourseTreeModule> = {};
  const moduleOrder: string[] = [];

  for (const node of nodes) {
    const parts = node.relativePath.split('/');
    const isNested = parts.length > 1;
    const moduleKey = isNested ? parts[0]! : `__flat__${parts[0]!}`;

    if (!grouped[moduleKey]) {
      grouped[moduleKey] = {
        title: isNested ? parts[0]! : node.relativePath,
        lessons: [],
        isLocked: moduleOrder.length > 0,
      };
      moduleOrder.push(moduleKey);
    }
    grouped[moduleKey]!.lessons.push({
      id: node.relativePath,
      title: (node.node as { title?: string }).title ?? node.relativePath,
      isActive: node.relativePath === activeNodeId,
    });
  }

  if (moduleOrder.length > 0) {
    grouped[moduleOrder[0]!]!.isLocked = false;
  }

  return moduleOrder.map((key) => grouped[key]!);
}
