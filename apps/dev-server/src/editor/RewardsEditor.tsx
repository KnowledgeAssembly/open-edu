import { X } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

interface TriggerData {
  onEvent: string;
  rewards: RewardActionData[];
}

interface RewardActionData {
  action: string;
  badge?: string;
  url?: string;
  exec?: string;
  condition?: Record<string, unknown>;
}

interface RewardsData {
  triggers: TriggerData[];
}

interface RewardsEditorProps {
  data: RewardsData;
  onChange: (data: RewardsData) => void;
}

const eventExamples = ['node_complete', 'quiz_pass', 'streak_3', 'node_open', 'workflow_complete'];

export function RewardsEditor({ data, onChange }: RewardsEditorProps) {
  const triggers = data.triggers ?? [];

  const handleAddTrigger = () => {
    onChange({
      triggers: [...triggers, { onEvent: 'node_complete', rewards: [] }],
    });
  };

  const handleRemoveTrigger = (idx: number) => {
    onChange({
      triggers: triggers.filter((_, i) => i !== idx),
    });
  };

  const handleTriggerChange = (idx: number, trigger: TriggerData) => {
    const updated = [...triggers];
    updated[idx] = trigger;
    onChange({ triggers: updated });
  };

  if (triggers.length === 0) {
    return (
      <div className="space-y-4">
        <div className="border-tertiary-container bg-tertiary-container text-tertiary rounded-lg border px-3 py-2 text-xs">
          Define reward triggers — events that award badges, call webhooks, or run scripts.
        </div>
        <div className="border-outline-variant text-on-surface-variant rounded-lg border-2 border-dashed p-6 text-center text-sm">
          No triggers defined
        </div>
        <button
          type="button"
          className="text-primary hover:bg-primary-container rounded px-3 py-1.5 text-xs font-medium"
          onClick={handleAddTrigger}
        >
          + Add Trigger
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border-tertiary-container bg-tertiary-container text-tertiary rounded-lg border px-3 py-2 text-xs">
        Define reward triggers — events that award badges, call webhooks, or run scripts.
      </div>

      <div className="space-y-3">
        {triggers.map((trigger, idx) => (
          <TriggerCard
            key={idx}
            trigger={trigger}
            onChange={(t) => handleTriggerChange(idx, t)}
            onRemove={() => handleRemoveTrigger(idx)}
            eventExamples={eventExamples}
          />
        ))}
      </div>

      <button
        type="button"
        className="text-primary hover:bg-primary-container rounded px-3 py-1.5 text-xs font-medium"
        onClick={handleAddTrigger}
      >
        + Add Trigger
      </button>
    </div>
  );
}

interface TriggerCardProps {
  trigger: TriggerData;
  onChange: (trigger: TriggerData) => void;
  onRemove: () => void;
  eventExamples: string[];
}

function TriggerCard({ trigger, onChange, onRemove, eventExamples }: TriggerCardProps) {
  const handleAddReward = () => {
    onChange({
      ...trigger,
      rewards: [...trigger.rewards, { action: 'badge.award', badge: '' }],
    });
  };

  const handleRemoveReward = (idx: number) => {
    onChange({
      ...trigger,
      rewards: trigger.rewards.filter((_, i) => i !== idx),
    });
  };

  const handleRewardChange = (idx: number, reward: RewardActionData) => {
    const updated = [...trigger.rewards];
    updated[idx] = reward;
    onChange({ ...trigger, rewards: updated });
  };

  return (
    <div className="border-outline-variant bg-surface shadow-elevation-flat rounded-lg border p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-on-surface-variant text-xs font-medium">Trigger</span>
        <button
          type="button"
          className="text-on-surface-variant hover:bg-error-container hover:text-error rounded p-1"
          onClick={onRemove}
          aria-label="Remove trigger"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mb-2">
        <label className="text-on-surface-variant mb-0.5 block text-[10px] font-medium">
          On Event
        </label>
        <div className="flex gap-1">
          <Input
            className="border-outline-variant focus:border-primary focus:ring-primary min-w-0 flex-1 rounded border px-2 py-1 font-mono text-xs focus:outline-none focus:ring-1"
            value={trigger.onEvent}
            onChange={(e) => onChange({ ...trigger, onEvent: e.target.value })}
            placeholder="node_complete"
            list="event-suggestions"
          />
          <datalist id="event-suggestions">
            {eventExamples.map((ev) => (
              <option key={ev} value={ev} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-on-surface-variant text-[10px] font-medium">Rewards</label>
        {trigger.rewards.map((reward, idx) => (
          <RewardRow
            key={idx}
            reward={reward}
            onChange={(r) => handleRewardChange(idx, r)}
            onRemove={() => handleRemoveReward(idx)}
          />
        ))}
        <button
          type="button"
          className="text-primary hover:bg-primary-container rounded px-2 py-0.5 text-[10px] font-medium"
          onClick={handleAddReward}
        >
          + Add reward
        </button>
      </div>
    </div>
  );
}

interface RewardRowProps {
  reward: RewardActionData;
  onChange: (reward: RewardActionData) => void;
  onRemove: () => void;
}

function RewardRow({ reward, onChange, onRemove }: RewardRowProps) {
  return (
    <div className="border-outline-variant bg-surface-container-low flex items-start gap-2 rounded border p-2">
      <div className="min-w-0 flex-1 space-y-1">
        <Select value={reward.action} onValueChange={(value) => onChange({ ...reward, action: value })}>
          <SelectTrigger className="border-outline-variant focus:border-primary focus:ring-primary w-full rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="badge.award">Badge Award</SelectItem>
            <SelectItem value="webhook">Webhook</SelectItem>
            <SelectItem value="script">Script</SelectItem>
          </SelectContent>
        </Select>

        {reward.action === 'badge.award' && (
          <Input
            className="border-outline-variant focus:border-primary focus:ring-primary w-full rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1"
            placeholder="Badge ID"
            value={reward.badge ?? ''}
            onChange={(e) => onChange({ ...reward, badge: e.target.value })}
          />
        )}

        {reward.action === 'webhook' && (
          <Input
            className="border-outline-variant focus:border-primary focus:ring-primary w-full rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1"
            placeholder="https://example.com/webhook"
            value={reward.url ?? ''}
            onChange={(e) => onChange({ ...reward, url: e.target.value })}
          />
        )}

        {reward.action === 'script' && (
          <Textarea
            className="border-outline-variant focus:border-primary focus:ring-primary w-full rounded border px-2 py-1 font-mono text-xs focus:outline-none focus:ring-1"
            rows={2}
            placeholder="Script content"
            value={reward.exec ?? ''}
            onChange={(e) => onChange({ ...reward, exec: e.target.value })}
          />
        )}
      </div>
      <button
        type="button"
        className="text-on-surface-variant hover:bg-error-container hover:text-error shrink-0 rounded p-1"
        onClick={onRemove}
        aria-label="Remove reward"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
