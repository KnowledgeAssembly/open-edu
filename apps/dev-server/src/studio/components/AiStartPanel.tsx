import { useEffect, useRef, useState } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardTitle,
  Textarea,
  EmptyState,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@open-edu/design-system';
import { Sparkles, Upload } from 'lucide-react';
import { useTranslation } from '@open-edu/i18n';
import type { StudioApi, StudioApiError } from '../studioApi.js';
import type { AiGenerateResult } from '../ai/types.js';

type Status = 'checking' | 'available' | 'unavailable';
type Mode = 'ai' | 'upload';

interface FileSpec {
  name: string;
  content: string;
  ext: '.json' | '.md';
}

export function AiStartPanel({
  api,
  onGenerated,
  onError,
}: {
  api: StudioApi;
  onGenerated: (result: AiGenerateResult) => void;
  onError: (message: string) => void;
}) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<Status>('checking');
  const [mode, setMode] = useState<Mode>('ai');
  const [notes, setNotes] = useState('');
  const [fileSpec, setFileSpec] = useState<FileSpec | null>(null);
  const [generating, setGenerating] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getAiStatus()
      .then(({ available }) => {
        if (!cancelled) setStatus(available ? 'available' : 'unavailable');
      })
      .catch(() => {
        if (!cancelled) setStatus('unavailable');
      });
    return () => {
      cancelled = true;
    };
  }, [api]);

  const runGenerate = async (force: boolean) => {
    if (notes.trim().length === 0) return;
    setGenerating(true);
    setInlineError(null);
    try {
      const result = await api.generateFromNotes(notes, force);
      if (result.success) {
        setConfirmOverwrite(false);
        onGenerated(result);
      } else if (result.code === 'has-content') {
        setConfirmOverwrite(true);
      } else {
        setInlineError(
          result.code === 'notes-too-short'
            ? t('studio.ai.notesTooShort')
            : t('studio.ai.errorGeneric'),
        );
      }
    } catch (err) {
      const error = err as StudioApiError;
      if (error.code === 'no-active-package') {
        onError(t('studio.ai.noActivePackage'));
      } else if (error.code === 'missing-notes') {
        onError(t('studio.ai.notesTooShort'));
      } else {
        onError(error instanceof Error ? error.message : t('studio.ai.errorGeneric'));
      }
    } finally {
      setGenerating(false);
    }
  };

  const runUpload = async (force: boolean) => {
    if (!fileSpec) return;
    setGenerating(true);
    setUploadError(null);
    try {
      const result = await api.uploadSpec(fileSpec.content, fileSpec.ext, force);
      if (result.success) {
        setConfirmOverwrite(false);
        onGenerated(result);
      } else if (result.code === 'has-content') {
        setConfirmOverwrite(true);
      } else {
        setUploadError(
          result.error ??
            (result.code === 'spec-invalid'
              ? t('studio.ai.specInvalid')
              : t('studio.ai.uploadError')),
        );
      }
    } catch (err) {
      const error = err as StudioApiError;
      if (error.code === 'no-active-package') {
        onError(t('studio.ai.noActivePackage'));
      } else if (error.code === 'missing-notes') {
        onError(t('studio.ai.notesTooShort'));
      } else {
        onError(error instanceof Error ? error.message : t('studio.ai.uploadError'));
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerate = () => void runGenerate(false);
  const handleUpload = () => void runUpload(false);
  const handleConfirmOverwrite = () => {
    if (mode === 'upload') void runUpload(true);
    else void runGenerate(true);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const lowerName = file.name.toLowerCase();
    const ext = lowerName.endsWith('.md') ? '.md' : lowerName.endsWith('.json') ? '.json' : null;
    if (!ext) {
      setFileSpec(null);
      setUploadError(t('studio.ai.specInvalid'));
      return;
    }
    try {
      const content = await file.text();
      setFileSpec({ name: file.name, content, ext });
      setUploadError(null);
    } catch {
      setUploadError(t('studio.ai.uploadError'));
    }
  };

  return (
    <>
      <Card className="border-outline-variant bg-surface">
        <CardTitle className="text-on-surface px-6 pt-6">{t('studio.home.aiHeading')}</CardTitle>
        <CardDescription className="px-6 pt-2">{t('studio.home.aiLede')}</CardDescription>
        <CardContent className="px-6 pb-6 pt-4">
          <Tabs value={mode} onValueChange={(value) => setMode(value as Mode)} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="ai">{t('studio.ai.aiTab')}</TabsTrigger>
              <TabsTrigger value="upload">{t('studio.ai.specTab')}</TabsTrigger>
            </TabsList>

            <TabsContent value="ai" className="mt-4">
              {status === 'unavailable' ? (
                <EmptyState
                  heading={t('studio.ai.unavailable')}
                  description={t('studio.ai.useTemplateHint')}
                />
              ) : status === 'checking' ? (
                <p className="text-on-surface-variant text-sm">…</p>
              ) : (
                <div className="space-y-4">
                  <label className="text-on-surface block text-sm font-medium">
                    {t('studio.ai.notesLabel')}
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={t('studio.ai.notesPlaceholder')}
                      rows={4}
                      className="text-on-surface mt-2"
                    />
                  </label>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="default"
                      size="sm"
                      disabled={generating || notes.trim().length === 0}
                      onClick={handleGenerate}
                    >
                      <Sparkles className="mr-1 size-4" aria-hidden="true" />
                      {generating ? t('studio.ai.generating') : t('studio.ai.generate')}
                    </Button>
                  </div>
                  {inlineError ? (
                    <p className="text-error text-sm" role="alert">
                      {inlineError}
                    </p>
                  ) : null}
                </div>
              )}
            </TabsContent>

            <TabsContent value="upload" className="mt-4">
              <div className="space-y-4">
                <p className="text-on-surface text-sm">{t('studio.ai.specLabel')}</p>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="mr-1 size-4" aria-hidden="true" />
                    {t('studio.ai.browse')}
                  </Button>
                  <span className="text-on-surface-variant truncate text-sm">
                    {fileSpec ? fileSpec.name : t('studio.ai.specHint')}
                  </span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.md,application/json,text/markdown"
                  className="hidden"
                  onChange={handleFileChange}
                  aria-label={t('studio.ai.browse')}
                />
                <div className="flex items-center gap-3">
                  <Button
                    variant="default"
                    size="sm"
                    disabled={generating || !fileSpec}
                    onClick={handleUpload}
                  >
                    {generating ? t('studio.ai.uploading') : t('studio.ai.upload')}
                  </Button>
                </div>
                {uploadError ? (
                  <p className="text-error text-sm" role="alert">
                    {uploadError}
                  </p>
                ) : null}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={confirmOverwrite} onOpenChange={(open) => setConfirmOverwrite(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('studio.ai.overwriteTitle')}</DialogTitle>
            <DialogDescription>{t('studio.ai.overwriteLede')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              disabled={generating}
              onClick={() => setConfirmOverwrite(false)}
            >
              {t('studio.ai.overwriteCancel')}
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={generating}
              onClick={handleConfirmOverwrite}
            >
              {t('studio.ai.overwriteConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
