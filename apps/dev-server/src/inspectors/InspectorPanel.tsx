import { useState } from 'react';
import type { TelemetryEvent } from '@open-edu/schemas';
import type { RewardReceipt } from '@open-edu/rewards';
import { TelemetryInspector } from './TelemetryInspector';
import { AccessibilityInspector } from './AccessibilityInspector';
import { RewardsInspector } from './RewardsInspector';
import { Button } from '../components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { PanelRightOpen, PanelRightClose } from 'lucide-react';

type Tab = 'telemetry' | 'accessibility' | 'rewards' | 'bundle';

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
}

export function InspectorPanel({
  telemetryEvents,
  rewardReceipts,
  definedRewards,
  onResendReward,
  bundleData,
}: InspectorPanelProps): JSX.Element | null {
  const [activeTab, setActiveTab] = useState<Tab>('telemetry');
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) {
    return (
      <Button
        variant="default"
        size="sm"
        className="shadow-elevation-modal fixed bottom-4 right-4 z-[9999]"
        onClick={() => setIsOpen(true)}
        aria-label="Open inspector panel"
      >
        <PanelRightOpen className="mr-1 h-4 w-4" />
        DevTools
      </Button>
    );
  }

  return (
    <div
      className="bg-surface-container-low border-outline-variant flex w-[360px] flex-col border-l font-mono text-xs"
      role="complementary"
      aria-label="Developer inspector panel"
    >
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as Tab)}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <div className="bg-surface-container border-outline-variant flex shrink-0 border-b">
          <TabsList className="flex h-auto flex-1 rounded-none border-0 bg-transparent p-0">
            <TabsTrigger
              value="telemetry"
              className="data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-surface flex-1 rounded-none border-0 border-b-2 border-transparent px-3 py-2.5 text-xs font-semibold uppercase tracking-wider"
            >
              Telemetry
            </TabsTrigger>
            <TabsTrigger
              value="rewards"
              className="data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-surface flex-1 rounded-none border-0 border-b-2 border-transparent px-3 py-2.5 text-xs font-semibold uppercase tracking-wider"
            >
              Rewards
            </TabsTrigger>
            <TabsTrigger
              value="accessibility"
              className="data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-surface flex-1 rounded-none border-0 border-b-2 border-transparent px-3 py-2.5 text-xs font-semibold uppercase tracking-wider"
            >
              A11y
            </TabsTrigger>
            {bundleData && (
              <TabsTrigger
                value="bundle"
                className="data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-surface flex-1 rounded-none border-0 border-b-2 border-transparent px-3 py-2.5 text-xs font-semibold uppercase tracking-wider"
              >
                Bundle
              </TabsTrigger>
            )}
          </TabsList>
          <Button
            variant="ghost"
            size="icon"
            className="text-on-surface-variant h-auto w-auto rounded-none px-3"
            onClick={() => setIsOpen(false)}
            aria-label="Close inspector panel"
          >
            <PanelRightClose className="h-4 w-4" />
          </Button>
        </div>

        <TabsContent value="telemetry" className="mt-0 flex-1 overflow-auto border-0 p-2">
          <TelemetryInspector events={telemetryEvents} />
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
              <h3 className="mb-2 font-semibold">Bundle Modules</h3>
              {bundleData?.manifest?.modules?.map((mod: any) => (
                <div
                  key={mod.id}
                  className="border-outline-variant bg-surface mb-1 rounded border p-2"
                >
                  <div className="font-medium">{mod.title}</div>
                  <div className="text-on-surface-variant text-xs">
                    ID: {mod.id} | Deps: {mod.dependsOn?.join(', ') || 'none'}
                  </div>
                </div>
              ))}
              {(!bundleData?.manifest?.modules || bundleData.manifest.modules.length === 0) && (
                <p className="text-on-surface-variant text-xs">No modules loaded.</p>
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
