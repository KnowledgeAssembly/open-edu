import type { RewardReceipt, RewardCondition } from '@open-edu/rewards';

interface DefinedReward {
  action: string;
  badge?: string;
  condition?: RewardCondition;
}

interface RewardsInspectorProps {
  receipts: RewardReceipt[];
  definedRewards: DefinedReward[];
  onResend?: (receipt: RewardReceipt) => void;
}

const style: Record<string, React.CSSProperties> = {
  empty: {
    color: '#9ca3af',
    textAlign: 'center',
    padding: '2rem 0',
    fontSize: '0.75rem',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  card: {
    padding: '0.5rem',
    borderRadius: '4px',
    backgroundColor: '#ffffff',
    border: '1px solid #f3f4f6',
    fontSize: '0.75rem',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.25rem',
  },
  actionType: {
    fontWeight: 600,
    color: '#2563eb',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '0.125rem 0.375rem',
    borderRadius: '3px',
    fontSize: '0.625rem',
    fontWeight: 600,
    textTransform: 'uppercase',
  },
  delivered: {
    backgroundColor: '#dcfce7',
    color: '#16a34a',
  },
  failed: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
  },
  skipped: {
    backgroundColor: '#fef9c3',
    color: '#a16207',
  },
  muted: {
    color: '#6b7280',
    marginTop: '0.125rem',
    fontSize: '0.6875rem',
  },
  resendBtn: {
    marginTop: '0.375rem',
    padding: '0.25rem 0.5rem',
    backgroundColor: '#fee2e2',
    border: '1px solid #fecaca',
    borderRadius: '3px',
    color: '#dc2626',
    cursor: 'pointer',
    fontSize: '0.625rem',
    fontWeight: 600,
  },
  sectionTitle: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#6b7280',
    marginBottom: '0.5rem',
    paddingTop: '0.5rem',
    borderTop: '1px solid #e5e7eb',
  },
  conditionText: {
    color: '#374151',
    marginTop: '0.25rem',
    fontSize: '0.6875rem',
  },
  pendingItem: {
    padding: '0.375rem 0.5rem',
    borderRadius: '4px',
    backgroundColor: '#f0f9ff',
    border: '1px solid #bae6fd',
    fontSize: '0.75rem',
    marginBottom: '0.25rem',
  },
};

function formatCondition(condition: RewardCondition): string {
  switch (condition.type) {
    case 'score':
      return `score ≥ ${condition.minScore} on "${condition.nodeId}"`;
    case 'skill':
      return `skill "${condition.skillId}" ≥ ${condition.minLevel}`;
    case 'chain':
      return `complete nodes: ${condition.completedNodeIds.join(', ')}`;
    case 'and':
      return `AND (${condition.conditions.length} conditions)`;
    case 'or':
      return `OR (${condition.conditions.length} conditions)`;
    default:
      return '';
  }
}

function statusStyle(status: string): React.CSSProperties {
  switch (status) {
    case 'delivered':
      return { ...style.statusBadge, ...style.delivered };
    case 'failed':
      return { ...style.statusBadge, ...style.failed };
    default:
      return { ...style.statusBadge, ...style.skipped };
  }
}

export function RewardsInspector({
  receipts,
  definedRewards,
  onResend,
}: RewardsInspectorProps): JSX.Element {
  const dispatched = receipts.filter((r) => r.status !== 'skipped');
  const pending = definedRewards.filter((def) => {
    if (!def.condition) return false;
    return !dispatched.some((r) => r.actionType === def.action && r.status === 'delivered');
  });

  if (definedRewards.length === 0) {
    return (
      <div style={style.empty}>
        No rewards configured. Add a <code>rewards.json</code> to your package.
      </div>
    );
  }

  return (
    <div
      style={{
        ...style.list,
        maxHeight: 'calc(100vh - 120px)',
        overflow: 'auto',
      }}
    >
      {receipts.length > 0 && (
        <>
          <div style={style.sectionTitle}>Dispatched ({receipts.length})</div>
          {receipts.map((receipt) => (
            <div key={receipt.actionId} style={style.card}>
              <div style={style.headerRow}>
                <span style={style.actionType}>{receipt.actionType}</span>
                <span style={statusStyle(receipt.status)}>{receipt.status}</span>
              </div>
              <div style={style.muted}>{new Date(receipt.dispatchedAt).toLocaleTimeString()}</div>
              {receipt.detail && <div style={style.conditionText}>{receipt.detail}</div>}
              {receipt.error && (
                <div style={{ ...style.conditionText, color: '#dc2626' }}>{receipt.error}</div>
              )}
              {receipt.status === 'failed' && onResend && (
                <button type="button" style={style.resendBtn} onClick={() => onResend(receipt)}>
                  Re-send
                </button>
              )}
            </div>
          ))}
        </>
      )}

      {pending.length > 0 && (
        <>
          <div style={style.sectionTitle}>Pending ({pending.length})</div>
          {pending.map((def, idx) => (
            <div key={idx} style={style.pendingItem}>
              <div style={{ fontWeight: 600, color: '#0369a1' }}>
                {def.action}
                {def.badge ? `: ${def.badge}` : ''}
              </div>
              {def.condition && (
                <div style={style.conditionText}>Condition: {formatCondition(def.condition)}</div>
              )}
            </div>
          ))}
        </>
      )}

      {receipts.length === 0 && pending.length === 0 && definedRewards.length > 0 && (
        <div style={style.empty}>No rewards have been triggered yet.</div>
      )}
    </div>
  );
}
