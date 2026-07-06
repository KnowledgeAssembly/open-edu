import { useMemo } from 'react';
import type { PackageSummary, LoadedPackage } from '@open-edu/core';
import { getOrderedNodes } from '@open-edu/workflow';
import { type AppView } from './AppShell';
import { getAllProgress } from './progressStorage';
import { getAllBadges } from './badgesStorage';
import {
  Button,
  EmptyState,
  PageHeader,
  ProgressCard,
  StatsSummary,
  SectionDivider,
} from '@open-edu/design-system';
import { BookOpen, TrendingUp, Award } from 'lucide-react';

export interface ProgressDashboardProps {
  onNavigate: (view: AppView) => void;
  catalogPackages?: PackageSummary[];
  packageEntries?: Record<string, LoadedPackage>;
}

function relativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} minute${mins > 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
}

function humanizeNodeId(nodeId: string): string {
  return nodeId.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
}

export function ProgressDashboard({
  onNavigate,
  catalogPackages = [],
  packageEntries = {},
}: ProgressDashboardProps): JSX.Element {
  const allProgress = getAllProgress();
  const allBadges = getAllBadges();
  const entries = Object.entries(allProgress);

  const nodeTitleMap = useMemo(() => {
    const map: Record<string, string> = {};
    Object.values(packageEntries).forEach((pkg) => {
      pkg.nodes.forEach((n) => {
        const title = n.node.title;
        if (title) map[n.relativePath] = title;
      });
    });
    return map;
  }, [packageEntries]);

  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => {
      const aTime = a[1].updatedAt ? new Date(a[1].updatedAt).getTime() : 0;
      const bTime = b[1].updatedAt ? new Date(b[1].updatedAt).getTime() : 0;
      if (aTime !== bTime) return bTime - aTime;
      if (a[1].isCompleted !== b[1].isCompleted) return a[1].isCompleted ? 1 : -1;
      return 0;
    });
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className="p-xl mx-auto max-w-4xl" data-testid="progress-dashboard">
        <h1 className="text-h1 font-display text-on-surface mb-lg">My Progress</h1>
        <EmptyState
          variant="no-progress"
          heading="Your learning journey starts here!"
          description="Begin a course and your progress will appear here."
          action={<Button onClick={() => onNavigate({ view: 'catalog' })}>Browse Courses</Button>}
        />
      </div>
    );
  }

  return (
    <div className="p-xl mx-auto max-w-5xl" data-testid="progress-dashboard">
      <PageHeader
        eyebrow="Progress"
        title="My Progress"
        subtitle="Track your learning journey across all courses."
        className="mb-xl"
      />

      <StatsSummary
        className="mb-xl"
        items={[
          {
            value: entries.filter(([, s]) => s.isCompleted).length,
            label: 'completed',
            icon: <BookOpen className="h-4 w-4" />,
            color: 'success',
          },
          {
            value: entries.filter(([, s]) => !s.isCompleted && s.visitedNodes.length > 0).length,
            label: 'in progress',
            icon: <TrendingUp className="h-4 w-4" />,
          },
          {
            value: Object.values(allBadges).reduce((sum, badges) => sum + badges.length, 0),
            label: 'badges earned',
            icon: <Award className="h-4 w-4" />,
            color: 'tertiary',
          },
        ]}
      />

      <SectionDivider density="minimal" className="mb-xl" />

      <div className="gap-md flex flex-col">
        {sortedEntries.map(([packageId, snap]) => {
          const pkg = packageEntries[packageId];
          const summary = catalogPackages.find((s) => s.manifest.id === packageId);
          const title = pkg?.manifest.title ?? summary?.manifest.title ?? packageId;
          const totalNodes =
            pkg?.workflow && pkg?.manifest.entry
              ? getOrderedNodes(pkg.workflow, pkg.manifest.entry).length
              : snap.visitedNodes.length;
          const percent =
            totalNodes > 0 ? Math.round((snap.visitedNodes.length / totalNodes) * 100) : 0;

          const lastTitle = snap.currentNodeId
            ? (nodeTitleMap[snap.currentNodeId] ?? humanizeNodeId(snap.currentNodeId))
            : 'Not started';

          const lastStudied = relativeTime(snap.updatedAt);

          const packageBadges = allBadges[packageId] ?? [];
          const badgeCount = packageBadges.length;

          const isCompleted = snap.isCompleted;

          return (
            <ProgressCard
              key={packageId}
              title={title}
              status={isCompleted ? 'completed' : 'in-progress'}
              currentSteps={snap.visitedNodes.length}
              totalSteps={totalNodes}
              percent={percent}
              lastTitle={lastTitle}
              lastStudied={lastStudied}
              badgeCount={badgeCount}
              onContinue={() => onNavigate({ view: 'course', packageId })}
              onReview={isCompleted ? () => onNavigate({ view: 'course', packageId }) : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}
