import { useState, type ReactNode } from 'react';
import type { TelemetryEvent } from '@open-edu/schemas';
import type { RewardReceipt } from '@open-edu/rewards';
import { TelemetryInspector } from './TelemetryInspector';
import { AccessibilityInspector } from './AccessibilityInspector';
import { RewardsInspector } from './RewardsInspector';

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

const panelStyle: Record<string, React.CSSProperties> = {
  container: {
    width: '360px',
    borderLeft: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    fontSize: '0.8125rem',
  },
  header: {
    display: 'flex',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f3f4f6',
  },
  tab: {
    flex: 1,
    padding: '0.625rem 0.75rem',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#6b7280',
    borderBottom: '2px solid transparent',
  },
  activeTab: {
    color: '#2563eb',
    borderBottomColor: '#2563eb',
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '0.5rem',
  },
  closeBtn: {
    padding: '0.5rem 0.75rem',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    color: '#9ca3af',
    fontSize: '1rem',
  },
  toggleBtn: {
    position: 'fixed' as const,
    bottom: '1rem',
    right: '1rem',
    zIndex: 9999,
    padding: '0.5rem 0.75rem',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: 600,
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  },
};

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
      <button
        type="button"
        style={panelStyle.toggleBtn}
        onClick={() => setIsOpen(true)}
        aria-label="Open inspector panel"
      >
        DevTools
      </button>
    );
  }

  let content: ReactNode;
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
      <div style={{ padding: '0.5rem' }}>
        <h3 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Bundle Modules</h3>
        {bundleData?.manifest?.modules?.map((mod: any) => (
          <div
            key={mod.id}
            style={{
              padding: '0.5rem',
              marginBottom: '0.25rem',
              background: '#fff',
              borderRadius: '4px',
              border: '1px solid #e5e7eb',
            }}
          >
            <div style={{ fontWeight: 500 }}>{mod.title}</div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
              ID: {mod.id} | Deps: {mod.dependsOn?.join(', ') || 'none'}
            </div>
          </div>
        ))}
        {(!bundleData?.manifest?.modules || bundleData.manifest.modules.length === 0) && (
          <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>No modules loaded.</p>
        )}
      </div>
    );
  }

  return (
    <div style={panelStyle.container} role="complementary" aria-label="Developer inspector panel">
      <div style={panelStyle.header}>
        <button
          type="button"
          style={{ ...panelStyle.tab, ...(activeTab === 'telemetry' ? panelStyle.activeTab : {}) }}
          onClick={() => setActiveTab('telemetry')}
        >
          Telemetry
        </button>
        <button
          type="button"
          style={{
            ...panelStyle.tab,
            ...(activeTab === 'rewards' ? panelStyle.activeTab : {}),
          }}
          onClick={() => setActiveTab('rewards')}
        >
          Rewards
        </button>
        <button
          type="button"
          style={{
            ...panelStyle.tab,
            ...(activeTab === 'accessibility' ? panelStyle.activeTab : {}),
          }}
          onClick={() => setActiveTab('accessibility')}
        >
          A11y
        </button>
        {bundleData && (
          <button
            type="button"
            style={{ ...panelStyle.tab, ...(activeTab === 'bundle' ? panelStyle.activeTab : {}) }}
            onClick={() => setActiveTab('bundle')}
          >
            Bundle
          </button>
        )}
        <button
          type="button"
          style={panelStyle.closeBtn}
          onClick={() => setIsOpen(false)}
          aria-label="Close inspector panel"
        >
          ✕
        </button>
      </div>
      <div style={panelStyle.content}>{content}</div>
    </div>
  );
}
