import * as React from 'react';
import { cn } from '../lib/utils.js';
import { AssemblyFlow, type AssemblyFlowDensity } from '../primitives/assembly-flow.js';

export interface SectionDividerProps extends React.HTMLAttributes<HTMLDivElement> {
  density?: AssemblyFlowDensity;
  animated?: boolean;
}

export function SectionDivider({
  density = 'minimal',
  animated = false,
  className,
  ...props
}: SectionDividerProps): JSX.Element {
  return (
    <div
      className={cn('w-full overflow-hidden', className)}
      role="separator"
      aria-hidden="true"
      {...props}
    >
      <AssemblyFlow density={density} animated={animated} className="h-8 w-full opacity-15" />
    </div>
  );
}
