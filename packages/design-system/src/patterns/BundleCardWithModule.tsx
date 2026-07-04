import * as React from 'react';
import { OpenModule } from '../primitives/open-module.js';

export interface BundleCardWithModuleProps {
  completedModules: number;
  totalModules: number;
  children: React.ReactNode;
}

export function getBundleSatellites(completedModules: number, totalModules: number): number {
  if (totalModules <= 0) return 2;
  const percent = (completedModules / totalModules) * 100;
  if (percent === 0) return 2;
  if (percent >= 100) return 6;
  return 3 + Math.min(Math.floor((percent / 100) * 3), 3);
}

export function BundleCardWithModule({
  completedModules,
  totalModules,
  children,
}: BundleCardWithModuleProps): JSX.Element {
  const satellites = getBundleSatellites(completedModules, totalModules);

  return (
    <div className="relative">
      <div className="absolute right-4 top-4 z-10">
        <OpenModule size="xs" satellites={satellites} aria-hidden="true" />
      </div>
      {children}
    </div>
  );
}
