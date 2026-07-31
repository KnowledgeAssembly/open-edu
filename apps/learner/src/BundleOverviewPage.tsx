import { useMemo, useState, useEffect } from 'react';
import { BundleOverview, KnowledgeCardGrid, KnowledgeCardViewer } from '@open-edu/runtime';
import type { BundleOverviewModule, KnowledgeCardGridItem } from '@open-edu/runtime';
import type { LoadedBundle } from '@open-edu/core';
import type { BundleProgressSnapshot, CardDefinition } from '@open-edu/schemas';
import { Button } from '@open-edu/design-system';
import { useTranslation } from '@open-edu/i18n';
import { RotateCcw } from 'lucide-react';
import { getAllCardProgress, type CardsData } from './cardsStorage';

export interface BundleOverviewPageProps {
  bundle: LoadedBundle;
  bundleProgress: BundleProgressSnapshot | null;
  onStartModule: (bundleId: string, moduleId: string) => void;
  onBackToCatalog: () => void;
  onRequestReset?: (id: string, title: string, isBundle: boolean) => void;
}

export function BundleOverviewPage(props: BundleOverviewPageProps): JSX.Element {
  const { bundle, bundleProgress, onStartModule, onBackToCatalog, onRequestReset } = props;
  const { t } = useTranslation();
  const [selectedCard, setSelectedCard] = useState<CardDefinition | null>(null);
  const [savedProgress, setSavedProgress] = useState<CardsData>({});

  useEffect(() => {
    getAllCardProgress().then(setSavedProgress);
  }, []);

  const nodeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const mod of bundle.modules) {
      counts[mod.manifest.id] = mod.nodes.length;
    }
    return counts;
  }, [bundle]);

  const overviewModules: BundleOverviewModule[] = useMemo(() => {
    return bundle.manifest.modules.map((mod) => {
      const progress = bundleProgress?.moduleProgress[mod.id];
      const status = bundleProgress?.moduleStatuses[mod.id] ?? 'unlocked';

      return {
        id: mod.id,
        title: mod.title,
        chapterCode: mod.chapterCode,
        status: status as BundleOverviewModule['status'],
        nodeCount: nodeCounts[mod.id] ?? 0,
        completedNodeCount: progress ? new Set(progress.visitedNodes).size : 0,
        estimatedDuration: mod.estimatedDuration,
      };
    });
  }, [bundle, bundleProgress, nodeCounts]);

  const bundleCardItems = useMemo<KnowledgeCardGridItem[]>(() => {
    const cards = bundle.cards?.cards ?? [];
    return cards.map((card) => {
      const saved = savedProgress[card.id];
      const level = saved?.level ?? (savedProgress[card.id] ? 1 : 0);
      return { card, level, isLocked: level === 0 };
    });
  }, [bundle.cards, savedProgress]);

  return (
    <>
      <BundleOverview
        bundleTitle={bundle.manifest.title}
        bundleId={bundle.manifest.id}
        description={bundle.manifest.description}
        modules={overviewModules}
        onStartModule={(moduleId) => onStartModule(bundle.manifest.id, moduleId)}
        onContinueModule={(moduleId) => onStartModule(bundle.manifest.id, moduleId)}
        onBackToCatalog={onBackToCatalog}
      />
      {bundleCardItems.length > 0 && (
        <section
          className="max-w-content px-xl py-xl mx-auto w-full"
          role="region"
          aria-label={t('learner.collection_binder.bundle_shelf')}
        >
          <h2 className="text-h3 font-display text-on-surface mb-md">
            {t('learner.collection_binder.bundle_shelf')}
          </h2>
          <KnowledgeCardGrid cards={bundleCardItems} onCardClick={setSelectedCard} />
        </section>
      )}
      {selectedCard && (
        <KnowledgeCardViewer
          card={selectedCard}
          level={savedProgress[selectedCard.id]?.level ?? 1}
          onClose={() => setSelectedCard(null)}
        />
      )}
      {bundleProgress && (
        <div className="max-w-content px-xl pb-xl mx-auto flex w-full justify-end">
          <Button
            variant="ghost"
            size="sm"
            data-testid="reset-button"
            className="opacity-60 transition-opacity hover:opacity-100"
            onClick={() => onRequestReset?.(bundle.manifest.id, bundle.manifest.title, true)}
          >
            <RotateCcw className="h-4 w-4" />
            <span className="sr-only">{t('learner.reset.button')}</span>
          </Button>
        </div>
      )}
    </>
  );
}
