import { type ReactNode } from 'react';

export interface SplitViewProps {
  left: ReactNode;
  right: ReactNode;
  defaultRatio?: number;
  minLeftWidth?: string;
}

export function SplitView({
  left,
  right,
  defaultRatio = 0.5,
  minLeftWidth,
}: SplitViewProps): JSX.Element {
  return (
    <div className="flex h-full">
      <div className="overflow-auto" style={{ flex: defaultRatio, minWidth: minLeftWidth }}>
        {left}
      </div>
      <div className="bg-outline-variant w-px shrink-0" />
      <div className="overflow-auto" style={{ flex: 1 - defaultRatio }}>
        {right}
      </div>
    </div>
  );
}
