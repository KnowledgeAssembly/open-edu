import { useState, useCallback, useMemo } from 'react';
import { z } from 'zod';
import type { WidgetDefinitionV2 } from '../../types';
import { LearningIntent } from '../../metadata/learning-intents';
import { Button } from '@open-edu/design-system';
import { useObserveMode } from '../../use-observe-mode';

const regionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  color: z.string().optional(),
  tooltip: z.string().optional(),
  image: z.string().optional(),
  path: z.string().optional(),
});

const markerSchema = z.object({
  id: z.string(),
  label: z.string(),
  x: z.number(),
  y: z.number(),
  icon: z.string().optional(),
});

const legendItemSchema = z.object({
  color: z.string(),
  label: z.string(),
});

const socialMapSchema = z.object({
  map: z.string().optional(),
  regions: z.array(regionSchema).min(1),
  labels: z.boolean().optional().default(true),
  legend: z.array(legendItemSchema).optional(),
  markers: z.array(markerSchema).optional(),
  zoom: z.boolean().optional().default(false),
  projection: z.string().optional(),
  title: z.string().optional(),
  interactive: z.boolean().optional().default(false),
  targetRegion: z.string().optional(),
});

const SocialMapStateSchema = z.object({
  selectedRegion: z.string().optional(),
  foundRegions: z.array(z.string()),
  zoomLevel: z.number().optional(),
});

