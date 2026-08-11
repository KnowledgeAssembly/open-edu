import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@open-edu/design-system';
import { Plus } from 'lucide-react';
import { useTranslation } from '@open-edu/i18n';

export function AddActivityMenu({
  onAddLesson,
  onAddQuiz,
  onAddPractice,
  onAddAi,
}: {
  onAddLesson: () => void;
  onAddQuiz: () => void;
  onAddPractice: () => void;
  onAddAi: () => void;
}) {
  const { t } = useTranslation();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="default" size="sm" aria-label={t('studio.outline.addMenuLabel')}>
          <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
          {t('studio.outline.add')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onAddLesson}>{t('studio.outline.addLesson')}</DropdownMenuItem>
        <DropdownMenuItem onSelect={onAddQuiz}>{t('studio.outline.addQuiz')}</DropdownMenuItem>
        <DropdownMenuItem onSelect={onAddPractice}>
          {t('studio.outline.addPractice')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onAddAi}>{t('studio.ai.item.addTitle')}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
