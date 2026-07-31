import { useTranslation } from '@open-edu/i18n';
import {
  cn,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@open-edu/design-system';
import type { ExplanationStyle } from '@open-edu/ai-companion';
import { useCompanion } from './CompanionProvider.js';

const STYLES: Array<{ id: ExplanationStyle; labelKey: string }> = [
  { id: 'simple', labelKey: 'learner.explanation_style.simple' },
  { id: 'detailed', labelKey: 'learner.explanation_style.detailed' },
  { id: 'exam', labelKey: 'learner.explanation_style.exam' },
  { id: 'child_friendly', labelKey: 'learner.explanation_style.child_friendly' },
  { id: 'autism_friendly', labelKey: 'learner.explanation_style.autism_friendly' },
];

export function ExplanationStylePicker(): JSX.Element {
  const { t } = useTranslation();
  const { explanationStyle, setExplanationStyle } = useCompanion();

  return (
    <div data-testid="explanation-style-picker">
      <label
        htmlFor="explanation-style-select"
        className="text-on-surface-variant text-caption mb-1 block"
      >
        {t('learner.explanation_style.label')}
      </label>
      <Select value={explanationStyle} onValueChange={setExplanationStyle}>
        <SelectTrigger
          id="explanation-style-select"
          className={cn('h-8 w-full text-sm')}
          aria-label={t('learner.explanation_style.label')}
        >
          <SelectValue>
            {t(STYLES.find((s) => s.id === explanationStyle)?.labelKey ?? STYLES[1]!.labelKey)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {STYLES.map((s) => (
            <SelectItem key={s.id} value={s.id} data-testid={`explanation-style-${s.id}`}>
              {t(s.labelKey)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
