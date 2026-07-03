import * as React from 'react';
import { cn } from '../lib/utils.js';

export type AssemblyFlowDensity = 'dense' | 'medium' | 'minimal';

export interface AssemblyFlowProps extends React.SVGAttributes<SVGSVGElement> {
  density?: AssemblyFlowDensity;
  animated?: boolean;
}

interface FlowNode {
  x: number;
  y: number;
  size: 'faint' | 'light' | 'default' | 'accent' | 'large';
  color: 'primary' | 'accent' | 'primary-container';
}

const nodeSizeMap: Record<FlowNode['size'], number> = {
  faint: 6,
  light: 10,
  default: 12,
  accent: 14,
  large: 16,
};

const nodeOpacityMap: Record<FlowNode['size'], number> = {
  faint: 0.12,
  light: 0.25,
  default: 0.5,
  accent: 0.5,
  large: 0.6,
};

const colorClassMap: Record<FlowNode['color'], string> = {
  primary: 'text-primary',
  accent: 'text-accent',
  'primary-container': 'text-primary-container',
};

function assignColors(nodes: FlowNode[]): FlowNode[] {
  const total = nodes.length;
  const primaryCount = Math.round(total * 0.6);
  const accentCount = Math.round(total * 0.3);
  return nodes.map((node, i) => {
    if (i < primaryCount) return { ...node, color: 'primary' as const };
    if (i < primaryCount + accentCount) return { ...node, color: 'accent' as const };
    return { ...node, color: 'primary-container' as const };
  });
}

function assignSizes(nodes: FlowNode[], density: AssemblyFlowDensity): FlowNode[] {
  const sizeSequence: FlowNode['size'][] = density === 'dense'
    ? ['faint', 'light', 'default', 'accent', 'default', 'light', 'accent', 'faint', 'light']
    : density === 'medium'
      ? ['faint', 'default', 'accent', 'default', 'faint']
      : ['light', 'default', 'light'];
  return nodes.map((node, i) => ({
    ...node,
    size: sizeSequence[i % sizeSequence.length]!,
  }));
}

function buildPath(nodes: FlowNode[]): string {
  if (nodes.length < 2) return '';
  const first = nodes[0]!;
  let d = `M ${first.x} ${first.y}`;
  for (let i = 0; i < nodes.length - 1; i++) {
    const p0 = nodes[i > 0 ? i - 1 : i]!;
    const p1 = nodes[i]!;
    const p2 = nodes[i + 1]!;
    const p3 = nodes[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y}`;
  }
  return d;
}

function generateNodes(density: AssemblyFlowDensity): FlowNode[] {
  const configs: Record<AssemblyFlowDensity, Array<{ x: number; y: number }>> = {
    dense: [
      { x: 15, y: 55 }, { x: 50, y: 35 }, { x: 90, y: 65 },
      { x: 130, y: 30 }, { x: 170, y: 60 }, { x: 210, y: 40 },
      { x: 250, y: 65 }, { x: 285, y: 45 },
    ],
    medium: [
      { x: 20, y: 50 }, { x: 85, y: 35 }, { x: 150, y: 60 },
      { x: 215, y: 40 }, { x: 280, y: 55 },
    ],
    minimal: [
      { x: 30, y: 55 }, { x: 150, y: 40 }, { x: 270, y: 50 },
    ],
  };
  const raw = configs[density];
  const withSizes = assignSizes(
    raw.map((p) => ({ ...p, size: 'default' as const, color: 'primary' as const })),
    density,
  );
  return assignColors(withSizes);
}

export const AssemblyFlow = React.forwardRef<SVGSVGElement, AssemblyFlowProps>(
  ({ density = 'medium', animated = false, className, ...props }, ref) => {
    const nodes = generateNodes(density);
    const pathD = buildPath(nodes);

    return (
      <svg
        ref={ref}
        viewBox="0 0 300 100"
        className={cn('w-full h-auto', className)}
        aria-hidden="true"
        {...props}
      >
        <defs>
          {animated && (
            <style>
              {`@keyframes dash-flow {
                  from { stroke-dashoffset: 0; }
                  to { stroke-dashoffset: -13; }
                }
                @media (prefers-reduced-motion: reduce) {
                  .assembly-flow-path { animation: none !important; }
                }`}
            </style>
          )}
        </defs>
        <path
          d={pathD}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="8 5"
          className={cn(
            'text-primary',
            animated && 'assembly-flow-path',
          )}
          style={{
            opacity: 0.15,
            ...(animated ? { animation: 'dash-flow 3s linear infinite' } : {}),
          }}
        />
        {nodes.map((node, i) => (
          <circle
            key={i}
            cx={node.x}
            cy={node.y}
            r={nodeSizeMap[node.size] / 2}
            fill="currentColor"
            className={colorClassMap[node.color]}
            style={{ opacity: nodeOpacityMap[node.size] }}
          />
        ))}
      </svg>
    );
  },
);
AssemblyFlow.displayName = 'AssemblyFlow';
