import type { RewardReceipt, RewardCondition } from '@open-edu/rewards';
import { Button } from '../components/ui/button';
import { cn } from '@open-edu/design-system';

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
      <div className="text-on-surface-variant py-8 text-center text-xs">
        No rewards configured. Add a <code>rewards.json</code> to your package.
      </div>
    );
  }

  return (
    <div className="flex max-h-[calc(100vh-120px)] flex-col gap-2 overflow-auto">
      {receipts.length > 0 && (
        <>
          <div className="border-outline-variant text-on-surface-variant border-t pt-2 text-[0.6875rem] font-semibold uppercase tracking-wider">
            Dispatched ({receipts.length})
          </div>
          {receipts.map((receipt) => (
            <div
              key={receipt.actionId}
              className="bg-surface border-outline-variant rounded border p-2 text-xs"
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-primary font-semibold">{receipt.actionType}</span>
                <span
                  className={cn(
                    'inline-block rounded px-1 py-px text-[0.625rem] font-semibold uppercase',
                    receipt.status === 'delivered' && 'bg-success/20 text-success',
                    receipt.status === 'failed' && 'bg-error/20 text-error',
                    receipt.status !== 'delivered' &&
                      receipt.status !== 'failed' &&
                      'bg-muted text-muted-foreground',
                  )}
                >
                  {receipt.status}
                </span>
              </div>
              <div className="text-on-surface-variant text-[0.6875rem]">
                {new Date(receipt.dispatchedAt).toLocaleTimeString()}
              </div>
              {receipt.detail && (
                <div className="text-on-surface mt-0.5 text-[0.6875rem]">{receipt.detail}</div>
              )}
              {receipt.error && (
                <div className="text-error mt-0.5 text-[0.6875rem]">{receipt.error}</div>
              )}
              {receipt.status === 'failed' && onResend && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="mt-1 h-auto px-2 py-1 text-[0.625rem]"
                  onClick={() => onResend(receipt)}
                >
                  Re-send
                </Button>
              )}
            </div>
          ))}
        </>
      )}

      {pending.length > 0 && (
        <>
          <div className="border-outline-variant text-on-surface-variant border-t pt-2 text-[0.6875rem] font-semibold uppercase tracking-wider">
            Pending ({pending.length})
          </div>
          {pending.map((def, idx) => (
            <div key={idx} className="bg-primary/10 border-primary/20 rounded border p-1.5 text-xs">
              <div className="text-primary font-semibold">
                {def.action}
                {def.badge ? `: ${def.badge}` : ''}
              </div>
              {def.condition && (
                <div className="text-on-surface mt-1 text-[0.6875rem]">
                  Condition: {formatCondition(def.condition)}
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {receipts.length === 0 && pending.length === 0 && definedRewards.length > 0 && (
        <div className="text-on-surface-variant py-8 text-center text-xs">
          No rewards have been triggered yet.
        </div>
      )}
    </div>
  );
}
