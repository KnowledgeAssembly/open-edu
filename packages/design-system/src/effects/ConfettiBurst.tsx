import { useEffect, useMemo, useState } from 'react';
import { motionSafe, useReducedMotion } from '../tokens/motion.js';
import { cn } from '../lib/utils.js';

const DEFAULT_COLORS = [
  'var(--oe-color-primary)',
  'var(--oe-color-success)',
  'var(--oe-color-warning)',
  'var(--oe-color-error)',
  'var(--oe-color-info)',
];

export interface ConfettiBurstProps {
  particleCount?: number;
  colors?: string[];
  duration?: number;
  className?: string;
  variant?: 'burst' | 'fall';
}

function useConfettiParticles(particleCount: number, colors: string[], variant: 'burst' | 'fall') {
  return useMemo(() => {
    const seed = variant === 'fall' ? 0.5 : 0;
    return Array.from({ length: particleCount }, (_, i) => {
      const angle = (i / particleCount) * 360 + seed * 360;
      const distance = variant === 'fall' ? 100 : 40 + Math.random() * 60;
      return {
        id: i,
        color: colors.length > 0 ? colors[i % colors.length] : 'var(--oe-color-primary)',
        translateX:
          variant === 'fall'
            ? (Math.random() - 0.5) * 80
            : Math.cos((angle * Math.PI) / 180) * distance,
        translateY:
          variant === 'fall'
            ? 100 + Math.random() * 200
            : Math.sin((angle * Math.PI) / 180) * distance,
        rotation: Math.random() * 720,
        size: variant === 'fall' ? 6 + Math.random() * 6 : 4 + Math.random() * 4,
        delay: variant === 'fall' ? Math.random() * 2 : Math.random() * 0.2,
        left: variant === 'fall' ? Math.random() * 100 : undefined,
        top: variant === 'fall' ? -10 : undefined,
        duration: variant === 'fall' ? 2 + Math.random() * 2 : undefined,
      };
    });
  }, [particleCount, colors, variant]);
}

export function ConfettiBurst({
  particleCount = 16,
  colors = DEFAULT_COLORS,
  duration = 1.5,
  className,
  variant = 'burst',
}: ConfettiBurstProps): JSX.Element | null {
  const [animDone, setAnimDone] = useState(false);
  const reduced = useReducedMotion();

  const particleDuration = variant === 'fall' ? 4 : duration;
  useEffect(() => {
    const timer = setTimeout(() => setAnimDone(true), particleDuration * 1000);
    return () => clearTimeout(timer);
  }, [particleDuration]);

  const particles = useConfettiParticles(particleCount, colors, variant);
  const keyframeName = variant === 'fall' ? 'confetti-fall' : 'confetti-burst';

  if (reduced || animDone) return null;

  return (
    <>
      <style>
        {motionSafe(`
        @keyframes confetti-burst {
          0% { transform: translate(0, 0) rotate(0deg) scale(1); opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) rotate(var(--rot)) scale(0); opacity: 0; }
        }
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `)}
      </style>
      <div
        className={cn(
          variant === 'fall' ? 'fixed inset-0 z-50 overflow-hidden' : 'relative',
          'pointer-events-none',
          className,
        )}
        data-testid={variant === 'fall' ? 'confetti-fall' : 'confetti-burst'}
        aria-hidden="true"
      >
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-sm"
            style={
              {
                width: `${p.size}px`,
                height: `${p.size}px`,
                backgroundColor: p.color,
                left: p.left != null ? `${p.left}%` : '50%',
                top: p.top != null ? `${p.top}px` : '50%',
                '--tx': `${p.translateX}px`,
                '--ty': `${p.translateY}px`,
                '--rot': `${p.rotation}deg`,
                animation: `${keyframeName} ${p.duration ?? duration}s ease-out ${p.delay}s forwards`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
    </>
  );
}

ConfettiBurst.displayName = 'ConfettiBurst';
