import { cn } from '@open-edu/design-system';
import { useCallback, useRef, useEffect, useState } from 'react';
import { useResizablePanel } from '../hooks/useResizablePanel';
import { useStudioAssistant, useStudioChat } from '../ai';
import { AssistantContextStrip } from './AssistantContextStrip';
import { StudioAssistantChat } from './StudioAssistantChat';
import { useTranslation } from '@open-edu/i18n';
import { useAssistantShortcut } from '../hooks/useAssistantShortcut';
import { Sparkles, Plus, ChevronRight } from 'lucide-react';

export function StudioRightSidebar() {
  const { t } = useTranslation();
  const { panelOpen, setPanelOpen, panelWidth, setPanelWidth } = useStudioAssistant();
  const { sendMessage, clearMessages } = useStudioChat();
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

  // prefers-reduced-motion: avoid width transition when the user prefers
  // reduced motion. The class is applied via a matchMedia listener.
  const prefersReducedMotion = usePrefersReducedMotion();

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
        'border-outline-variant bg-surface relative flex shrink-0 flex-col overflow-hidden border-l',
        'transition-[width] duration-200 ease-in-out',
        isDragging && 'transition-none',
        prefersReducedMotion && 'transition-none',
        'shadow-sm',
      )}
      style={{ width }}
    >
      <div
        {...handleProps}
        className="bg-primary-container absolute left-0 top-0 z-10 h-full w-1 cursor-col-resize opacity-0 hover:opacity-100"
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="border-outline-variant flex h-16 shrink-0 items-center justify-between px-4">
          <h3 className="text-on-surface text-sm font-semibold">{t('studio.assistant.label')}</h3>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                clearMessages();
              }}
              className="text-on-surface-variant hover:text-on-surface flex items-center gap-1 rounded-md p-1 text-[11px] transition-colors"
              aria-label={t('studio.assistant.newConversation')}
              title={t('studio.assistant.historyLabel')}
            >
              <Plus className="size-3.5" />
              <span className="hidden sm:inline">{t('studio.assistant.newConversation')}</span>
            </button>
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              className="text-on-surface-variant hover:text-on-surface rounded-md p-1 transition-colors"
              aria-label={t('studio.assistant.close')}
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        <AssistantContextStrip onSend={(msg) => sendMessage(msg)} />

        <div className="min-h-0 flex-1">
          <StudioAssistantChat />
        </div>
      </div>
    </aside>
  );
}

/** Lightweight `useEffect`-based matchMedia listener. */
function usePrefersReducedMotion(): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return matches;
}
