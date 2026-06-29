import type { PackageSummary } from '@open-edu/core';
import { type AppView } from './AppShell';
import { getAllProgress } from './progressStorage';
import { getAllBadges } from './badgesStorage';
import { getAllBundleProgress } from './bundleProgressStorage';
import { Button, Card, CardContent } from '@open-edu/design-system';
import { BookOpen, TrendingUp, Trophy, Sparkles, PlayCircle } from 'lucide-react';

export interface HomePageProps {
  onNavigate: (view: AppView) => void;
  catalogPackages?: PackageSummary[];
  bundleEntries?: Record<string, unknown>;
}

export function HomePage({
  onNavigate,
  catalogPackages = [],
  bundleEntries,
}: HomePageProps): JSX.Element {
  const progress = getAllProgress();
  const badgeData = getAllBadges();
  const bundleProg = getAllBundleProgress();
  const courseCount = catalogPackages.length;
  const bundleCount = bundleEntries ? Object.keys(bundleEntries).length : 0;
  const totalUnits = courseCount + bundleCount;
  const inProgressCount =
    Object.values(progress).filter((p) => !p.isCompleted && p.visitedNodes.length > 0).length +
    Object.values(bundleProg).filter(
      (b) => !Object.values(b.moduleStatuses).every((s) => s === 'completed'),
    ).length;
  const badgeCount = Object.values(badgeData).reduce((sum, badges) => sum + badges.length, 0);

  return (
    <div className="p-xl max-w-4xl mx-auto" data-testid="home-page">
      <h1 className="text-h1 font-display text-on-surface font-bold mb-sm">Welcome to OpenEdu</h1>
      <p className="text-body-reading text-on-surface-variant mb-xl">
        Your interactive learning platform. Explore courses, track progress, and earn badges.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-md mb-xl">
        <Card>
          <CardContent className="flex flex-col items-center p-6 text-center">
            <BookOpen className="h-8 w-8 text-primary mb-2" />
            <div className="text-3xl font-bold text-primary">{totalUnits}</div>
            <p className="text-sm text-muted-foreground">Learning Units Available</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center p-6 text-center">
            <TrendingUp className="h-8 w-8 text-primary mb-2" />
            <div className="text-3xl font-bold text-primary">{inProgressCount}</div>
            <p className="text-sm text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center p-6 text-center">
            <Trophy className="h-8 w-8 text-primary mb-2" />
            <div className="text-3xl font-bold text-primary">{badgeCount}</div>
            <p className="text-sm text-muted-foreground">Badges Earned</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-md">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-primary mb-3 flex items-center gap-2">
              <Sparkles className="h-5 w-5" /> Quick Links
            </h2>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => onNavigate({ view: 'catalog' })}>
                <PlayCircle className="h-4 w-4 mr-2" /> Browse Courses
              </Button>
              <Button variant="outline" onClick={() => onNavigate({ view: 'progress' })}>
                View Progress
              </Button>
              <Button variant="outline" onClick={() => onNavigate({ view: 'settings' })}>
                Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
