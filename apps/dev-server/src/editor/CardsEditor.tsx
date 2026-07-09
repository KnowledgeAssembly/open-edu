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
        <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
          Define collection cards — knowledge, skill, achievement, exploration, or mentor cards.
        </div>
        <div className="rounded-lg border-2 border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
          No cards defined
        </div>
        <button
          type="button"
          className="rounded px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50"
          onClick={handleAddCard}
        >
          + Add Card
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
        Define collection cards — knowledge, skill, achievement, exploration, or mentor cards.
      </div>

      <div className="space-y-3">
        {cards.map((card, idx) => (
          <CardEditorCard
            key={card.id}
            card={card}
            onChange={(c) => handleCardChange(idx, c)}
            onRemove={() => handleRemoveCard(idx)}
          />
        ))}
      </div>

      <button
        type="button"
        className="rounded px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50"
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
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">Card: {card.id}</span>
        <button
          type="button"
          className="rounded p-1 text-gray-400 hover:bg-red-100 hover:text-red-600"
          onClick={onRemove}
          aria-label="Remove card"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-0.5 block text-[10px] font-medium text-gray-500">ID</label>
          <input
            type="text"
            className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={card.id}
            onChange={(e) => onChange({ ...card, id: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-0.5 block text-[10px] font-medium text-gray-500">Slug</label>
          <input
            type="text"
            className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={card.slug ?? ''}
            onChange={(e) => onChange({ ...card, slug: e.target.value })}
            placeholder="Optional"
          />
        </div>
        <div className="col-span-2">
          <label className="mb-0.5 block text-[10px] font-medium text-gray-500">Title</label>
          <input
            type="text"
            className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={card.title}
            onChange={(e) => onChange({ ...card, title: e.target.value })}
          />
        </div>
        <div className="col-span-2">
          <label className="mb-0.5 block text-[10px] font-medium text-gray-500">Subtitle</label>
          <input
            type="text"
            className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={card.subtitle ?? ''}
            onChange={(e) => onChange({ ...card, subtitle: e.target.value })}
            placeholder="Optional"
          />
        </div>
        <div>
          <label className="mb-0.5 block text-[10px] font-medium text-gray-500">Category</label>
          <input
            type="text"
            className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={card.category}
            onChange={(e) => onChange({ ...card, category: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-0.5 block text-[10px] font-medium text-gray-500">Type</label>
          <select
            className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={card.type}
            onChange={(e) => onChange({ ...card, type: e.target.value })}
          >
            {cardTypeOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-0.5 block text-[10px] font-medium text-gray-500">Difficulty</label>
          <select
            className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={card.difficulty ?? 'medium'}
            onChange={(e) => onChange({ ...card, difficulty: e.target.value })}
          >
            {cardDifficultyOptions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-0.5 block text-[10px] font-medium text-gray-500">Level</label>
          <input
            type="number"
            min={1}
            max={5}
            className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={card.level}
            onChange={(e) => onChange({ ...card, level: parseInt(e.target.value) || 1 })}
          />
        </div>
        <div>
          <label className="mb-0.5 block text-[10px] font-medium text-gray-500">Max Level</label>
          <input
            type="number"
            min={1}
            max={5}
            className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={card.maximumLevel}
            onChange={(e) => onChange({ ...card, maximumLevel: parseInt(e.target.value) || 1 })}
          />
        </div>
        <div className="col-span-2">
          <label className="mb-0.5 block text-[10px] font-medium text-gray-500">Summary</label>
          <textarea
            className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            rows={2}
            value={card.summary}
            onChange={(e) => onChange({ ...card, summary: e.target.value })}
          />
        </div>
        <div className="col-span-2">
          <label className="mb-0.5 block text-[10px] font-medium text-gray-500">
            Detailed Explanation
          </label>
          <textarea
            className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            rows={2}
            value={card.detailedExplanation ?? ''}
            onChange={(e) => onChange({ ...card, detailedExplanation: e.target.value })}
            placeholder="Optional"
          />
        </div>
        <div className="col-span-2">
          <label className="mb-0.5 block text-[10px] font-medium text-gray-500">Icon</label>
          <input
            type="text"
            className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={card.icon ?? ''}
            onChange={(e) => onChange({ ...card, icon: e.target.value })}
            placeholder="Optional icon path"
          />
        </div>
        <div className="col-span-2">
          <label className="mb-0.5 block text-[10px] font-medium text-gray-500">
            Unlock Condition
          </label>
          <textarea
            className="w-full rounded border border-gray-300 px-2 py-1 font-mono text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
          <label className="mb-0.5 block text-[10px] font-medium text-gray-500">Tags</label>
          <div className="flex flex-wrap gap-1">
            {(card.tags ?? []).map((tag, idx) => (
              <span
                key={idx}
                className="flex items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 text-[10px]"
              >
                {tag}
                <button
                  type="button"
                  className="text-gray-400 hover:text-red-600"
                  onClick={() => {
                    const tags = card.tags?.filter((_, i) => i !== idx);
                    onChange({ ...card, tags });
                  }}
                >
                  x
                </button>
              </span>
            ))}
            <input
              type="text"
              className="w-20 rounded border border-gray-300 px-1 py-0.5 text-[10px] focus:border-blue-500 focus:outline-none"
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
