import { AppSidebar, type AppSidebarSection, type AppSidebarStepItem } from '@open-edu/design-system';
import { useRuntime } from '@open-edu/runtime';
import { getOrderedNodes } from '@open-edu/workflow';
import { useTranslation } from '@open-edu/i18n';

export function PreviewCourseSidebar(): JSX.Element | null {
  const { t } = useTranslation();
  const { loadedPackage, currentNodeId, visitedNodes, navigateToNode } = useRuntime();
  const workflow = loadedPackage.workflow;
  const entry = loadedPackage.manifest.entry;

  if (!workflow || !entry) return null;

  const orderedIds = getOrderedNodes(workflow, entry);
  if (orderedIds.length === 0) return null;

  const items: AppSidebarStepItem[] = orderedIds.map((nodeId) => {
    const node = loadedPackage.nodes.find((n) => n.relativePath === nodeId);
    const label = node?.node.title ?? nodeId.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
    let status: 'current' | 'completed' | 'future';
    if (nodeId === currentNodeId) status = 'current';
    else if (visitedNodes.includes(nodeId)) status = 'completed';
    else status = 'future';
    return { id: nodeId, label, status, onClick: () => navigateToNode(nodeId) };
  });

  const section: AppSidebarSection = { title: t('studio.preview.courseSteps'), items };

  return (
    <AppSidebar
      title={loadedPackage.manifest.title}
      items={[]}
      currentItemId=""
      onNavigate={() => {}}
      sections={[section]}
      defaultCollapsed={false}
    />
  );
}
