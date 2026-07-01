import { useCallback, useRef, type KeyboardEvent } from 'react';
import { type CardDefinition } from '@open-edu/schemas';
import { cn } from '@open-edu/design-system';
import { Card } from './Card.js';

export interface CardGridItem {
  card: CardDefinition;
  level: number;
  isLocked: boolean;
}

export interface CardGridProps {
  cards: CardGridItem[];
  onCardClick?: (card: CardDefinition) => void;
  className?: string;
}

export function CardGrid({ cards, onCardClick, className }: CardGridProps): JSX.Element {
  const gridRef = useRef<HTMLDivElement>(null);

  const focusCard = useCallback((index: number) => {
    const grid = gridRef.current;
    if (!grid) return;
    const cardEls = grid.querySelectorAll<HTMLDivElement>('[data-card-index]');
    (cardEls[index] as HTMLElement)?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const currentIndex = parseInt(
        (e.target as HTMLElement).getAttribute('data-card-index') ?? '-1',
        10,
      );
      if (currentIndex < 0) return;

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          if (currentIndex < cards.length - 1) focusCard(currentIndex + 1);
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          if (currentIndex > 0) focusCard(currentIndex - 1);
          break;
        case 'Home':
          e.preventDefault();
          focusCard(0);
          break;
        case 'End':
          e.preventDefault();
          focusCard(cards.length - 1);
          break;
      }
    },
    [cards.length, focusCard],
  );

  if (cards.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-on-surface-variant" role="status">
        <p className="text-sm">No cards yet. Complete lessons to unlock your first card.</p>
      </div>
    );
  }

  return (
    <div
      ref={gridRef}
      role="list"
      aria-label="Card collection"
      onKeyDown={handleKeyDown}
      className={cn(
        'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4',
        className,
      )}
    >
      {cards.map((item, index) => (
        <div key={item.card.id} role="listitem" data-card-index={index}>
          <Card
            card={item.card}
            level={item.level}
            isLocked={item.isLocked}
            onClick={() => onCardClick?.(item.card)}
          />
        </div>
      ))}
    </div>
  );
}
