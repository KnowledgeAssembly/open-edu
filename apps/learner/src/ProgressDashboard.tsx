import { useMemo } from 'react';
import type { PackageSummary, LoadedPackage } from '@open-edu/core';
import { getOrderedNodes } from '@open-edu/workflow';
import { type AppView } from './AppShell';
import { getAllProgress } from './progressStorage';
import { getAllBadges } from './badgesStorage';
import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  PageHeader,
  Progress,
  StatsSummary,
} from '@open-edu/design-system';
import { CheckCircle2, BookOpen, TrendingUp, Award } from 'lucide-react';

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
      <PageHeader eyebrow="Progress" title="My Progress" className="mb-xl" />

      <StatsSummary
        className="mb-xl"
        items={[
          {
            value: entries.filter(([, s]) => s.isCompleted).length,
            label: 'completed',
            icon: <BookOpen className="h-4 w-4" />,
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
          },
        ]}
      />

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

          return (
            <Card
              key={packageId}
              className={`${snap.isCompleted ? 'border-l-success border-l-4 opacity-80' : ''}`}
              data-testid={`progress-card-${packageId}`}
            >
              <CardContent className="p-md gap-md flex flex-col items-start justify-between sm:flex-row sm:items-center">
                <div className="w-full flex-1">
                  <h2 className="text-h2 font-display text-on-surface">{title}</h2>
                  <div className="gap-md mt-sm text-on-surface-variant flex flex-wrap items-center text-sm">
                    <span>
                      {snap.visitedNodes.length} of {totalNodes} steps
                    </span>
                    <span>Last: {lastTitle}</span>
                    {lastStudied && (
                      <span className="text-on-surface-variant/70">{lastStudied}</span>
                    )}
                    {badgeCount > 0 && (
                      <span className="text-tertiary font-medium">
                        {badgeCount} badge{badgeCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div className="mt-sm w-full">
                    <Progress value={percent} className="h-2" />
                  </div>
                </div>

                <div className="gap-md flex flex-shrink-0 items-center">
                  <span className="text-h2 font-display text-primary">{percent}%</span>
                  {snap.isCompleted ? (
                    <Badge variant="secondary">
                      Completed <CheckCircle2 className="ml-1 inline h-3 w-3" />
                    </Badge>
                  ) : (
                    <Button size="sm" onClick={() => onNavigate({ view: 'course', packageId })}>
                      Continue
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
