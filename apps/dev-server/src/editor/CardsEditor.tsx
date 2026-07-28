import { X } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

interface CardData {
  id: string;
  slug?: string;
  title: string;
  subtitle?: string;
  category: string;
  type: string;
  icon?: string;
  illustration?: string;
  summary: string;
  detailedExplanation?: string;
  tags?: string[];
  difficulty?: string;
  level: number;
  maximumLevel: number;
  unlock: Record<string, unknown>;
  nextLevel?: Record<string, unknown>;
  relatedLessons?: string[];
  relatedQuizzes?: string[];
}

interface CardsData {
  cards: CardData[];
}

interface CardsEditorProps {
  data: CardsData;
  onChange: (data: CardsData) => void;
}

const cardTypeOptions = ['knowledge', 'skill', 'achievement', 'exploration', 'mentor'];
const cardDifficultyOptions = ['easy', 'medium', 'hard'];

export function CardsEditor({ data, onChange }: CardsEditorProps) {
  const cards = data.cards ?? [];

  const handleAddCard = () => {
    onChange({
      cards: [
        ...cards,
        {
          id: `card-${cards.length + 1}`,
          title: '',
          category: '',
          type: 'knowledge',
          summary: '',
          level: 1,
          maximumLevel: 1,
          unlock: { type: 'chain', completedNodeIds: [] },
        },
      ],
    });
  };

  const handleRemoveCard = (idx: number) => {
    onChange({
      cards: cards.filter((_, i) => i !== idx),
    });
  };

  const handleCardChange = (idx: number, card: CardData) => {
    const updated = [...cards];
    updated[idx] = card;
    onChange({ cards: updated });
  };

  if (cards.length === 0) {
    return (
      <div className="space-y-4">
        <div className="border-secondary-container bg-secondary-container text-secondary rounded-lg border px-3 py-2 text-xs">
          Define collection cards — knowledge, skill, achievement, exploration, or mentor cards.
        </div>
        <div className="border-outline-variant text-on-surface-variant rounded-lg border-2 border-dashed p-6 text-center text-sm">
          No cards defined
        </div>
        <button
          type="button"
          className="text-primary hover:bg-primary-container rounded px-3 py-1.5 text-xs font-medium"
          onClick={handleAddCard}
        >
          + Add Card
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border-secondary-container bg-secondary-container text-secondary rounded-lg border px-3 py-2 text-xs">
        Define collection cards — knowledge, skill, achievement, exploration, or mentor cards.
      </div>

      <div className="space-y-3">
        {cards.map((card, idx) => (
          <CardEditorCard
            key={`${card.id}-${idx}`}
            card={card}
            onChange={(c) => handleCardChange(idx, c)}
            onRemove={() => handleRemoveCard(idx)}
          />
        ))}
      </div>

      <button
        type="button"
        className="text-primary hover:bg-primary-container rounded px-3 py-1.5 text-xs font-medium"
        onClick={handleAddCard}
      >
        + Add Card
      </button>
    </div>
  );
}

interface CardEditorCardProps {
  card: CardData;
  onChange: (card: CardData) => void;
  onRemove: () => void;
}

function CardEditorCard({ card, onChange, onRemove }: CardEditorCardProps) {
  return (
    <div className="border-outline-variant bg-surface shadow-elevation-flat rounded-lg border p-3">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-on-surface-variant text-xs font-medium">Card: {card.id}</span>
        <button
          type="button"
          className="text-on-surface-variant hover:bg-error-container hover:text-error rounded p-1"
          onClick={onRemove}
          aria-label="Remove card"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-on-surface-variant mb-0.5 block text-[10px] font-medium">ID</label>
          <Input
            className="border-outline-variant focus:border-primary focus:ring-primary w-full rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1"
            value={card.id}
            onChange={(e) => onChange({ ...card, id: e.target.value })}
          />
        </div>
        <div>
          <label className="text-on-surface-variant mb-0.5 block text-[10px] font-medium">
            Slug
          </label>
          <Input
            className="border-outline-variant focus:border-primary focus:ring-primary w-full rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1"
            value={card.slug ?? ''}
            onChange={(e) => onChange({ ...card, slug: e.target.value })}
            placeholder="Optional"
          />
        </div>
        <div className="col-span-2">
          <label className="text-on-surface-variant mb-0.5 block text-[10px] font-medium">
            Title
          </label>
          <Input
            className="border-outline-variant focus:border-primary focus:ring-primary w-full rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1"
            value={card.title}
            onChange={(e) => onChange({ ...card, title: e.target.value })}
          />
        </div>
        <div className="col-span-2">
          <label className="text-on-surface-variant mb-0.5 block text-[10px] font-medium">
            Subtitle
          </label>
          <Input
            className="border-outline-variant focus:border-primary focus:ring-primary w-full rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1"
            value={card.subtitle ?? ''}
            onChange={(e) => onChange({ ...card, subtitle: e.target.value })}
            placeholder="Optional"
          />
        </div>
        <div>
          <label className="text-on-surface-variant mb-0.5 block text-[10px] font-medium">
            Category
          </label>
          <Input
            className="border-outline-variant focus:border-primary focus:ring-primary w-full rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1"
            value={card.category}
            onChange={(e) => onChange({ ...card, category: e.target.value })}
          />
        </div>
        <div>
          <label className="text-on-surface-variant mb-0.5 block text-[10px] font-medium">
            Type
          </label>
          <Select value={card.type} onValueChange={(value) => onChange({ ...card, type: value })}>
            <SelectTrigger className="border-outline-variant focus:border-primary focus:ring-primary w-full rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {cardTypeOptions.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-on-surface-variant mb-0.5 block text-[10px] font-medium">
            Difficulty
          </label>
          <Select value={card.difficulty ?? 'medium'} onValueChange={(value) => onChange({ ...card, difficulty: value })}>
            <SelectTrigger className="border-outline-variant focus:border-primary focus:ring-primary w-full rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {cardDifficultyOptions.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-on-surface-variant mb-0.5 block text-[10px] font-medium">
            Level
          </label>
          <Input
            type="number"
            min={1}
            max={5}
            className="border-outline-variant focus:border-primary focus:ring-primary w-full rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1"
            value={card.level}
            onChange={(e) => onChange({ ...card, level: parseInt(e.target.value) || 1 })}
          />
        </div>
        <div>
          <label className="text-on-surface-variant mb-0.5 block text-[10px] font-medium">
            Max Level
          </label>
          <Input
            type="number"
            min={1}
            max={5}
            className="border-outline-variant focus:border-primary focus:ring-primary w-full rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1"
            value={card.maximumLevel}
            onChange={(e) => onChange({ ...card, maximumLevel: parseInt(e.target.value) || 1 })}
          />
        </div>
        <div className="col-span-2">
          <label className="text-on-surface-variant mb-0.5 block text-[10px] font-medium">
            Summary
          </label>
          <Textarea
            className="border-outline-variant focus:border-primary focus:ring-primary w-full rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1"
            rows={2}
            value={card.summary}
            onChange={(e) => onChange({ ...card, summary: e.target.value })}
          />
        </div>
        <div className="col-span-2">
          <label className="text-on-surface-variant mb-0.5 block text-[10px] font-medium">
            Detailed Explanation
          </label>
          <Textarea
            className="border-outline-variant focus:border-primary focus:ring-primary w-full rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1"
            rows={2}
            value={card.detailedExplanation ?? ''}
            onChange={(e) => onChange({ ...card, detailedExplanation: e.target.value })}
            placeholder="Optional"
          />
        </div>
        <div className="col-span-2">
          <label className="text-on-surface-variant mb-0.5 block text-[10px] font-medium">
            Icon
          </label>
          <Input
            className="border-outline-variant focus:border-primary focus:ring-primary w-full rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1"
            value={card.icon ?? ''}
            onChange={(e) => onChange({ ...card, icon: e.target.value })}
            placeholder="Optional icon path"
          />
        </div>
        <div className="col-span-2">
          <label className="text-on-surface-variant mb-0.5 block text-[10px] font-medium">
            Unlock Condition
          </label>
          <Textarea
            className="border-outline-variant focus:border-primary focus:ring-primary w-full rounded border px-2 py-1 font-mono text-xs focus:outline-none focus:ring-1"
            rows={2}
            value={JSON.stringify(card.unlock, null, 2)}
            onChange={(e) => {
              try {
                onChange({ ...card, unlock: JSON.parse(e.target.value) });
              } catch {
                // Allow invalid JSON during editing
              }
            }}
          />
        </div>
        <div className="col-span-2">
          <label className="text-on-surface-variant mb-0.5 block text-[10px] font-medium">
            Tags
          </label>
          <div className="flex flex-wrap gap-1">
            {(card.tags ?? []).map((tag, idx) => (
              <span
                key={idx}
                className="bg-surface-variant flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px]"
              >
                {tag}
                <button
                  type="button"
                  className="text-on-surface-variant hover:text-error"
                  onClick={() => {
                    const tags = card.tags?.filter((_, i) => i !== idx);
                    onChange({ ...card, tags });
                  }}
                >
                  x
                </button>
              </span>
            ))}
            <Input
              className="border-outline-variant focus:border-primary w-20 rounded border px-1 py-0.5 text-[10px] focus:outline-none"
              placeholder="Add tag"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const input = e.currentTarget;
                  const val = input.value.trim();
                  if (val) {
                    onChange({ ...card, tags: [...(card.tags ?? []), val] });
                    input.value = '';
                  }
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
