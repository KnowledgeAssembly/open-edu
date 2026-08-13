import { Card, CardContent, CardDescription, CardTitle, Button } from '@open-edu/design-system';
import { Sparkles } from 'lucide-react';
import { useTranslation } from '@open-edu/i18n';
import { useStudioAssistant } from '../ai/StudioAssistantProvider';

export function AiStartPanel() {
  const { t } = useTranslation();
  const { openWithPreset } = useStudioAssistant();

  return (
    <Card className="border-outline-variant bg-surface">
      <CardTitle className="text-on-surface px-6 pt-6">{t('studio.home.aiHeading')}</CardTitle>
      <CardDescription className="px-6 pt-2">{t('studio.home.aiLede')}</CardDescription>
      <CardContent className="px-6 pb-6 pt-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="default"
            size="sm"
            onClick={() =>
              openWithPreset({
                message: t('studio.assistant.courseDraft.presetNotes'),
              })
            }
          >
            <Sparkles className="mr-1 size-4" aria-hidden="true" />
            {t('studio.assistant.open')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
