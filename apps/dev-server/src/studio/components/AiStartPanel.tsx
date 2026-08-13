import { useRef } from 'react';
import { Card, CardContent, CardDescription, CardTitle, Button } from '@open-edu/design-system';
import { Sparkles, Upload } from 'lucide-react';
import { useTranslation } from '@open-edu/i18n';
import { useStudioAssistant } from '../ai/StudioAssistantProvider';
import { resolveSpecExtension, SPEC_FILE_ACCEPT } from '../ai/specFile';

export function AiStartPanel({ onError }: { onError?: (message: string) => void }) {
  const { t } = useTranslation();
  const { openWithPreset } = useStudioAssistant();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const ext = resolveSpecExtension(file.name);
    if (!ext) {
      onError?.(t('studio.ai.specInvalid'));
      return;
    }
    const content = await file.text();
    openWithPreset({
      spec: { name: file.name, content, ext },
    });
  };

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
                prefill: true,
              })
            }
          >
            <Sparkles className="mr-1 size-4" aria-hidden="true" />
            {t('studio.assistant.open')}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept={SPEC_FILE_ACCEPT}
            className="hidden"
            aria-label={t('studio.ai.upload')}
            onChange={(e) => void handleFileChange(e)}
          />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-1 size-4" aria-hidden="true" />
            {t('studio.ai.upload')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
