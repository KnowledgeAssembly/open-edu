import { useMemo, useState, useEffect } from 'react';
import type { PackageSummary, LoadedPackage } from '@open-edu/core';
import { getOrderedNodes } from '@open-edu/workflow';
import { useTranslation } from '@open-edu/i18n';
import { type AppView } from './AppShell';
import { getAllProgress, type ProgressData } from './progressStorage';
import { getAllBadges, type BadgesData } from './badgesStorage';
import { relativeTimeHuman } from './i18n-relativetime';
import {
  Button,
  EmptyState,
  PageHeader,
  ProgressCard,
  StatsSummary,
  SectionDivider,
} from '@open-edu/design-system';
import { BookOpen, TrendingUp, Award, RotateCcw } from 'lucide-react';

export interface ProgressDashboardProps {
  onNavigate: (view: AppView) => void;
  catalogPackages?: PackageSummary[];
  packageEntries?: Record<string, LoadedPackage>;
  onRequestReset?: (id: string, title: string, isBundle: boolean) => void;
}

function humanizeNodeId(nodeId: string): string {
  return nodeId.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
}

export function ProgressDashboard({
  onNavigate,
  catalogPackages = [],
  packageEntries = {},
  onRequestReset,
}: ProgressDashboardProps): JSX.Element {
  const { t, locale } = useTranslation();
  const [allProgress, setAllProgress] = useState<ProgressData>({});
  const [allBadges, setAllBadges] = useState<BadgesData>({});
  useEffect(() => {
    getAllProgress().then(setAllProgress);
    getAllBadges().then(setAllBadges);
  }, []);
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
      <div className="p-xl max-w-content mx-auto w-full" data-testid="progress-dashboard">
        <h1 className="text-h1 font-display text-on-surface mb-lg">
          {t('learner.progress.title')}
        </h1>
        <EmptyState
          variant="no-progress"
          heading={t('learner.progress.empty_heading')}
          description={t('learner.progress.empty_description')}
          action={
            <Button onClick={() => onNavigate({ view: 'catalog' })}>
              {t('learner.progress.browse_courses')}
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="p-xl max-w-content mx-auto w-full" data-testid="progress-dashboard">
      <PageHeader
        eyebrow={t('learner.progress.eyebrow_label')}
        title={t('learner.progress.title')}
        subtitle={t('learner.progress.subtitle')}
        className="mb-xl"
      />

      <StatsSummary
        className="mb-xl"
        items={[
          {
            value: entries.filter(([, s]) => s.isCompleted).length,
            label: t('learner.progress.stat_completed'),
            icon: <BookOpen className="h-4 w-4" />,
            color: 'success',
          },
          {
            value: entries.filter(([, s]) => !s.isCompleted && s.visitedNodes.length > 0).length,
            label: t('learner.progress.stat_in_progress'),
            icon: <TrendingUp className="h-4 w-4" />,
          },
          {
            value: Object.values(allBadges).reduce((sum, badges) => sum + badges.length, 0),
            label: t('learner.progress.stat_badges_earned'),
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
              : new Set(snap.visitedNodes).size;
          const uniqueVisited = new Set(snap.visitedNodes).size;
          const percent = totalNodes > 0 ? Math.round((uniqueVisited / totalNodes) * 100) : 0;

          const lastTitle = snap.currentNodeId
            ? (nodeTitleMap[snap.currentNodeId] ?? humanizeNodeId(snap.currentNodeId))
            : 'Not started';

          const lastStudied = relativeTimeHuman(snap.updatedAt, locale);

          const packageBadges = allBadges[packageId] ?? [];
          const badgeCount = packageBadges.length;

          const isCompleted = snap.isCompleted;

          return (
            <div key={packageId} className="group relative">
              <ProgressCard
                title={title}
                status={isCompleted ? 'completed' : 'in-progress'}
                currentSteps={uniqueVisited}
                totalSteps={totalNodes}
                percent={percent}
                lastTitle={lastTitle}
                lastStudied={lastStudied}
                badgeCount={badgeCount}
                onContinue={() => onNavigate({ view: 'course', packageId })}
                onReview={isCompleted ? () => onNavigate({ view: 'course', packageId }) : undefined}
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute bottom-2 left-2 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onRequestReset?.(packageId, title, false);
                }}
              >
                <RotateCcw className="h-4 w-4 text-error" />
                <span className="sr-only">{t('reset.button')}</span>
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
