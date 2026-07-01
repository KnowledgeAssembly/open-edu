import { useMemo, useState, useCallback } from 'react';
import type { CardDefinition } from '@open-edu/schemas';
import { CardGrid, CardViewer, ProgressRing } from '@open-edu/runtime';
import type { CardGridItem } from '@open-edu/runtime';
import type { LoadedPackage } from '@open-edu/core';
import { getAllCardProgress } from './cardsStorage';

export interface CollectionBinderPageProps {
  pkg?: LoadedPackage;
}

interface ShelfData {
  category: string;
  cards: CardGridItem[];
}

export function CollectionBinderPage({ pkg }: CollectionBinderPageProps): JSX.Element {
  const [selectedCard, setSelectedCard] = useState<CardDefinition | null>(null);
  const savedProgress = useMemo(() => getAllCardProgress(), []);

  const allCardItems = useMemo<CardGridItem[]>(() => {
    if (!pkg?.cards?.cards) return [];
    return pkg.cards.cards.map((card) => {
      const saved = savedProgress[card.id];
      const level = saved?.level ?? (savedProgress[card.id] ? 1 : 0);
      return {
        card,
        level,
        isLocked: level === 0,
      };
    });
  }, [pkg, savedProgress]);

  const shelves = useMemo<ShelfData[]>(() => {
    const grouped: Record<string, CardGridItem[]> = {};
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
        className="flex flex-col items-center justify-center py-16 px-4"
        data-testid="collection-binder"
      >
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6 opacity-30">
            <svg
              className="w-24 h-24 mx-auto text-muted-foreground"
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
    <div className="max-w-6xl mx-auto p-6" data-testid="collection-binder">
      <div className="mb-8">
        <h1 className="text-h1 font-display text-on-surface">Collection Binder</h1>
        <p className="text-on-surface-variant mt-1">
          Your museum of knowledge — {allCardItems.filter((c) => !c.isLocked).length} /{' '}
          {allCardItems.length} cards collected
        </p>
      </div>

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
                  <span className="text-sm text-on-surface-variant">
                    {unlockedCount} / {shelf.cards.length} cards
                  </span>
                </div>
              </div>
              <CardGrid cards={shelf.cards} onCardClick={setSelectedCard} />
            </section>
          );
        })}
      </div>

      {selectedCard && (
        <CardViewer
          card={selectedCard}
          level={savedProgress[selectedCard.id]?.level ?? 1}
          onClose={() => setSelectedCard(null)}
          onRelatedLessonClick={handleRelatedLessonClick}
        />
      )}
    </div>
  );
}
