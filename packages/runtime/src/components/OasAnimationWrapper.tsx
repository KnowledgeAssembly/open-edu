import { useMemo, type ReactNode } from 'react';
import { AnimationConfigSchema } from '@open-edu/schemas';
import type { AnimationConfig } from '@open-edu/schemas';
import { useTranslation } from '@open-edu/i18n';
import { Button } from '@open-edu/design-system';
import { useOasAnimation } from './useOasAnimation';
import { DotLottiePlayer } from './DotLottiePlayer';

export interface OasAnimationWrapperProps {
  config?: unknown;
  assetBaseUrl?: string;
  resolveSrc?: (src: string) => string;
  ariaLabel?: string;
  className?: string;
  showControls?: boolean;
  onComplete?: () => void;
  staticChildren?: ReactNode;
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

export function OasAnimationWrapper({
  config,
  assetBaseUrl,
  resolveSrc,
  ariaLabel,
  className,
  showControls = false,
  onComplete,
  staticChildren,
}: OasAnimationWrapperProps): JSX.Element | null {
  const { t } = useTranslation();

  const parsed = useMemo(() => AnimationConfigSchema.safeParse(config), [config]);

  const resolvedConfig: AnimationConfig | undefined = parsed.success ? parsed.data : undefined;

  const controller = useOasAnimation(resolvedConfig, (status) => {
    if (status === 'completed') onComplete?.();
  });

  const { handlePlayerEvent, reducedMotion } = controller;

  const resolvedSrc = resolvedConfig?.src
    ? resolveUrl(resolvedConfig.src, assetBaseUrl, resolveSrc)
    : undefined;

  const renderControls = () => {
    if (!showControls) return null;
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

  if (!resolvedConfig || !resolvedSrc) {
    if (staticChildren) {
      return <div className={className}>{staticChildren}</div>;
    }
    return null;
  }

  if (reducedMotion) {
    return (
      <div className={className} data-testid="oas-static-fallback">
        {staticChildren ?? (
          <div role="img" aria-label={ariaLabel ?? t('runtime.animation.static_fallback')}>
            {t('runtime.animation.static_fallback')}
          </div>
        )}
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
      </div>
    );
  }

  if (resolvedConfig.backend === 'lottie') {
    return (
      <div className={className} data-testid="oas-lottie-backend">
        <DotLottiePlayer
          src={resolvedSrc}
          autoplay={resolvedConfig.trigger === 'load' || resolvedConfig.trigger === 'visible'}
          loop={resolvedConfig.loop}
          speed={resolvedConfig.speed}
          segments={resolvedConfig.segments}
          ariaLabel={ariaLabel ?? t('runtime.animation.static_fallback')}
          onEvent={handlePlayerEvent}
          onError={() => controller.stop()}
        />
        {renderControls()}
      </div>
    );
  }

  return staticChildren ? <div className={className}>{staticChildren}</div> : null;
}
