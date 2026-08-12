import { useState, useEffect, useCallback } from 'react';

export function useAssistantShortcut() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleAssistant = useCallback(() => {
    setIsOpen(prev => !prev);
    return !isOpen;
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        toggleAssistant();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleAssistant]);

  return { isOpen, toggleAssistant };
}