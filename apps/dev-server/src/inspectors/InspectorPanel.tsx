import { useState } from 'react';
import type { TelemetryEvent } from '@open-edu/schemas';
import type { RewardReceipt } from '@open-edu/rewards';
import { TelemetryInspector } from './TelemetryInspector';
import { AccessibilityInspector } from './AccessibilityInspector';
import { RewardsInspector } from './RewardsInspector';
import { Button } from '../components/ui/button';
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

  let content: React.ReactNode;
  if (activeTab === 'telemetry') {
    content = <TelemetryInspector events={telemetryEvents} />;
  } else if (activeTab === 'rewards') {
    content = (
      <RewardsInspector
        receipts={rewardReceipts ?? []}
        definedRewards={definedRewards ?? []}
        onResend={onResendReward}
      />
    );
  } else if (activeTab === 'accessibility') {
    content = <AccessibilityInspector />;
  } else if (activeTab === 'bundle') {
    content = (
      <div className="p-2">
        <h3 className="mb-2 font-semibold">Bundle Modules</h3>
        {bundleData?.manifest?.modules?.map((mod: any) => (
          <div key={mod.id} className="border-outline-variant bg-surface mb-1 rounded border p-2">
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
    );
  }

  const tabClass = (tab: Tab) =>
    `flex-1 rounded-none border-0 border-b-2 px-3 py-2.5 text-xs font-semibold uppercase tracking-wider cursor-pointer ${
      activeTab === tab
        ? 'border-primary text-primary bg-surface'
        : 'border-transparent text-on-surface-variant bg-transparent hover:bg-surface-container'
    }`;

  return (
    <div
      className="bg-surface-container-low border-outline-variant flex w-[360px] flex-col border-l font-mono text-xs"
      role="complementary"
      aria-label="Developer inspector panel"
    >
      <div className="bg-surface-container border-outline-variant flex border-b">
        <button
          type="button"
          className={tabClass('telemetry')}
          onClick={() => setActiveTab('telemetry')}
        >
          Telemetry
        </button>
        <button
          type="button"
          className={tabClass('rewards')}
          onClick={() => setActiveTab('rewards')}
        >
          Rewards
        </button>
        <button
          type="button"
          className={tabClass('accessibility')}
          onClick={() => setActiveTab('accessibility')}
        >
          A11y
        </button>
        {bundleData && (
          <button
            type="button"
            className={tabClass('bundle')}
            onClick={() => setActiveTab('bundle')}
          >
            Bundle
          </button>
        )}
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
      <div className="flex-1 overflow-auto p-2">{content}</div>
    </div>
  );
}
