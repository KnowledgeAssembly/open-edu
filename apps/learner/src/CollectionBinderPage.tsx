import { useMemo, useState, useCallback, useEffect } from 'react';
import type { CardDefinition } from '@open-edu/schemas';
import { PageHeader, StatsSummary, SectionDivider } from '@open-edu/design-system';
import { KnowledgeCardGrid, KnowledgeCardViewer, ProgressRing } from '@open-edu/runtime';
import type { KnowledgeCardGridItem } from '@open-edu/runtime';
import type { LoadedPackage } from '@open-edu/core';
import { getAllCardProgress, type CardsData } from './cardsStorage';

export interface CollectionBinderPageProps {
  packages: Record<string, LoadedPackage>;
}

interface ShelfData {
  category: string;
  cards: KnowledgeCardGridItem[];
}

export function CollectionBinderPage({ packages }: CollectionBinderPageProps): JSX.Element {
  const [selectedCard, setSelectedCard] = useState<CardDefinition | null>(null);
  const [savedProgress, setSavedProgress] = useState<CardsData>({});

  useEffect(() => {
    getAllCardProgress().then(setSavedProgress);
  }, []);

  const allCardItems = useMemo<KnowledgeCardGridItem[]>(() => {
    const items: KnowledgeCardGridItem[] = [];
    for (const pkg of Object.values(packages)) {
      if (!pkg.cards?.cards) continue;
      for (const card of pkg.cards.cards) {
        const saved = savedProgress[card.id];
        const level = saved?.level ?? (savedProgress[card.id] ? 1 : 0);
        items.push({ card, level, isLocked: level === 0 });
      }
    }
    return items;
  }, [packages, savedProgress]);

  const shelves = useMemo<ShelfData[]>(() => {
    const grouped: Record<string, KnowledgeCardGridItem[]> = {};
    for (const item of allCardItems) {
      const cat = item.card.category;
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    }
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, cards]) => ({ category, cards }));
  }, [allCardItems]);

  const handleRelatedLessonClick = useCallback((nodeId: string) => {
    console.log('Navigate to:', nodeId);
  }, []);

  if (allCardItems.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center px-4 py-16"
        data-testid="collection-binder"
      >
        <div className="max-w-md text-center">
          <div className="mb-6 text-6xl opacity-30">
            <svg
              className="text-on-surface-variant mx-auto h-24 w-24"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <h2 className="text-h2 font-display text-on-surface mb-2">Collection Binder</h2>
          <p className="text-on-surface-variant">
            No cards yet. Complete lessons to unlock your first Knowledge Card.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-6" data-testid="collection-binder">
      <PageHeader
        eyebrow="Collection"
        title="Collection Binder"
        subtitle={`Your museum of knowledge — ${allCardItems.filter((c) => !c.isLocked).length} / ${allCardItems.length} cards collected`}
        className="mb-8"
      />

      <StatsSummary
        className="mb-xl"
        items={[
          {
            value: allCardItems.filter((c) => !c.isLocked).length,
            label: 'unlocked',
            color: 'primary',
          },
          { value: allCardItems.length, label: 'total cards' },
          { value: shelves.length, label: 'categories', color: 'tertiary' },
        ]}
      />

      <SectionDivider density="minimal" className="mb-xl" />

      <div className="flex flex-col gap-8">
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
                  <span className="text-on-surface-variant text-sm">
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
