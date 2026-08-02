import { useState } from 'react';
import { useTranslation } from '@open-edu/i18n';

function OldSkyline(): JSX.Element {
  return (
    <svg
      viewBox="0 0 300 160"
      className="h-full w-full"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="300" height="160" fill="var(--oe-color-surface-container-high)" />
      <path
        d="M0 150 C 60 120, 120 145, 180 135 C 240 125, 260 140, 300 130 L 300 160 L 0 160 Z"
        fill="var(--oe-color-surface-variant)"
      />
      <g fill="var(--oe-color-outline-variant)">
        <rect x="20" y="100" width="22" height="60" />
        <rect x="52" y="80" width="18" height="80" />
        <rect x="118" y="96" width="24" height="64" />
        <rect x="156" y="108" width="16" height="52" />
        <rect x="228" y="90" width="20" height="70" />
        <rect x="256" y="104" width="18" height="56" />
      </g>
    </svg>
  );
}

function NewSkyline(): JSX.Element {
  return (
    <svg
      viewBox="0 0 300 160"
      className="h-full w-full"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="300" height="160" fill="var(--oe-color-secondary-container)" />
      <path
        d="M0 150 C 60 120, 120 145, 180 135 C 240 125, 260 140, 300 130 L 300 160 L 0 160 Z"
        fill="var(--oe-color-tertiary-container)"
      />
      <g fill="var(--oe-color-primary)">
        <rect x="24" y="70" width="24" height="90" />
        <rect x="58" y="46" width="20" height="114" />
        <rect x="88" y="90" width="18" height="70" />
        <rect x="120" y="60" width="26" height="100" />
        <rect x="156" y="96" width="16" height="64" />
        <rect x="182" y="40" width="20" height="120" />
        <rect x="220" y="76" width="22" height="84" />
        <rect x="252" y="52" width="18" height="108" />
      </g>
    </svg>
  );
}

export function ImageCompareDemo(): JSX.Element {
  const { t } = useTranslation();
  const [position, setPosition] = useState(50);

  return (
    <div>
      <div className="border-outline relative overflow-hidden rounded-lg border">
        <div
          role="img"
          aria-label={t('website.image_compare.label')}
          className="relative aspect-[15/8] w-full"
        >
          <div className="absolute inset-0" aria-hidden="true">
            <OldSkyline />
          </div>
          <div
            data-testid="image-compare-after"
            className="absolute inset-0"
            aria-hidden="true"
            style={{ clipPath: `inset(0 0 0 ${position}%)` }}
          >
            <NewSkyline />
          </div>
          <div
            aria-hidden="true"
            className="bg-on-surface absolute inset-y-0 w-0.5"
            style={{ left: `${position}%` }}
          />
        </div>
        <div className="text-on-surface-variant flex items-center justify-between px-3 py-1.5 text-xs font-semibold">
          <span>{t('website.image_compare.before')}</span>
          <span>{t('website.image_compare.after')}</span>
        </div>
      </div>

      <div className="mt-4">
        <input
          type="range"
          min={0}
          max={100}
          value={position}
          onChange={(event) => setPosition(Number(event.target.value))}
          aria-label={t('website.image_compare.slider')}
          aria-valuetext={`${position}%`}
          className="w-full"
        />
      </div>
    </div>
  );
}

ImageCompareDemo.displayName = 'ImageCompareDemo';
