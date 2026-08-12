import {
  Badge,
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@open-edu/design-system';
import { ArrowDown, ArrowUp, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from '@open-edu/i18n';
import type { ActivitySummary } from '../types.js';

function kindLabelKey(kind: ActivitySummary['kind']): string {
  switch (kind) {
    case 'lesson':
      return 'studio.outline.kind.lesson';
    case 'quiz':
      return 'studio.outline.kind.quiz';
    case 'practice':
      return 'studio.outline.kind.practice';
    case 'reflection':
      return 'studio.outline.kind.reflection';
    default:
      return 'studio.outline.kind.other';
  }
}

export function OutlineActivityRow({
  activity,
  index,
  total,
  saving,
  settling,
  onEdit,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  activity: ActivitySummary;
  index: number;
  total: number;
  saving: boolean;
  settling?: boolean;
  onEdit: (path: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  return (
    <li
      className={cn(
        'hover:bg-surface-container-low group flex flex-wrap items-center gap-3 px-4 py-3 transition-colors',
        settling && 'studio-row-enter',
      )}
    >
      <span className="text-on-surface-variant w-6 shrink-0 text-right text-sm" aria-hidden="true">
        {index + 1}.
      </span>
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => onEdit(activity.path)}
          className="text-on-surface hover:text-primary truncate text-left text-sm font-medium"
        >
          {activity.title}
        </button>
        <Badge variant="outline" className="text-on-surface-variant mt-1">
          {t(kindLabelKey(activity.kind))}
        </Badge>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            aria-label={t('studio.outline.rowMenu', { title: activity.title })}
            disabled={saving}
            data-row-menu={activity.path}
          >
            <MoreHorizontal className="size-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => onEdit(activity.path)}>
            <Pencil className="mr-2 size-4" aria-hidden="true" />
            {t('studio.nav.editActivity')}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onMoveUp} disabled={index === 0}>
            <ArrowUp className="mr-2 size-4" aria-hidden="true" />
            {t('studio.outline.moveUp', { title: activity.title })}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onMoveDown} disabled={index === total - 1}>
            <ArrowDown className="mr-2 size-4" aria-hidden="true" />
            {t('studio.outline.moveDown', { title: activity.title })}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onDelete} className="focus:text-error text-error">
            <Trash2 className="mr-2 size-4" aria-hidden="true" />
            {t('studio.outline.delete', { title: activity.title })}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}
