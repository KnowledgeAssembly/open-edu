import { useState, type DragEvent } from 'react';
import { useTranslation } from '@open-edu/i18n';
import { Button, cn } from '@open-edu/design-system';

type PartId = 'petal' | 'stem' | 'leaf' | 'root';

const LABEL_KEYS: Record<PartId, string> = {
  petal: 'website.label_diagram.petal',
  stem: 'website.label_diagram.stem',
  leaf: 'website.label_diagram.leaf',
  root: 'website.label_diagram.root',
};

interface FlowerPart {
  id: PartId;
  top: string;
  left: string;
}

const FLOWER_PARTS: FlowerPart[] = [
  { id: 'petal', top: '18%', left: '64%' },
  { id: 'stem', top: '58%', left: '52%' },
  { id: 'leaf', top: '76%', left: '70%' },
  { id: 'root', top: '91%', left: '50%' },
];

const EMPTY_PLACEMENTS: Record<PartId, PartId | null> = {
  petal: null,
  stem: null,
  leaf: null,
  root: null,
};

function FlowerSvg(): JSX.Element {
  return (
    <svg viewBox="0 0 260 200" className="w-full" aria-hidden="true" focusable="false">
      <g
        stroke="var(--oe-color-on-surface-variant)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      >
        <path d="M130 176 C 124 184, 128 190, 124 196" />
        <path d="M130 176 C 134 184, 132 190, 136 196" />
        <path d="M130 176 C 122 182, 118 184, 116 188" />
      </g>
      <path
        d="M130 172 L130 60"
        stroke="var(--oe-color-secondary)"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path
        d="M130 120 C 170 108, 190 118, 200 128 C 188 136, 158 138, 130 120 Z"
        fill="var(--oe-color-secondary)"
      />
      <g fill="var(--oe-color-primary-container)" stroke="var(--oe-color-primary)" strokeWidth="2">
        <ellipse cx="130" cy="34" rx="18" ry="30" />
        <ellipse cx="106" cy="52" rx="18" ry="30" transform="rotate(-40 106 52)" />
        <ellipse cx="154" cy="52" rx="18" ry="30" transform="rotate(40 154 52)" />
        <ellipse cx="112" cy="30" rx="18" ry="28" transform="rotate(40 112 30)" />
        <ellipse cx="148" cy="30" rx="18" ry="28" transform="rotate(-40 148 30)" />
      </g>
      <circle cx="130" cy="52" r="16" fill="var(--oe-color-tertiary)" />
    </svg>
  );
}

export function LabelDiagramDemo(): JSX.Element {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState<PartId | null>(null);
  const [placements, setPlacements] = useState<Record<PartId, PartId | null>>(EMPTY_PLACEMENTS);

  const placedIds = new Set(Object.values(placements).filter((id): id is PartId => id !== null));
  const complete = FLOWER_PARTS.every((part) => placements[part.id] === part.id);

  const placeLabel = (labelId: PartId, targetId: PartId): void => {
    setPlacements((prev) => ({ ...prev, [targetId]: labelId }));
    setSelectedId(null);
  };

  const handleTargetClick = (targetId: PartId): void => {
    if (placements[targetId]) {
      setPlacements((prev) => ({ ...prev, [targetId]: null }));
      setSelectedId(null);
      return;
    }
    if (selectedId) {
      placeLabel(selectedId, targetId);
    }
  };

  const handleDragStart = (event: DragEvent<HTMLButtonElement>, labelId: PartId): void => {
    event.dataTransfer.setData('text/plain', labelId);
    event.dataTransfer.effectAllowed = 'move';
    setSelectedId(labelId);
  };

  const handleDrop = (event: DragEvent<HTMLButtonElement>, targetId: PartId): void => {
    event.preventDefault();
    const id = event.dataTransfer.getData('text/plain') as PartId;
    if (FLOWER_PARTS.some((part) => part.id === id)) {
      placeLabel(id, targetId);
    }
  };

  const reset = (): void => {
    setPlacements(EMPTY_PLACEMENTS);
    setSelectedId(null);
  };

  return (
    <div>
      <p id="label-diagram-instructions" className="text-on-surface-variant text-sm">
        {t('website.label_diagram.instruction')}
      </p>

      <div
        role="group"
        aria-labelledby="label-diagram-instructions"
        className="mt-4 flex flex-wrap gap-2"
      >
        {FLOWER_PARTS.map((part) => {
          const placed = placedIds.has(part.id);
          const selected = selectedId === part.id;
          return (
            <button
              key={part.id}
              type="button"
              draggable={!placed}
              onClick={() => setSelectedId(selected ? null : part.id)}
              onDragStart={(event) => handleDragStart(event, part.id)}
              disabled={placed}
              aria-pressed={selected}
              className={cn(
                'h-8 rounded-full border px-3 text-sm font-medium transition-colors',
                'focus-visible:outline-primary focus-visible:outline-2 focus-visible:outline-offset-2',
                selected
                  ? 'border-primary bg-primary text-on-primary'
                  : 'border-outline bg-surface text-on-surface',
                placed && 'opacity-40',
              )}
            >
              {t(LABEL_KEYS[part.id])}
            </button>
          );
        })}
      </div>

      <div className="relative mt-2">
        <FlowerSvg />
        {FLOWER_PARTS.map((part) => {
          const placedLabel = placements[part.id];
          return (
            <button
              key={part.id}
              type="button"
              onClick={() => handleTargetClick(part.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => handleDrop(event, part.id)}
              aria-label={t('website.label_diagram.target', { label: t(LABEL_KEYS[part.id]) })}
              className={cn(
                'absolute h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed',
                'focus-visible:outline-primary focus-visible:outline-2 focus-visible:outline-offset-2',
                placedLabel
                  ? 'border-primary bg-primary-container text-on-primary-container'
                  : 'border-outline-variant bg-surface/60 hover:border-primary',
              )}
              style={{ top: part.top, left: part.left }}
            >
              {placedLabel ? (
                <span className="text-[10px] font-semibold leading-none">
                  {t(LABEL_KEYS[placedLabel])}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {complete ? (
        <p
          role="status"
          className="mt-4 rounded-lg bg-[var(--oe-color-success-container)] px-3 py-2 text-sm font-medium text-[var(--oe-color-on-success-container)]"
        >
          {t('website.label_diagram.correct')}
        </p>
      ) : null}

      <div className="mt-4">
        <Button variant="outline" size="sm" onClick={reset}>
          {t('website.label_diagram.reset')}
        </Button>
      </div>
    </div>
  );
}

LabelDiagramDemo.displayName = 'LabelDiagramDemo';
