import { type ReactNode, Children, isValidElement } from 'react';
import { cn } from '../lib/utils.js';
import { motionSafe } from '../tokens/motion.js';

export interface StaggerRevealProps {
  children: ReactNode;
  delayMs?: number;
  initialOpacity?: number;
  initialTranslateY?: number;
  className?: string;
}

export function StaggerReveal({
  children,
  delayMs = 100,
  initialOpacity = 0,
  initialTranslateY = 8,
  className,
}: StaggerRevealProps): JSX.Element {
  return (
    <div className={cn(className)} data-testid="stagger-reveal">
      <style>
        {motionSafe(`
        @keyframes stagger-fade-in {
          0% { opacity: var(--stagger-initial-opacity); transform: translateY(var(--stagger-initial-y)); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `)}
      </style>
      {Children.map(children, (child, index) => {
        if (!isValidElement(child)) return child;
        return (
          <div
            style={
              {
                ...child.props.style,
                animation: `stagger-fade-in 0.3s ease-out ${index * delayMs}ms both`,
                '--stagger-initial-opacity': initialOpacity,
                '--stagger-initial-y': `${initialTranslateY}px`,
              } as React.CSSProperties
            }
          >
            {child}
          </div>
        );
      })}
    </div>
  );
}

StaggerReveal.displayName = 'StaggerReveal';
