import type { Observable, Subscription } from 'rxjs';
import type { TelemetryEvent, CardDefinition } from '@open-edu/schemas';
import type { ContextSnapshot } from './types';
import { evaluateCondition, getDefaultContext } from './conditions';

export interface CardBrokerOptions {
  cards: CardDefinition[];
  source: Observable<TelemetryEvent>;
  context?: ContextSnapshot;
  initialLevels?: Record<string, number>;
  onCardUnlocked?: (card: CardDefinition) => void;
  onCardLeveledUp?: (card: CardDefinition, newLevel: number) => void;
}

export class CardBroker {
  private options: CardBrokerOptions;
  private unlockedCards: Map<string, number>;
  private subscription: Subscription | null = null;
  private _context: ContextSnapshot;

  constructor(options: CardBrokerOptions) {
    this.options = options;
    this.unlockedCards = new Map();
    this._context = options.context ?? getDefaultContext();
    if (options.initialLevels) {
      for (const [id, level] of Object.entries(options.initialLevels)) {
        if (level > 0) this.unlockedCards.set(id, level);
      }
    }
  }

  start(): void {
    if (this.isActive) return;
    this.subscription = this.options.source.subscribe({
      next: () => this.evaluateCards(),
    });
  }

  stop(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
  }

  get isActive(): boolean {
    return this.subscription !== null;
  }

  get context(): ContextSnapshot {
    return { ...this._context };
  }

  updateContext(snapshot: Partial<ContextSnapshot>): void {
    this._context = {
      scores: { ...this._context.scores, ...snapshot.scores },
      skills: { ...this._context.skills, ...snapshot.skills },
      completedNodes: [
        ...new Set([...this._context.completedNodes, ...(snapshot.completedNodes ?? [])]),
      ],
      completedModules: [
        ...new Set([...this._context.completedModules, ...(snapshot.completedModules ?? [])]),
      ],
    };
  }

  getCardLevel(cardId: string): number {
    return this.unlockedCards.get(cardId) ?? 0;
  }

  getUnlockedCards(): Map<string, number> {
    return new Map(this.unlockedCards);
  }

  setCardLevel(cardId: string, level: number): void {
    const card = this.options.cards.find((c) => c.id === cardId);
    const clampedLevel = card ? Math.min(level, card.maximumLevel) : level;
    if (clampedLevel > 0) {
      this.unlockedCards.set(cardId, clampedLevel);
    } else {
      this.unlockedCards.delete(cardId);
    }
  }

  private evaluateCards(): void {
    for (const card of this.options.cards) {
      const currentLevel = this.unlockedCards.get(card.id) ?? 0;

      if (currentLevel === 0) {
        if (evaluateCondition(card.unlock, this._context)) {
          this.unlockedCards.set(card.id, card.level);
          this.options.onCardUnlocked?.(card);
        }
      } else if (currentLevel < card.maximumLevel && card.nextLevel) {
        if (evaluateCondition(card.nextLevel, this._context)) {
          const newLevel = currentLevel + 1;
          this.unlockedCards.set(card.id, newLevel);
          this.options.onCardLeveledUp?.(card, newLevel);
        }
      }
    }
  }
}
