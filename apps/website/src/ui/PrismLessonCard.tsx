import { useState, type DragEvent } from 'react';
import { Atom } from 'lucide-react';
import { useTranslation } from '@open-edu/i18n';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  GlowPulse,
  Progress,
  cn,
  motionSafe,
} from '@open-edu/design-system';

interface PrismColor {
  id: string;
  label: string;
  hex: string;
}

const PRISM_COLORS: PrismColor[] = [
  { id: 'red', label: 'Red', hex: '#ef4444' },
  { id: 'orange', label: 'Orange', hex: '#f97316' },
  { id: 'yellow', label: 'Yellow', hex: '#eab308' },
  { id: 'green', label: 'Green', hex: '#22c55e' },
  { id: 'blue', label: 'Blue', hex: '#3b82f6' },
  { id: 'indigo', label: 'Indigo', hex: '#6366f1' },
  { id: 'violet', label: 'Violet', hex: '#8b5cf6' },
];

const SLOT_COUNT = 7;

const EMPTY_SLOTS: Array<PrismColor | null> = Array.from({ length: SLOT_COUNT }, () => null);

const SHAKE_KEYFRAMES = `
  @keyframes oe-prism-shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-6px); }
    40% { transform: translateX(6px); }
    60% { transform: translateX(-4px); }
    80% { transform: translateX(4px); }
  }
  .oe-prism-shake {
    animation: oe-prism-shake 0.4s ease-in-out;
  }
`;

type Feedback = 'success' | 'error' | null;

