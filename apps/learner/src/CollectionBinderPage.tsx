import { useMemo, useState, useCallback, useEffect } from 'react';
import type { CardDefinition } from '@open-edu/schemas';
import { PageHeader, StatsSummary, SectionDivider, Pipili } from '@open-edu/design-system';
import { useTranslation } from '@open-edu/i18n';
import { KnowledgeCardGrid, KnowledgeCardViewer, ProgressRing } from '@open-edu/runtime';
import type { KnowledgeCardGridItem } from '@open-edu/runtime';
import type { LoadedPackage } from '@open-edu/core';
import { getAllCardProgress, type CardsData } from './cardsStorage';

export interface CollectionBinderPageProps {
  packages: Record<string, LoadedPackage>;
  bundleCards?: CardDefinition[];
}

interface ShelfData {
  category: string;
  cards: KnowledgeCardGridItem[];
}

interface ShelfItem extends KnowledgeCardGridItem {
  shelfCategory: string;
}

export function CollectionBinderPage({
  packages,
  bundleCards,
}: CollectionBinderPageProps): JSX.Element {
  const { t } = useTranslation();
  const [selectedCard, setSelectedCard] = useState<CardDefinition | null>(null);
  const [savedProgress, setSavedProgress] = useState<CardsData>({});

  useEffect(() => {
    getAllCardProgress().then(setSavedProgress);
  }, []);

  const allCardItems = useMemo<ShelfItem[]>(() => {
    const items: ShelfItem[] = [];
    for (const pkg of Object.values(packages)) {
      if (!pkg.cards?.cards) continue;
      for (const card of pkg.cards.cards) {
        const saved = savedProgress[card.id];
        const level = saved?.level ?? (savedProgress[card.id] ? 1 : 0);
        items.push({ card, level, isLocked: level === 0, shelfCategory: card.category });
      }
    }
    for (const card of bundleCards ?? []) {
      const saved = savedProgress[card.id];
      const level = saved?.level ?? (savedProgress[card.id] ? 1 : 0);
      items.push({
        card,
        level,
        isLocked: level === 0,
        shelfCategory: t('learner.collection_binder.bundle_shelf'),
      });
    }
    return items;
  }, [packages, bundleCards, savedProgress, t]);

  const shelves = useMemo<ShelfData[]>(() => {
    const grouped: Record<string, KnowledgeCardGridItem[]> = {};
    for (const item of allCardItems) {
      const cat = item.shelfCategory;
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    }
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, cards]) => ({ category, cards }));
  }, [allCardItems]);

  const handleRelatedLessonClick = useCallback((_nodeId: string) => {
    // TODO: navigate to lesson node via onNavigate({ view: 'course', packageId: ... })
  }, []);

  if (allCardItems.length === 0) {
    return (
      <div
        className="px-md py-xl flex flex-col items-center justify-center"
        data-testid="collection-binder"
      >
        <div className="max-w-md text-center">
          <Pipili size="md" mood="curious" className="mb-lg mx-auto" />
          <h2 className="text-h2 font-display text-on-surface mb-2">
            {t('learner.collection_binder.title')}
          </h2>
          <p className="text-on-surface-variant">
            {t('learner.collection_binder.empty_description')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-xl max-w-content mx-auto w-full" data-testid="collection-binder">
      <PageHeader
        eyebrow={t('learner.collection_binder.eyebrow')}
        title={t('learner.collection_binder.title')}
        subtitle={t('learner.collection_binder.subtitle_format', {
          unlocked: String(allCardItems.filter((c) => !c.isLocked).length),
          total: String(allCardItems.length),
        })}
        className="mb-xl"
      />

      <StatsSummary
        className="mb-xl"
        items={[
          {
            value: allCardItems.filter((c) => !c.isLocked).length,
            label: t('learner.collection_binder.stat_unlocked'),
            color: 'primary',
          },
          { value: allCardItems.length, label: t('learner.collection_binder.stat_total_cards') },
          {
            value: shelves.length,
            label: t('learner.collection_binder.stat_categories'),
            color: 'tertiary',
          },
        ]}
      />

      <SectionDivider density="minimal" className="mb-xl" />

      <div className="gap-xl flex flex-col">
        {shelves.map((shelf) => {
          const unlockedCount = shelf.cards.filter((c) => !c.isLocked).length;
          return (
            <section
              key={shelf.category}
              role="region"
              aria-label={`${shelf.category} collection`}
              className="flex flex-col gap-4"
            >
              <div className="flex items-center gap-4">
                <ProgressRing
                  progress={Math.round((unlockedCount / shelf.cards.length) * 100)}
                  size={48}
                  strokeWidth={3}
                />
                <div className="flex flex-col">
                  <h2 className="text-h3 font-display text-on-surface">{shelf.category}</h2>
                  <span className="text-on-surface-variant text-body-ui">
                    {unlockedCount} / {shelf.cards.length} cards
                  </span>
                </div>
              </div>
              <KnowledgeCardGrid cards={shelf.cards} onCardClick={setSelectedCard} />
            </section>
          );
        })}
      </div>

      {selectedCard && (
        <KnowledgeCardViewer
          card={selectedCard}
          level={savedProgress[selectedCard.id]?.level ?? 1}
          onClose={() => setSelectedCard(null)}
          onRelatedLessonClick={handleRelatedLessonClick}
        />
      )}
    </div>
  );
}
