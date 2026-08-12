import { cn } from '@open-edu/design-system';
import { useCallback, useRef } from 'react';
import { useResizablePanel } from '../hooks/useResizablePanel';
import { useStudioAssistant, useStudioChat } from '../ai';
import { AssistantContextStrip } from './AssistantContextStrip';
import { StudioAssistantChat } from './StudioAssistantChat';
import { useTranslation } from '@open-edu/i18n';
import { useAssistantShortcut } from '../hooks/useAssistantShortcut';
import { Sparkles } from 'lucide-react';

export function StudioRightSidebar() {
  const { t } = useTranslation();
  const { panelOpen, setPanelOpen, panelWidth, setPanelWidth } = useStudioAssistant();
  const { sendMessage } = useStudioChat();
  const panelOpenRef = useRef(panelOpen);
  panelOpenRef.current = panelOpen;

  const togglePanel = useCallback(() => {
    setPanelOpen(!panelOpenRef.current);
  }, [setPanelOpen]);

  useAssistantShortcut(togglePanel);

  const { width, isDragging, handleProps } = useResizablePanel({
    initialWidth: panelWidth,
    minWidth: 280,
    maxWidth: 480,
    ariaLabel: t('studio.assistant.label'),
    onWidthChange: setPanelWidth,
  });

  if (!panelOpen) {
    return (
      <div className="border-outline-variant bg-surface flex w-12 shrink-0 flex-col items-center border-l py-2">
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          className="text-on-surface-variant hover:text-on-surface flex items-center justify-center rounded-md p-2 transition-colors"
          title={t('studio.assistant.rail.collapsed')}
          aria-label={t('studio.assistant.open')}
        >
          <Sparkles className="size-5" />
        </button>
      </div>
    );
  }

  return (
    <aside
      role="complementary"
      aria-label={t('studio.assistant.label')}
      className={cn(
        'border-outline-variant bg-surface relative flex shrink-0 flex-col overflow-hidden border-l transition-all duration-300',
        isDragging ? 'transition-none' : '',
      )}
      style={{ width }}
    >
      <div
        {...handleProps}
        className="bg-primary-container absolute left-0 top-0 z-10 h-full w-1 cursor-col-resize opacity-0 hover:opacity-100"
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="border-outline-variant flex items-center justify-between border-b p-4">
          <h3 className="text-on-surface text-sm font-semibold">{t('studio.assistant.label')}</h3>
          <button
            type="button"
            onClick={() => setPanelOpen(false)}
            className="text-on-surface-variant hover:text-on-surface text-xs"
            aria-label={t('studio.assistant.close')}
          >
            {t('studio.assistant.close')}
          </button>
        </div>

        <AssistantContextStrip onSend={(msg) => sendMessage(msg)} />

        <div className="min-h-0 flex-1">
          <StudioAssistantChat />
        </div>
      </div>
    </aside>
  );
}
