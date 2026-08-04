import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AnimationConfigSchema } from '@open-edu/schemas';
import type { AnimationConfig } from '@open-edu/schemas';
import { useTranslation } from '@open-edu/i18n';
import { Button } from '@open-edu/design-system';
import { useOasAnimation } from './useOasAnimation';
import type { OasAnimationController } from './useOasAnimation';
import { DotLottiePlayer } from './DotLottiePlayer';
import { CssAnimationRenderer, effectToClass } from './CssAnimationRenderer';

export interface OasAnimationWrapperProps {
  config?: unknown;
  assetBaseUrl?: string;
  resolveSrc?: (src: string) => string;
  ariaLabel?: string;
  className?: string;
  showControls?: boolean;
  onComplete?: () => void;
  staticChildren?: ReactNode;
  preserveChildren?: boolean;
  controllerRef?: React.MutableRefObject<OasAnimationController | null>;
}

function resolveUrl(
  src: string,
  assetBaseUrl?: string,
  resolveSrc?: (src: string) => string,
): string {
  if (resolveSrc) return resolveSrc(src);
  if (assetBaseUrl) {
    return `${assetBaseUrl.replace(/\/$/, '')}/${src.replace(/^\//, '')}`;
  }
  return src;
}

function readThemeColors(): Record<string, string> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return {};
  const styles = getComputedStyle(document.documentElement);
  const colors: Record<string, string> = {};
  for (let i = 0; i < styles.length; i++) {
    const name = styles[i];
    if (!name) continue;
    if (name.startsWith('--oe-color-')) {
      const value = styles.getPropertyValue(name).trim();
      if (value) colors[name] = value;
    }
  }
  return colors;
}

function shouldAutoplay(config: AnimationConfig): boolean {
  return config.trigger === 'load' || config.trigger === 'visible';
}

function shouldAutoplayStep(config: AnimationConfig): boolean {
  return config.trigger === 'step';
}

export function OasAnimationWrapper({
  config,
  assetBaseUrl,
  resolveSrc,
  ariaLabel,
  className,
  showControls = false,
  onComplete,
  staticChildren,
  preserveChildren = false,
  controllerRef,
}: OasAnimationWrapperProps): JSX.Element | null {
  const { t } = useTranslation();

  const parsed = useMemo(() => AnimationConfigSchema.safeParse(config), [config]);

  const resolvedConfig: AnimationConfig | undefined = parsed.success ? parsed.data : undefined;

  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [config]);

  const themeColors = useMemo(() => readThemeColors(), []);

  const controller = useOasAnimation(resolvedConfig, (status) => {
    if (status === 'completed') onComplete?.();
  });

  if (controllerRef) {
    controllerRef.current = controller;
  }

  const { handlePlayerEvent, reducedMotion } = controller;

  const resolvedSrc = resolvedConfig?.src
    ? resolveUrl(resolvedConfig.src, assetBaseUrl, resolveSrc)
    : undefined;

  const stepSegments = useMemo(() => {
    if (resolvedConfig?.trigger !== 'step') return undefined;
    const steps = resolvedConfig?.effects?.length ?? 1;
    if (steps <= 1) return undefined;
    const frameCount = 120;
    const perStep = Math.floor(frameCount / steps);
    const seg: [number, number] = [
      controller.currentStep * perStep,
      (controller.currentStep + 1) * perStep,
    ];
    return seg;
  }, [resolvedConfig?.trigger, resolvedConfig?.effects?.length, controller.currentStep]);

  const effectiveSegments = resolvedConfig?.segments ?? stepSegments;
  const effectiveShowControls = showControls || (resolvedConfig?.trigger === 'step' && !preserveChildren);

  const renderControls = () => {
    if (!effectiveShowControls) return null;
    return (
      <div
        role="group"
        aria-label={t('runtime.animation.controls')}
        className="mt-sm gap-xs flex items-center"
      >
        {controller.status === 'paused' ? (
          <Button
            variant="outline"
            size="sm"
            onClick={controller.play}
            data-testid="oas-control-play"
          >
            {t('runtime.animation.resume')}
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={controller.pause}
            data-testid="oas-control-pause"
          >
            {t('runtime.animation.pause')}
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={controller.prevStep}
          data-testid="oas-control-prev"
        >
          {t('runtime.animation.step_back')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={controller.nextStep}
          data-testid="oas-control-next"
        >
          {t('runtime.animation.step_forward')}
        </Button>
      </div>
    );
  };

  const renderStaticFallback = () =>
    staticChildren ?? (
      <div role="img" aria-label={ariaLabel ?? t('runtime.animation.static_fallback')}>
        {t('runtime.animation.static_fallback')}
      </div>
    );

  const renderPreservedChildren = () =>
    preserveChildren && staticChildren ? <div className="mt-sm">{staticChildren}</div> : null;

  if (!resolvedConfig) {
    if (staticChildren) {
      return <div className={className}>{staticChildren}</div>;
    }
    return null;
  }

  const backendRequiresSrc =
    resolvedConfig.backend === 'lottie' || resolvedConfig.backend === 'svg';
  if (backendRequiresSrc && !resolvedSrc) {
    if (staticChildren) {
      return <div className={className}>{staticChildren}</div>;
    }
    return null;
  }

  if (reducedMotion) {
    return (
      <div className={className} data-testid="oas-static-fallback">
        {renderStaticFallback()}
        {renderControls()}
      </div>
    );
  }

  if (resolvedConfig.backend === 'svg') {
    return (
      <div className={className} data-testid="oas-svg-backend">
        <img
          src={resolvedSrc}
          alt={ariaLabel ?? t('runtime.animation.static_fallback')}
          className="w-full"
        />
        {renderControls()}
        {renderPreservedChildren()}
      </div>
    );
  }

  if (resolvedConfig.backend === 'css') {
    return (
      <div className={className} data-testid="oas-css-backend">
        <CssAnimationRenderer
          effects={resolvedConfig.effects ?? []}
          reducedMotion={reducedMotion}
          speed={resolvedConfig.speed}
        >
          {staticChildren ?? (
            <div role="img" aria-label={ariaLabel ?? t('runtime.animation.static_fallback')}>
              {t('runtime.animation.static_fallback')}
            </div>
          )}
        </CssAnimationRenderer>
        {renderControls()}
        {renderPreservedChildren()}
      </div>
    );
  }

  if (resolvedConfig.backend === 'lottie') {
    return (
      <div className={className} data-testid="oas-lottie-backend">
        {hasError ? (
          resolvedConfig.effects && resolvedConfig.effects.length > 0 ? (
            <CssAnimationRenderer
              effects={resolvedConfig.effects.filter((e) => effectToClass[e.effect])}
              reducedMotion={reducedMotion}
            >
              {renderStaticFallback()}
            </CssAnimationRenderer>
          ) : (
            renderStaticFallback()
          )
        ) : (
          <DotLottiePlayer
            src={resolvedSrc}
            autoplay={shouldAutoplay(resolvedConfig) || shouldAutoplayStep(resolvedConfig)}
            loop={resolvedConfig.loop ?? resolvedConfig.trigger === 'step'}
            speed={resolvedConfig.speed}
            segments={effectiveSegments}
            themeColors={themeColors}
            ariaLabel={ariaLabel ?? t('runtime.animation.static_fallback')}
            onEvent={handlePlayerEvent}
            onError={() => setHasError(true)}
          />
        )}
        {renderControls()}
        {renderPreservedChildren()}
      </div>
    );
  }

  return staticChildren ? <div className={className}>{staticChildren}</div> : null;
}