function PrismSvg({ className }: { className?: string }): JSX.Element {
  return (
    <svg viewBox="0 0 320 120" className={className} aria-hidden="true" focusable="false">
      <line
        x1="8"
        y1="46"
        x2="116"
        y2="62"
        stroke="var(--oe-color-on-surface)"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.75"
      />
      <polygon
        points="120,26 120,98 202,62"
        fill="var(--oe-color-primary-container)"
        stroke="var(--oe-color-primary)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {PRISM_COLORS.map((color, index) => (
        <line
          key={color.id}
          x1="192"
          y1="62"
          x2="304"
          y2={58 + index * 2.4}
          stroke={color.hex}
          strokeWidth="4"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

export function PrismLessonCard(): JSX.Element {
  const { t } = useTranslation();
  const [slots, setSlots] = useState<Array<PrismColor | null>>([...EMPTY_SLOTS]);
  const [selectedColor, setSelectedColor] = useState<PrismColor | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [shakeAttempt, setShakeAttempt] = useState(0);

  const complete = slots.every((slot) => slot !== null);
  const placedIds = new Set(
    slots.map((slot) => slot?.id).filter((id): id is string => id !== undefined),
  );

  const placeColor = (color: PrismColor, slotIndex: number): void => {
    setSlots((prev) => {
      const next: Array<PrismColor | null> = prev.map((slot) =>
        slot?.id === color.id ? null : slot,
      );
      next[slotIndex] = color;
      return next;
    });
    setSelectedColor(null);
    setFeedback(null);
  };

  const handleTileClick = (color: PrismColor): void => {
    setSelectedColor((prev) => (prev?.id === color.id ? null : color));
  };

  const handleTileDragStart = (event: DragEvent<HTMLButtonElement>, color: PrismColor): void => {
    event.dataTransfer.setData('text/plain', color.id);
    event.dataTransfer.effectAllowed = 'move';
    setSelectedColor(color);
  };

  const handleSlotClick = (slotIndex: number): void => {
    const current = slots[slotIndex];
    if (current) {
      setSlots((prev) => {
        const next = [...prev];
        next[slotIndex] = null;
        return next;
      });
      setFeedback(null);
      return;
    }
    if (selectedColor) {
      placeColor(selectedColor, slotIndex);
    }
  };

  const handleSlotDragOver = (event: DragEvent<HTMLButtonElement>): void => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleSlotDrop = (event: DragEvent<HTMLButtonElement>, slotIndex: number): void => {
    event.preventDefault();
    const id = event.dataTransfer.getData('text/plain');
    const dragged = PRISM_COLORS.find((color) => color.id === id) ?? selectedColor;
    if (dragged) {
      placeColor(dragged, slotIndex);
    }
  };

  const checkAnswer = (): void => {
    const expected = PRISM_COLORS.map((color) => color.id);
    const correct = slots.every((slot, index) => slot?.id === expected[index]);
    if (correct) {
      setFeedback('success');
    } else {
      setFeedback('error');
      setShakeAttempt((attempt) => attempt + 1);
    }
  };

  const reset = (): void => {
    setSlots([...EMPTY_SLOTS]);
    setSelectedColor(null);
    setFeedback(null);
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <Badge variant="secondary">
            <Atom className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            {t('website.hero.badge_science')}
          </Badge>
          <Progress
            current={1}
            total={3}
            showLabel
            size="sm"
            label={t('website.hero.lesson_step', { current: '1', total: '3' })}
            className="w-40"
          />
        </div>
        <h2 className="pt-2 text-2xl font-semibold leading-none tracking-tight">
          {t('website.hero.prism_title')}
        </h2>
      </CardHeader>

      <CardContent>
        <p className="text-on-surface text-sm font-medium">{t('website.prism.question')}</p>
        <p id="prism-instructions" className="text-on-surface-variant mt-1 text-sm">
          {t('website.prism.instructions')}
        </p>

        <PrismSvg className="mt-4 w-full" />

        <div className="mt-4 space-y-4" aria-describedby="prism-instructions">
          <ul className="flex flex-wrap items-center justify-center gap-2">
            {PRISM_COLORS.map((color) => {
              const placed = placedIds.has(color.id);
              const selected = selectedColor?.id === color.id;
              return (
                <li key={color.id}>
                  <button
                    type="button"
                    draggable={!placed}
                    onClick={() => handleTileClick(color)}
                    onDragStart={(event) => handleTileDragStart(event, color)}
                    disabled={placed}
                    aria-pressed={selected}
                    aria-label={t('website.prism.color_tile', { color: color.label })}
                    title={t('website.prism.color_tile', { color: color.label })}
                    className={cn(
                      'h-9 w-9 rounded-full border-2 transition-transform',
                      'focus-visible:outline-primary focus-visible:outline-2 focus-visible:outline-offset-2',
                      placed ? 'opacity-30' : 'cursor-grab active:cursor-grabbing',
                      selected ? 'border-primary scale-110' : 'border-outline',
                    )}
                    style={{ backgroundColor: color.hex }}
                  />
                </li>
              );
            })}
          </ul>

          <ul className="grid grid-cols-7 gap-2">
            {slots.map((slot, index) => (
              <li key={index} className="flex justify-center">
                <button
                  type="button"
                  onClick={() => handleSlotClick(index)}
                  onDragOver={handleSlotDragOver}
                  onDrop={(event) => handleSlotDrop(event, index)}
                  aria-label={
                    slot
                      ? `${t('website.prism.slot', { number: String(index + 1) })}: ${t(
                          'website.prism.color_tile',
                          { color: slot.label },
                        )}`
                      : t('website.prism.slot', { number: String(index + 1) })
                  }
                  className={cn(
                    'h-9 w-9 rounded-lg border-2 transition-colors',
                    'focus-visible:outline-primary focus-visible:outline-2 focus-visible:outline-offset-2',
                    slot
                      ? 'border-outline'
                      : 'border-outline-variant hover:border-primary border-dashed',
                  )}
                  style={{ backgroundColor: slot?.hex ?? 'transparent' }}
                />
              </li>
            ))}
          </ul>
        </div>

        {feedback === 'success' ? (
          <GlowPulse color="var(--oe-color-success-container)" className="mt-5 w-full">
            <p className="rounded-lg bg-[var(--oe-color-success-container)] px-3 py-2 text-sm font-medium text-[var(--oe-color-on-success-container)]">
              {t('website.prism.success')}
            </p>
          </GlowPulse>
        ) : null}

        {feedback === 'error' ? (
          <p
            key={shakeAttempt}
            className="oe-prism-shake text-error bg-error/10 border-error mt-5 rounded-lg border px-3 py-2 text-sm font-medium"
          >
            {t('website.prism.error')}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          {feedback !== 'success' ? (
            <Button onClick={checkAnswer} disabled={!complete}>
              {t('website.prism.check_answer')}
            </Button>
          ) : null}
          {feedback ? (
            <Button variant="outline" onClick={reset}>
              {t('website.prism.reset')}
            </Button>
          ) : null}
        </div>

        <div role="status" aria-live="polite" className="sr-only">
          {feedback === 'success'
            ? t('website.prism.success')
            : feedback === 'error'
              ? t('website.prism.error')
              : ''}
        </div>

        <style>{motionSafe(SHAKE_KEYFRAMES)}</style>
      </CardContent>
    </Card>
  );
}
