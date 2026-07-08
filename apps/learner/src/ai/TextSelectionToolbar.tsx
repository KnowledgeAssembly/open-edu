import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@open-edu/design-system';
import { useCompanion } from './CompanionProvider';
import { MessageCircle, BookOpen, Languages, Volume2, Sparkles } from 'lucide-react';

export interface TextSelectionToolbarProps {
  containerRef?: React.RefObject<HTMLElement | null>;
}

type ToolbarAction = 'explain' | 'define' | 'translate' | 'pronounce' | 'ask';

interface ToolbarPosition {
  top: number;
  left: number;
}

const SELECTION_DEBOUNCE_MS = 10;
const OUTSIDE_CLICK_DEBOUNCE_MS = 200;

export function TextSelectionToolbar({
  containerRef,
}: TextSelectionToolbarProps): JSX.Element | null {
  const [selectedText, setSelectedText] = useState('');
  const [position, setPosition] = useState<ToolbarPosition | null>(null);
  const [visible, setVisible] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const { setPanelState, sendMessage, search } = useCompanion();

  const isInsideContainer = useCallback(
    (node: Node | null): boolean => {
      if (!containerRef?.current) return true;
      if (!node) return false;
      return containerRef.current.contains(node);
    },
    [containerRef],
  );

  useEffect(() => {
    const handleMouseUp = () => {
      setTimeout(() => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed) {
          setVisible(false);
          setSelectedText('');
          setPosition(null);
          return;
        }

        const text = sel.toString().trim();
        if (!text || !isInsideContainer(sel.anchorNode)) {
          setVisible(false);
          setSelectedText('');
          setPosition(null);
          return;
        }

        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        setSelectedText(text);
        setPosition({
          top: rect.top - 8,
          left: rect.left + rect.width / 2,
        });
        setVisible(true);
      }, SELECTION_DEBOUNCE_MS);
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setTimeout(() => {
          const sel = window.getSelection();
          if (!sel || sel.isCollapsed) {
            setVisible(false);
            setSelectedText('');
            setPosition(null);
          }
        }, OUTSIDE_CLICK_DEBOUNCE_MS);
      }
    };

    const handleScroll = () => {
      if (!visible) return;
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed) {
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setPosition({
          top: rect.top - 8,
          left: rect.left + rect.width / 2,
        });
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('scroll', handleScroll, true);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, [isInsideContainer, visible]);

  const clearSelection = useCallback(() => {
    window.getSelection()?.removeAllRanges();
    setVisible(false);
    setSelectedText('');
    setPosition(null);
  }, []);

  const handleAction = useCallback(
    (action: ToolbarAction) => {
      if (!selectedText) return;

      switch (action) {
        case 'explain': {
          setPanelState('floating');
          sendMessage(`Explain this: "${selectedText}"`);
          break;
        }
        case 'define': {
          const result = search(selectedText);
          const entry = result.instant.entry;
          if (entry) {
            const def = entry.definitions[0]?.definition ?? '';
            const msg = `**${entry.word}**${entry.phonetic ? ` (/${entry.phonetic}/)` : ''} — ${entry.partOfSpeech ? `*${entry.partOfSpeech}* ` : ''}${def}${entry.definitions[0]?.example ? `\n\n> ${entry.definitions[0].example}` : ''}`;
            setPanelState('floating');
            sendMessage(`Define "${selectedText}": ${msg}`);
          } else {
            setPanelState('floating');
            sendMessage(`Define "${selectedText}"`);
          }
          break;
        }
        case 'translate': {
          setPanelState('floating');
          sendMessage(`Translate this to simple English: "${selectedText}"`);
          break;
        }
        case 'pronounce': {
          if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(selectedText);
            utterance.rate = 0.9;
            utterance.pitch = 1;
            speechSynthesis.speak(utterance);
          }
          break;
        }
        case 'ask': {
          setPanelState('floating');
          sendMessage(selectedText);
          break;
        }
      }

      clearSelection();
    },
    [selectedText, setPanelState, sendMessage, search, clearSelection],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, action: ToolbarAction) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleAction(action);
      }
    },
    [handleAction],
  );

  if (!visible || !position) return null;

  const toolbarWidth = 280;
  const toolbarHeight = 44;

  let top = position.top - toolbarHeight - 12;
  let left = position.left - toolbarWidth / 2;

  if (top < 8) {
    top = position.top + 16;
  }

  if (left < 8) {
    left = 8;
  }
  if (left + toolbarWidth > window.innerWidth - 8) {
    left = window.innerWidth - toolbarWidth - 8;
  }

  const actions: Array<{ key: ToolbarAction; label: string; icon: React.ReactNode }> = [
    { key: 'explain', label: 'Explain', icon: <Sparkles className="h-4 w-4" /> },
    { key: 'define', label: 'Define', icon: <BookOpen className="h-4 w-4" /> },
    { key: 'translate', label: 'Translate', icon: <Languages className="h-4 w-4" /> },
    { key: 'pronounce', label: 'Pronounce', icon: <Volume2 className="h-4 w-4" /> },
    { key: 'ask', label: 'Ask', icon: <MessageCircle className="h-4 w-4" /> },
  ];

  return createPortal(
    <div
      ref={toolbarRef}
      className={cn(
        'bg-surface-container-high text-on-surface z-[9999] flex items-center gap-0.5 rounded-lg border px-1.5 py-1 shadow-lg',
      )}
      style={{
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
      }}
      role="toolbar"
      aria-label="Text selection actions"
      data-testid="text-selection-toolbar"
      data-state="open"
    >
      {actions.map(({ key, label, icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => handleAction(key)}
          onKeyDown={(e) => handleKeyDown(e, key)}
          className={cn(
            'hover:bg-surface-container-high-hover text-on-surface-variant flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
            'focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
          )}
          aria-label={label}
          data-testid={`toolbar-action-${key}`}
        >
          {icon}
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>,
    document.body,
  );
}
