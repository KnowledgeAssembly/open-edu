import { useState, useCallback } from 'react';

export interface ObserveModeOptions {
  isObserve: boolean | null;
  onComplete: (score?: number) => void;
  onInteract: (data: Record<string, unknown>) => void;
  widgetId: string;
}

export function useObserveMode({
  isObserve,
  onComplete,
  onInteract,
  widgetId,
}: ObserveModeOptions) {
  const [acknowledged, setAcknowledged] = useState(false);

  const handleAcknowledge = useCallback(() => {
    onInteract({
      type: 'widget.interaction',
      action: 'observe',
      observed: true,
      correct: true,
      widgetId,
      acknowledged: true,
    });
    onComplete(100);
    setAcknowledged(true);
  }, [onComplete, onInteract, widgetId]);

  return {
    acknowledged,
    handleAcknowledge,
    showAcknowledgeButton: !!(isObserve && !acknowledged),
  };
}
