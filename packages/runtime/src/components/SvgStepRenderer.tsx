import { useEffect, useMemo, useRef, useState } from 'react';
import type { AnimationEffectConfig } from '@open-edu/schemas';
import { useTranslation } from '@open-edu/i18n';
import { animationsCss } from '../styles/animations.css.js';
import { effectToClass } from './CssAnimationRenderer.js';

export interface SvgStepRendererProps {
  src: string;
  /** 0-based index of the active animation step; -1 = none revealed yet. */
  currentStep: number;
  effects?: AnimationEffectConfig[];
  reducedMotion?: boolean;
  speed?: number;
  ariaLabel?: string;
  className?: string;
}

let cssInjected = false;

function ensureAnimationsCss(): void {
  if (cssInjected || typeof document === 'undefined') return;
  cssInjected = true;
  const style = document.createElement('style');
  style.dataset.oasAnimations = 'true';
  style.textContent = animationsCss;
  document.head.appendChild(style);
}

function normalizeTargetId(target: string): string {
  return target.startsWith('#') ? target.slice(1) : target;
}

function effectStepIndex(effect: AnimationEffectConfig, index: number): number {
  return effect.step !== undefined ? effect.step - 1 : index;
}

/**
 * Renders an educational SVG inline and drives layer visibility/effects from
 * the shared step-sync machine (`currentStep` + OAS `effects`).
 *
 * SVG authors mark step layers with `id` matching `effects[].target`
 * (e.g. id="evaporation") and optional `data-step="1"` attributes.
 */
export function SvgStepRenderer({
  src,
  currentStep,
  effects = [],
  reducedMotion = false,
  speed = 1,
  ariaLabel,
  className,
}: SvgStepRendererProps): JSX.Element {
  const { t } = useTranslation();
  const hostRef = useRef<HTMLDivElement>(null);
  const [svgHtml, setSvgHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ensureAnimationsCss();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setSvgHtml(null);

    async function load() {
      try {
        let text: string;
        if (src.trimStart().startsWith('<svg')) {
          text = src;
        } else {
          const res = await fetch(src);
          if (!res.ok) throw new Error(`Failed to load SVG: ${res.status}`);
          text = await res.text();
        }
        if (!cancelled) setSvgHtml(text);
      } catch (err) {
        if (!cancelled) {
          setSvgHtml(null);
          setError(err instanceof Error ? err.message : 'Failed to load SVG');
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [src]);

  const activeEffectClass = useMemo(() => {
    if (reducedMotion || currentStep < 0) return undefined;
    const match = effects.find((e, i) => effectStepIndex(e, i) === currentStep);
    if (!match) return undefined;
    return effectToClass[match.effect];
  }, [effects, currentStep, reducedMotion]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !svgHtml) return;
    const svg = host.querySelector('svg');
    if (!svg) return;

    const transition = reducedMotion ? 'none' : `opacity ${Math.max(0.15, 0.4 / speed)}s ease`;

    effects.forEach((effect, index) => {
      const id = normalizeTargetId(effect.target);
      const el = svg.getElementById(id);
      if (!el || !(el instanceof SVGElement)) return;

      const stepIndex = effectStepIndex(effect, index);
      const revealed = currentStep >= 0 && stepIndex <= currentStep;
      const isActive = revealed && stepIndex === currentStep;

      el.setAttribute('data-oas-revealed', revealed ? 'true' : 'false');
      el.setAttribute('aria-hidden', revealed ? 'false' : 'true');
      el.style.opacity = revealed ? '1' : '0';
      el.style.visibility = revealed ? 'visible' : 'hidden';
      el.style.transition = transition;

      const cls = effectToClass[effect.effect];
      if (cls) {
        if (isActive && !reducedMotion) el.classList.add(cls);
        else el.classList.remove(cls);
      }

      el.querySelectorAll('animate, animateTransform, animateMotion').forEach((anim) => {
        const smil = anim as SVGAnimationElement & {
          beginElement?: () => void;
          endElement?: () => void;
        };
        try {
          if (revealed) smil.beginElement?.();
          else smil.endElement?.();
        } catch {
          // SMIL control is best-effort across browsers
        }
      });
    });

    svg.querySelectorAll<SVGElement>('[data-step]').forEach((el) => {
      const stepAttr = Number(el.getAttribute('data-step'));
      if (!Number.isFinite(stepAttr)) return;
      const revealed = currentStep >= 0 && stepAttr - 1 <= currentStep;
      el.style.opacity = revealed ? '1' : '0';
      el.style.visibility = revealed ? 'visible' : 'hidden';
      el.style.transition = transition;
      el.setAttribute('data-oas-revealed', revealed ? 'true' : 'false');
    });
  }, [svgHtml, effects, currentStep, reducedMotion, speed, activeEffectClass]);

  if (error) {
    return (
      <div role="alert" data-testid="oas-svg-step-error" className={className}>
        {error}
      </div>
    );
  }

  if (!svgHtml) {
    return (
      <div role="status" data-testid="oas-svg-step-loading" className={className}>
        {t('runtime.animation.static_fallback')}
      </div>
    );
  }

  return (
    <div
      ref={hostRef}
      className={className}
      data-testid="oas-svg-step-host"
      data-oas-step={String(currentStep)}
      role="img"
      aria-label={ariaLabel ?? t('runtime.animation.static_fallback')}
      dangerouslySetInnerHTML={{ __html: svgHtml }}
    />
  );
}
