import { useState } from 'react';
import { useTranslation } from '@open-edu/i18n';
import { cn, motionSafe } from '@open-edu/design-system';

interface Hotspot {
  id: string;
  labelKey: string;
  infoKey: string;
  top: string;
  left: string;
}

const HOTSPOTS: Hotspot[] = [
  {
    id: 'crater',
    labelKey: 'website.hotspot.crater',
    infoKey: 'website.hotspot.crater_info',
    top: '33%',
    left: '50%',
  },
  {
    id: 'conduit',
    labelKey: 'website.hotspot.conduit',
    infoKey: 'website.hotspot.conduit_info',
    top: '55%',
    left: '47%',
  },
  {
    id: 'magma_chamber',
    labelKey: 'website.hotspot.magma_chamber',
    infoKey: 'website.hotspot.magma_chamber_info',
    top: '89%',
    left: '47%',
  },
  {
    id: 'lava_flow',
    labelKey: 'website.hotspot.lava_flow',
    infoKey: 'website.hotspot.lava_flow_info',
    top: '70%',
    left: '76%',
  },
];

const PULSE_KEYFRAMES = `
  @keyframes oe-hotspot-pulse {
    0% { transform: scale(1); opacity: 0.9; }
    70% { transform: scale(2.4); opacity: 0; }
    100% { transform: scale(2.4); opacity: 0; }
  }
  .oe-hotspot-pulse::after {
    content: '';
    position: absolute;
    inset: -2px;
    border-radius: 9999px;
    background: currentColor;
    animation: oe-hotspot-pulse 1.8s ease-out infinite;
  }
`;

function VolcanoSvg(): JSX.Element {
  return (
    <svg viewBox="0 0 320 200" className="w-full" aria-hidden="true" focusable="false">
      <rect y="168" width="320" height="32" fill="var(--oe-color-surface-container-high)" />
      <ellipse cx="150" cy="178" rx="50" ry="16" fill="var(--oe-color-tertiary)" opacity="0.55" />
      <path
        d="M146 176 L138 68 L162 68 L156 176 Z"
        fill="var(--oe-color-secondary-container)"
        stroke="var(--oe-color-outline-variant)"
      />
      <path
        d="M64 170 L160 26 L256 170 Z"
        fill="var(--oe-color-primary-container)"
        stroke="var(--oe-color-outline)"
        strokeLinejoin="round"
      />
      <ellipse
        cx="160"
        cy="66"
        rx="26"
        ry="11"
        fill="var(--oe-color-surface-container-highest)"
        stroke="var(--oe-color-outline)"
      />
      <path
        d="M216 118 C 244 136, 252 150, 244 168"
        stroke="var(--oe-color-tertiary)"
        strokeWidth="9"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function HotspotDemo(): JSX.Element {
  const { t } = useTranslation();
  const [activeId, setActiveId] = useState<string | null>(null);

  const active = HOTSPOTS.find((hotspot) => hotspot.id === activeId);

  return (
    <div>
      <div className="relative">
        <VolcanoSvg />
        <div role="group" aria-label={t('website.hotspot.volcano')} className="absolute inset-0">
          {HOTSPOTS.map((hotspot) => {
            const isActive = activeId === hotspot.id;
            return (
              <button
                key={hotspot.id}
                type="button"
                onClick={() => setActiveId(isActive ? null : hotspot.id)}
                aria-pressed={isActive}
                aria-label={t(hotspot.labelKey)}
                className={cn(
                  'oe-hotspot-pulse absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full',
                  'focus-visible:outline-primary focus-visible:outline-2 focus-visible:outline-offset-2',
                  isActive ? 'text-on-secondary' : 'text-primary',
                )}
                style={{ top: hotspot.top, left: hotspot.left }}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'border-on-surface h-4 w-4 rounded-full border-2',
                    isActive ? 'bg-secondary' : 'bg-primary',
                  )}
                />
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-on-surface-variant mt-3 text-sm">{t('website.hotspot.instruction')}</p>

      {active ? (
        <p
          role="status"
          className="text-on-surface-variant bg-surface-container-low mt-3 rounded-lg px-3 py-2 text-sm"
        >
          <span className="text-on-surface font-semibold">{t(active.labelKey)}</span> —{' '}
          {t(active.infoKey)}
        </p>
      ) : null}

      <style>{motionSafe(PULSE_KEYFRAMES)}</style>
    </div>
  );
}

HotspotDemo.displayName = 'HotspotDemo';
