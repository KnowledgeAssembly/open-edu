import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
} from '@open-edu/design-system';
import { Search } from 'lucide-react';
import { useTranslation } from '@open-edu/i18n';
import { listCuratedWidgets } from '../widgets/curatedCatalog.js';
import type { CuratedWidget } from '../widgets/curatedCatalog.js';

export function WidgetPicker({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (widget: CuratedWidget) => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');

  const widgets = useMemo(() => {
    const all = listCuratedWidgets();
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((widget) =>
      [widget.name, widget.description ?? '', widget.id].some((field) =>
        field.toLowerCase().includes(q),
      ),
    );
  }, [query]);

  const handleSelect = (widget: CuratedWidget) => {
    onSelect(widget);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('studio.widget.pickerTitle')}</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search
            className="text-on-surface-variant pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('studio.widget.pickerSearch')}
            aria-label={t('studio.widget.pickerSearch')}
            className="border-outline-variant focus:border-primary focus:ring-primary w-full rounded border py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-1"
          />
        </div>
        {widgets.length === 0 ? (
          <p className="text-on-surface-variant text-sm">{t('studio.widget.noResults')}</p>
        ) : (
          <div className="max-h-[50vh] space-y-2 overflow-y-auto">
            {widgets.map((widget) => (
              <Card key={widget.id} className="border-outline-variant bg-surface">
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-on-surface text-sm font-medium">{widget.name}</p>
                      {widget.domain ? (
                        <Badge variant="outline" className="text-[10px]">
                          {widget.domain}
                        </Badge>
                      ) : null}
                      {widget.source === 'registry' ? (
                        <Badge variant="outline" className="text-[10px]">
                          {t('studio.widget.sandboxed_badge')}
                        </Badge>
                      ) : null}
                      {widget.experimental ? (
                        <Badge variant="outline" className="text-[10px]">
                          {t('studio.widget.experimental_badge')}
                        </Badge>
                      ) : null}
                      {widget.offline === false ? (
                        <Badge variant="outline" className="text-[10px]">
                          {t('studio.widget.online_only_warning')}
                        </Badge>
                      ) : null}
                    </div>
                    {widget.description ? (
                      <p className="text-on-surface-variant mt-0.5 line-clamp-2 text-xs">
                        {widget.description}
                      </p>
                    ) : null}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => handleSelect(widget)}
                  >
                    {t('studio.widget.useWidget')}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
