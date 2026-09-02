import { useEffect, useState } from 'react';
import { useTranslation } from '@open-edu/i18n';
import type { TelemetryEvent } from '@open-edu/schemas';
import type { RewardReceipt } from '@open-edu/rewards';
import { TelemetryInspector } from './TelemetryInspector';
import { AccessibilityInspector } from './AccessibilityInspector';
import { RewardsInspector } from './RewardsInspector';
import { LogsInspector } from './LogsInspector';
import { Button } from '../components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { X } from 'lucide-react';

export type InspectorTab = 'telemetry' | 'logs' | 'accessibility' | 'rewards' | 'bundle';

interface InspectorPanelProps {
  telemetryEvents: TelemetryEvent[];
  rewardReceipts?: RewardReceipt[];
  definedRewards?: Array<{
    action: string;
    badge?: string;
    condition?: unknown;
  }>;
  onResendReward?: (receipt: RewardReceipt) => void;
  bundleData?: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeTab?: InspectorTab;
  onActiveTabChange?: (tab: InspectorTab) => void;
  auditRootSelector?: string;
}

export function InspectorPanel({
  telemetryEvents,
  rewardReceipts,
  definedRewards,
  onResendReward,
  bundleData,
  open,
  onOpenChange,
  activeTab: activeTabProp,
  onActiveTabChange,
  auditRootSelector,
}: InspectorPanelProps): JSX.Element | null {
  const { t } = useTranslation();
  const [internalTab, setInternalTab] = useState<InspectorTab>('telemetry');
  const activeTab = activeTabProp ?? internalTab;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange]);

  if (!open) {
    return null;
  }

  const handleTabChange = (tab: InspectorTab) => {
    if (onActiveTabChange) {
      onActiveTabChange(tab);
      return;
    }
    setInternalTab(tab);
  };

  return (
    <div
      className="border-outline-variant bg-surface-container-low flex h-[min(40vh,280px)] w-full shrink-0 flex-col border-t font-mono text-xs"
      role="complementary"
      aria-label={t('studio.preview.devtoolsPanel')}
      data-audit-root={auditRootSelector ?? ''}
    >
      <Tabs
        value={activeTab}
        onValueChange={(v) => handleTabChange(v as InspectorTab)}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <div className="bg-surface-container border-outline-variant flex shrink-0 border-b">
          <TabsList className="flex h-auto flex-1 rounded-none border-0 bg-transparent p-0">
            <TabsTrigger
              value="telemetry"
              className="data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-surface flex-1 rounded-none border-0 border-b-2 border-transparent px-3 py-2.5 text-xs font-semibold uppercase tracking-wider"
            >
              {t('studio.devtools.telemetry')}
            </TabsTrigger>
            <TabsTrigger
              value="logs"
              className="data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-surface flex-1 rounded-none border-0 border-b-2 border-transparent px-3 py-2.5 text-xs font-semibold uppercase tracking-wider"
            >
              {t('studio.devtools.logs')}
            </TabsTrigger>
            <TabsTrigger
              value="rewards"
              className="data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-surface flex-1 rounded-none border-0 border-b-2 border-transparent px-3 py-2.5 text-xs font-semibold uppercase tracking-wider"
            >
              {t('studio.devtools.rewards')}
            </TabsTrigger>
            <TabsTrigger
              value="accessibility"
              className="data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-surface flex-1 rounded-none border-0 border-b-2 border-transparent px-3 py-2.5 text-xs font-semibold uppercase tracking-wider"
            >
              {t('studio.devtools.a11y')}
            </TabsTrigger>
            {bundleData && (
              <TabsTrigger
                value="bundle"
                className="data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-surface flex-1 rounded-none border-0 border-b-2 border-transparent px-3 py-2.5 text-xs font-semibold uppercase tracking-wider"
              >
                {t('studio.devtools.bundle')}
              </TabsTrigger>
            )}
          </TabsList>
          <Button
            variant="ghost"
            size="icon"
            className="text-on-surface-variant size-auto rounded-none px-3"
            onClick={() => onOpenChange(false)}
            aria-label={t('studio.preview.devtoolsClose')}
          >
            <X className="size-4" />
          </Button>
        </div>

        <TabsContent value="telemetry" className="mt-0 flex-1 overflow-auto border-0 p-2">
          <TelemetryInspector events={telemetryEvents} />
        </TabsContent>
        <TabsContent value="logs" className="mt-0 flex-1 overflow-auto border-0 p-2">
          <LogsInspector />
        </TabsContent>
        <TabsContent value="rewards" className="mt-0 flex-1 overflow-auto border-0 p-2">
          <RewardsInspector
            receipts={rewardReceipts ?? []}
            definedRewards={definedRewards ?? []}
            onResend={onResendReward}
          />
        </TabsContent>
        <TabsContent value="accessibility" className="mt-0 flex-1 overflow-auto border-0 p-2">
          <AccessibilityInspector />
        </TabsContent>
        {bundleData && (
          <TabsContent value="bundle" className="mt-0 flex-1 overflow-auto border-0 p-2">
            <div className="p-2">
              <h3 className="mb-2 font-semibold">{t('studio.bundle.modulesTitle')}</h3>
              {bundleData?.manifest?.modules?.map((mod: any) => (
                <div
                  key={mod.id}
                  className="border-outline-variant bg-surface mb-1 rounded border p-2"
                >
                  <div className="font-medium">{mod.title}</div>
                  <div className="text-on-surface-variant text-xs">
                    {t('studio.bundle.moduleId', {
                      id: mod.id,
                      deps: mod.dependsOn?.join(', ') || 'none',
                    })}
                  </div>
                </div>
              ))}
              {(!bundleData?.manifest?.modules || bundleData.manifest.modules.length === 0) && (
                <p className="text-on-surface-variant text-xs">{t('studio.bundle.noModules')}</p>
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
