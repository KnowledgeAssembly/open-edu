import { describe, it, expect, beforeEach } from 'vitest';
import { Subject } from 'rxjs';
import { CardBroker } from './card-broker';
import type { CardDefinition, TelemetryEvent } from '@open-edu/schemas';

const knowledgeCard: CardDefinition = {
  id: 'living-things',
  title: 'Living Things',
  category: 'Biology',
  type: 'knowledge',
  summary: 'Learn about living things.',
  level: 1,
  maximumLevel: 2,
  unlock: { type: 'chain', completedNodeIds: ['nodes/guided-practice.json'] },
  nextLevel: { type: 'score', nodeId: 'nodes/mastery-check.json', minScore: 80 },
};

const skillCard: CardDefinition = {
  id: 'careful-observer',
  title: 'Careful Observer',
  category: 'Science Skills',
  type: 'skill',
  summary: 'You observe carefully.',
  level: 1,
  maximumLevel: 1,
  unlock: { type: 'score', nodeId: 'nodes/independent-practice.json', minScore: 100 },
};

describe('CardBroker', () => {
  let subject: Subject<TelemetryEvent>;
  let onCardUnlocked: ReturnType<typeof vi.fn>;
  let onCardLeveledUp: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    subject = new Subject<TelemetryEvent>();
    onCardUnlocked = vi.fn();
    onCardLeveledUp = vi.fn();
  });

  it('should start and become active', () => {
    const broker = new CardBroker({
      cards: [knowledgeCard],
      source: subject.asObservable(),
    });
    expect(broker.isActive).toBe(false);
    broker.start();
    expect(broker.isActive).toBe(true);
  });

  it('should stop and become inactive', () => {
    const broker = new CardBroker({
      cards: [knowledgeCard],
      source: subject.asObservable(),
    });
    broker.start();
    broker.stop();
    expect(broker.isActive).toBe(false);
  });

  it('should unlock a card when chain condition is met', () => {
    const broker = new CardBroker({
      cards: [knowledgeCard],
      source: subject.asObservable(),
      onCardUnlocked,
    });
    broker.start();

    broker.updateContext({ completedNodes: ['nodes/guided-practice.json'] });
    subject.next({
      event: 'node_complete',
      nodeId: 'nodes/guided-practice.json',
      timestamp: 1000,
    } as TelemetryEvent);

    expect(onCardUnlocked).toHaveBeenCalledWith(knowledgeCard);
    expect(broker.getCardLevel('living-things')).toBe(1);
  });

  it('should not unlock a card when condition is not met', () => {
    const broker = new CardBroker({
      cards: [knowledgeCard],
      source: subject.asObservable(),
      onCardUnlocked,
    });
    broker.start();

    subject.next({
      event: 'node_complete',
      nodeId: 'nodes/other-node.json',
      timestamp: 1000,
    } as TelemetryEvent);

    expect(onCardUnlocked).not.toHaveBeenCalled();
    expect(broker.getCardLevel('living-things')).toBe(0);
  });

  it('should level up a card when nextLevel condition is met', () => {
    const broker = new CardBroker({
      cards: [knowledgeCard],
      source: subject.asObservable(),
      onCardUnlocked,
      onCardLeveledUp,
    });

    broker.setCardLevel('living-things', 1);
    broker.start();

    broker.updateContext({ scores: { 'nodes/mastery-check.json': 90 } });
    subject.next({
      event: 'node_complete',
      nodeId: 'nodes/mastery-check.json',
      timestamp: 1000,
    } as TelemetryEvent);

    expect(onCardLeveledUp).toHaveBeenCalledWith(knowledgeCard, 2);
    expect(broker.getCardLevel('living-things')).toBe(2);
  });

  it('should not level past maximumLevel', () => {
    const broker = new CardBroker({
      cards: [skillCard],
      source: subject.asObservable(),
      onCardUnlocked,
      onCardLeveledUp,
    });

    broker.setCardLevel('careful-observer', 1);
    broker.start();

    broker.updateContext({ scores: { 'nodes/independent-practice.json': 100 } });
    subject.next({
      event: 'node_complete',
      nodeId: 'nodes/independent-practice.json',
      timestamp: 1000,
    } as TelemetryEvent);

    expect(onCardLeveledUp).not.toHaveBeenCalled();
    expect(broker.getCardLevel('careful-observer')).toBe(1);
  });

  it('should not double-unlock on repeated events', () => {
    const broker = new CardBroker({
      cards: [knowledgeCard],
      source: subject.asObservable(),
      onCardUnlocked,
    });
    broker.start();

    broker.updateContext({ completedNodes: ['nodes/guided-practice.json'] });
    subject.next({
      event: 'node_complete',
      nodeId: 'nodes/guided-practice.json',
      timestamp: 1000,
    } as TelemetryEvent);
    subject.next({
      event: 'node_complete',
      nodeId: 'nodes/guided-practice.json',
      timestamp: 2000,
    } as TelemetryEvent);

    expect(onCardUnlocked).toHaveBeenCalledTimes(1);
  });

  it('should return 0 for ununlocked cards via getCardLevel', () => {
    const broker = new CardBroker({
      cards: [knowledgeCard],
      source: subject.asObservable(),
    });
    expect(broker.getCardLevel('living-things')).toBe(0);
    expect(broker.getCardLevel('nonexistent')).toBe(0);
  });

  it('should return all unlocked cards via getUnlockedCards', () => {
    const broker = new CardBroker({
      cards: [knowledgeCard, skillCard],
      source: subject.asObservable(),
    });
    broker.setCardLevel('living-things', 1);
    broker.setCardLevel('careful-observer', 1);

    const unlocked = broker.getUnlockedCards();
    expect(unlocked.size).toBe(2);
    expect(unlocked.get('living-things')).toBe(1);
    expect(unlocked.get('careful-observer')).toBe(1);
  });

  it('should set and clear card levels via setCardLevel', () => {
    const broker = new CardBroker({
      cards: [knowledgeCard],
      source: subject.asObservable(),
    });
    broker.setCardLevel('living-things', 2);
    expect(broker.getCardLevel('living-things')).toBe(2);

    broker.setCardLevel('living-things', 0);
    expect(broker.getCardLevel('living-things')).toBe(0);
  });

  it('should update context and reflect in evaluations', () => {
    const broker = new CardBroker({
      cards: [knowledgeCard],
      source: subject.asObservable(),
      onCardUnlocked,
    });

    expect(broker.context.completedNodes).toEqual([]);
    broker.updateContext({ completedNodes: ['nodes/guided-practice.json'] });
    expect(broker.context.completedNodes).toContain('nodes/guided-practice.json');
  });
});
