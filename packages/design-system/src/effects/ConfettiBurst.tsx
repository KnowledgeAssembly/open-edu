import { useEffect, useMemo, useState } from 'react';
import { motionSafe } from '../tokens/motion.js';
import { cn } from '../lib/utils.js';

const DEFAULT_COLORS = [
  'var(--oe-color-primary, #6750a4)',
  'var(--oe-color-success, #16a34a)',
  'var(--oe-color-warning, #e7c365)',
  'var(--oe-color-error, #dc2626)',
  'var(--oe-color-info, #003eb3)',
];

export interface ConfettiBurstProps {
  particleCount?: number;
  colors?: string[];
  duration?: number;
  className?: string;
}

export function ConfettiBurst({
  particleCount = 16,
  colors = DEFAULT_COLORS,
  duration = 1.5,
  className,
}: ConfettiBurstProps): JSX.Element | null {
  const [animDone, setAnimDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimDone(true), duration * 1000);
    return () => clearTimeout(timer);
  }, [duration]);

  const particles = useMemo(
    () =>
      Array.from({ length: particleCount }, (_, i) => {
        const angle = (i / particleCount) * 360;
        const distance = 40 + Math.random() * 60;
        return {
          id: i,
          color: colors.length > 0 ? colors[i % colors.length] : '#6750a4',
          translateX: Math.cos((angle * Math.PI) / 180) * distance,
          translateY: Math.sin((angle * Math.PI) / 180) * distance,
          rotation: Math.random() * 720,
          size: 4 + Math.random() * 4,
          delay: Math.random() * 0.2,
        };
      }),
    [particleCount, colors],
  );

  if (animDone) return null;

  return (
    <>
      <style>{motionSafe(`
        @keyframes confetti-burst {
          0% { transform: translate(0, 0) rotate(0deg) scale(1); opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) rotate(var(--rot)) scale(0); opacity: 0; }
        }
      `)}</style>
      <div
        className={cn('relative pointer-events-none', className)}
        data-testid="confetti-burst"
        aria-hidden="true"
      >
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-sm"
            style={{
              width: `${p.size}px`,
              height: `${p.size}px`,
              backgroundColor: p.color,
              left: '50%',
              top: '50%',
              '--tx': `${p.translateX}px`,
              '--ty': `${p.translateY}px`,
              '--rot': `${p.rotation}deg`,
              animation: `confetti-burst ${duration}s ease-out ${p.delay}s forwards`,
            } as React.CSSProperties}
          />
        ))}
      </div>
    </>
  );
}

ConfettiBurst.displayName = 'ConfettiBurst';