function SocialMapComponent(props: {
  nodeId: string;
  config: Record<string, unknown>;
  emitInteraction: (data: Record<string, unknown>) => void;
  complete: (score?: number, state?: unknown) => void;
  storedState?: unknown;
}) {
  const { config: rawConfig, emitInteraction, complete, storedState } = props;
  const parsed = socialMapSchema.safeParse(rawConfig);
  const parsedState = useMemo(() => {
    const result = SocialMapStateSchema.safeParse(storedState);
    return result.success ? result.data : null;
  }, [storedState]);

  const [selectedRegion, setSelectedRegion] = useState<string | null>(
    parsedState?.selectedRegion ?? null,
  );
  const [foundRegions, setFoundRegions] = useState<string[]>(parsedState?.foundRegions ?? []);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(parsedState?.zoomLevel ?? 1);

  const isObserve = parsed.success && !parsed.data.interactive;
  const { handleAcknowledge, showAcknowledgeButton } = useObserveMode({
    isObserve,
    onComplete: complete,
    onInteract: emitInteraction,
    widgetId: 'social.map',
  });

  const handleRegionClick = useCallback(
    (regionId: string) => {
      if (!parsed.success || !parsed.data) return;
      if (!parsed.data.interactive) return;
      setSelectedRegion(regionId);

      const isCorrect = parsed.data.targetRegion === regionId;
      if (isCorrect && !foundRegions.includes(regionId)) {
        const next = [...foundRegions, regionId];
        setFoundRegions(next);
        emitInteraction({
          type: 'widget.interaction',
          widgetId: 'social.map',
          action: 'found',
          regionId,
        });
        if (parsed.data.targetRegion) {
          complete(100, { selectedRegion: regionId, foundRegions: next });
        }
      } else {
        emitInteraction({
          type: 'widget.interaction',
          widgetId: 'social.map',
          action: 'select',
          regionId,
        });
      }
    },
    [parsed, foundRegions, emitInteraction, complete],
  );

  const handleZoomIn = useCallback(() => {
    setZoomLevel((z) => Math.min(z + 0.25, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel((z) => Math.max(z - 0.25, 0.5));
  }, []);

  if (!parsed.success) {
    return (
      <div
        role="alert"
        data-testid="widget-config-error"
        className="border-outline-variant bg-surface-container-lowest p-md rounded-xl border text-center"
      >
        <p className="text-on-surface font-semibold">This activity could not be loaded.</p>
      </div>
    );
  }

  const config = parsed.data;

  const selected = config.regions.find((r) => r.id === selectedRegion);
  const hovered = config.regions.find((r) => r.id === hoveredRegion);

  return (
    <div role="group" aria-label={config.title ?? 'Interactive map'} data-testid="social-map">
      {config.title && <h3 className="text-on-surface mb-sm font-semibold">{config.title}</h3>}

      {config.interactive && parsed.data.targetRegion && (
        <p className="text-on-surface/70 mb-sm text-sm">
          Find:{' '}
          {config.regions.find((r) => r.id === parsed.data.targetRegion)?.name ??
            parsed.data.targetRegion}
        </p>
      )}

      {config.zoom && (
        <div className="gap-xs mb-sm flex">
          <Button variant="outline" size="sm" onClick={handleZoomIn} aria-label="Zoom in">
            +
          </Button>
          <Button variant="outline" size="sm" onClick={handleZoomOut} aria-label="Zoom out">
            −
          </Button>
          <span className="text-on-surface/70 self-center text-sm">
            {Math.round(zoomLevel * 100)}%
          </span>
        </div>
      )}

      <div
        className="border-outline-variant bg-surface-container-lowest overflow-auto rounded-lg border"
        style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}
      >
        <svg
          width="100%"
          height="400"
          viewBox="0 0 600 400"
          role={parsed.data.interactive ? 'application' : 'img'}
          aria-label={config.title ?? 'Map'}
        >
          {config.regions.map((region) => (
            <g
              key={region.id}
              onClick={() => handleRegionClick(region.id)}
              onMouseEnter={() => setHoveredRegion(region.id)}
              onMouseLeave={() => setHoveredRegion(null)}
              className="cursor-pointer"
              role={parsed.data.interactive ? 'button' : 'img'}
              aria-label={region.name}
              tabIndex={parsed.data.interactive ? 0 : undefined}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleRegionClick(region.id);
                }
              }}
            >
              {region.path ? (
                <path
                  d={region.path}
                  fill={region.color ?? 'var(--oe-color-primary-container, #e8def8)'}
                  stroke={
                    selectedRegion === region.id
                      ? 'var(--oe-color-primary, #6750a4)'
                      : 'var(--oe-color-outline, #79747e)'
                  }
                  strokeWidth={selectedRegion === region.id ? 3 : 1}
                />
              ) : (
                <rect
                  x={config.regions.indexOf(region) * 100}
                  y={100}
                  width={80}
                  height={80}
                  rx={4}
                  fill={region.color ?? 'var(--oe-color-primary-container, #e8def8)'}
                  stroke={
                    selectedRegion === region.id
                      ? 'var(--oe-color-primary, #6750a4)'
                      : 'var(--oe-color-outline, #79747e)'
                  }
                  strokeWidth={selectedRegion === region.id ? 3 : 1}
                />
              )}
              {config.labels && (
                <text
                  x={region.path ? 300 : config.regions.indexOf(region) * 100 + 40}
                  y={region.path ? 200 : 140}
                  textAnchor="middle"
                  fill="var(--oe-color-on-surface, #1c1b1f)"
                  fontSize={12}
                  fontWeight={500}
                  aria-hidden="true"
                >
                  {region.name}
                </text>
              )}
            </g>
          ))}

          {config.markers?.map((m) => (
            <g key={m.id}>
              <circle cx={m.x} cy={m.y} r={6} fill="var(--oe-color-error, #dc2626)" />
              <text
                x={m.x}
                y={m.y - 10}
                textAnchor="middle"
                fill="var(--oe-color-on-surface, #1c1b1f)"
                fontSize={10}
                aria-hidden="true"
              >
                {m.label}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {(hovered || selected) && (
        <div
          className="border-outline-variant bg-surface-container p-sm mt-sm rounded-lg border"
          role="status"
          aria-live="polite"
        >
          <p className="text-on-surface font-medium">{(hovered ?? selected)?.name}</p>
          {(hovered ?? selected)?.description && (
            <p className="text-on-surface/70 text-sm">{(hovered ?? selected)?.description}</p>
          )}
        </div>
      )}

      {config.legend && config.legend.length > 0 && (
        <div className="gap-sm mt-sm flex flex-wrap" role="list" aria-label="Map legend">
          {config.legend.map((item, i) => (
            <div key={i} role="listitem" className="gap-xs flex items-center">
              <span
                className="inline-block h-3 w-3 rounded-sm"
                style={{ backgroundColor: item.color }}
                aria-hidden="true"
              />
              <span className="text-on-surface/70 text-sm">{item.label}</span>
            </div>
          ))}
        </div>
      )}

      {isObserve && showAcknowledgeButton && (
        <div className="p-md border-outline-variant mt-md flex items-center justify-center border-t">
          <Button variant="default" onClick={handleAcknowledge} data-testid="observe-acknowledge">
            Mark as seen ✓
          </Button>
        </div>
      )}
    </div>
  );
}

const SocialMapWidget: WidgetDefinitionV2 = {
  id: 'social.map',
  name: 'Interactive Map',
  description: 'Interactive educational maps for geography and history',
  domain: 'social',
  version: '1.0.0',
  render: SocialMapComponent,
  learningIntents: [LearningIntent.Explore, LearningIntent.Observe],
  capabilities: {
    supportsObserveMode: true,
    supportsKeyboard: true,
    supportsScreenReader: true,
    supportsHints: true,
    supportsTouch: true,
    supportsMouse: true,
    supportsAnalytics: true,
    supportsRewards: true,
    supportsAccessibility: true,
    supportsOffline: true,
    supportsLocalization: true,
  },
  accessibility: {
    highContrast: true,
    keyboardOnly: true,
    screenReader: true,
    ariaSupport: true,
    focusManagement: true,
  },
  analytics: {
    trackAttempts: true,
    trackCompletionTime: true,
    trackHints: true,
    trackSuccessRate: true,
    trackInteractions: true,
  },
  reward: {
    completionXP: 15,
    confetti: true,
    positiveMessage: 'Geography explored!',
    achievement: 'first-map',
  },
  ai: {
    difficulty: 'medium',
    estimatedMinutes: 5,
    bloomsLevel: 'understand',
    cognitiveLoad: 'moderate',
    recommendedAge: [8, 18],
    readingLevel: 'grade-4',
    subjectTags: ['geography', 'history', 'social-studies'],
    learningObjectives: [
      'Identify regions on an interactive map',
      'Explore geographical relationships',
      'Locate specific features using map references',
    ],
    commonMisconceptions: [
      'Confusing similar-sounding region names',
      'Misreading map scale and relative distances',
    ],
    generationHints: [
      'Use SVG paths for accurate region boundaries',
      'Provide clear labels and distinct colors',
      'Include a legend for color-coded regions',
      'Add markers for key locations',
    ],
    authoringPrompt: 'Create an interactive map activity for geography or history education',
    exampleConfigs: [
      {
        title: 'Indian States',
        regions: [
          { id: 'mh', name: 'Maharashtra', color: '#e8def8', description: 'Western India' },
          { id: 'ka', name: 'Karnataka', color: '#d0bcff', description: 'Southern India' },
          { id: 'tn', name: 'Tamil Nadu', color: '#b69df8', description: 'Southeast India' },
        ],
        labels: true,
        interactive: true,
        targetRegion: 'ka',
        legend: [
          { color: '#e8def8', label: 'Western Region' },
          { color: '#d0bcff', label: 'Southern Region' },
          { color: '#b69df8', label: 'Southeastern Region' },
        ],
      },
    ],
  },
  icon: 'map',
  keywords: ['map', 'geography', 'regions', 'countries', 'states', 'explore'],
  status: 'stable',
};

export { SocialMapWidget as socialMap };
export default SocialMapWidget;
