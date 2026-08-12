import { cn } from '@open-edu/design-system';
import { useResizablePanel } from '../hooks/useResizablePanel';
import { useStudioAssistant } from '../ai';
import { useStudioChat } from '../ai';
import { AssistantContextStrip } from './AssistantContextStrip';
import { StudioAssistantChat } from './StudioAssistantChat';
import { useTranslation } from '@open-edu/i18n';
import { useAssistantShortcut } from '../hooks/useAssistantShortcut';
import { Sparkles } from 'lucide-react';

export function StudioRightSidebar() {
  const { t } = useTranslation();
  const { panelOpen, setPanelOpen, panelWidth, setPanelWidth } = useStudioAssistant();
  const { sendMessage } = useStudioChat();

  useAssistantShortcut();

  const { width, isDragging, handleProps } = useResizablePanel({
    initialWidth: panelWidth,
    minWidth: 280,
    maxWidth: 480,
    ariaLabel: t('studio.assistant.label'),
    onWidthChange: setPanelWidth,
  });

  if (!panelOpen) {
    return (
      <div className="flex shrink-0 flex-col items-center border-l border-border bg-background w-12 py-2">
        <button
          onClick={() => setPanelOpen(true)}
          className="text-muted-foreground hover:text-foreground flex items-center justify-center rounded-md p-2 transition-colors"
          title={t('studio.assistant.rail.collapsed')}
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
        'flex shrink-0 flex-col overflow-hidden border-l border-border bg-background transition-all duration-300',
        isDragging ? 'transition-none' : '',
      )}
      style={{ width }}
    >
      <div 
        {...handleProps} 
        className="absolute left-0 top-0 z-10 h-full w-1 cursor-col-resize hover:bg-primary/50" 
      />
      
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h3 className="text-sm font-semibold">{t('studio.assistant.label')}</h3>
          <button 
            onClick={() => setPanelOpen(false)}
            className="text-xs text-muted-foreground hover:text-foreground"
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