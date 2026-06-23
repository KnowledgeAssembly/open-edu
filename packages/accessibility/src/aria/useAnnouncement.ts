import { useCallback } from 'react';
import { useAriaContext, type AnnouncementPriority } from './AriaContext.js';

export function useAnnouncement(): (message: string, priority?: AnnouncementPriority) => void {
  const { announce } = useAriaContext();
  return useCallback(
    (message: string, priority: AnnouncementPriority = 'polite') => {
      announce(message, priority);
    },
    [announce],
  );
}
