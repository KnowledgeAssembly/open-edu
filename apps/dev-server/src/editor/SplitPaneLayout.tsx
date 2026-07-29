import { type ReactNode, useCallback, useState } from 'react';
import { ResizablePanel } from '@open-edu/design-system';

const STORAGE_KEY = 'devserver-split-ratio';

interface SplitPaneLayoutProps {
  editorContent: ReactNode;
  previewContent: ReactNode;
  showPreview: boolean;
  onTogglePreview: () => void;
}

export function SplitPaneLayout({
  editorContent,
  previewContent,
  showPreview,
  onTogglePreview,
}: SplitPaneLayoutProps): JSX.Element {
  const [ratio, setRatio] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    return saved ? Number(saved) : 0.5;
  });

  const handleRatioChange = useCallback((newRatio: number) => {
    setRatio(newRatio);
    localStorage.setItem(STORAGE_KEY, String(newRatio));
  }, []);

  return (
    <ResizablePanel
      left={editorContent}
      right={previewContent}
      defaultRatio={ratio}
      collapsed={!showPreview}
      onCollapse={onTogglePreview}
      onExpand={onTogglePreview}
      onRatioChange={handleRatioChange}
      leftClassName="bg-surface"
      rightClassName="bg-surface-container-low"
      minRightPx={350}
      minLeftPct={30}
    />
  );
}
