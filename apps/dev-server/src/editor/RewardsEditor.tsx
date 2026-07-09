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
        <div className="rounded-lg border border-green-100 bg-green-50 px-3 py-2 text-xs text-green-700">
          Define reward triggers — events that award badges, call webhooks, or run scripts.
        </div>
        <div className="rounded-lg border-2 border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
          No triggers defined
        </div>
        <button
          type="button"
          className="rounded px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50"
          onClick={handleAddTrigger}
        >
          + Add Trigger
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-green-100 bg-green-50 px-3 py-2 text-xs text-green-700">
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
        className="rounded px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50"
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
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">Trigger</span>
        <button
          type="button"
          className="rounded p-1 text-gray-400 hover:bg-red-100 hover:text-red-600"
          onClick={onRemove}
          aria-label="Remove trigger"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="mb-2">
        <label className="mb-0.5 block text-[10px] font-medium text-gray-500">On Event</label>
        <div className="flex gap-1">
          <input
            type="text"
            className="min-w-0 flex-1 rounded border border-gray-300 px-2 py-1 font-mono text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
        <label className="text-[10px] font-medium text-gray-500">Rewards</label>
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
          className="rounded px-2 py-0.5 text-[10px] font-medium text-blue-600 hover:bg-blue-50"
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
    <div className="flex items-start gap-2 rounded border border-gray-100 bg-gray-50 p-2">
      <div className="min-w-0 flex-1 space-y-1">
        <select
          className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={reward.action}
          onChange={(e) => onChange({ ...reward, action: e.target.value })}
        >
          <option value="badge.award">Badge Award</option>
          <option value="webhook">Webhook</option>
          <option value="script">Script</option>
        </select>

        {reward.action === 'badge.award' && (
          <input
            type="text"
            className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Badge ID"
            value={reward.badge ?? ''}
            onChange={(e) => onChange({ ...reward, badge: e.target.value })}
          />
        )}

        {reward.action === 'webhook' && (
          <input
            type="text"
            className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="https://example.com/webhook"
            value={reward.url ?? ''}
            onChange={(e) => onChange({ ...reward, url: e.target.value })}
          />
        )}

        {reward.action === 'script' && (
          <textarea
            className="w-full rounded border border-gray-300 px-2 py-1 font-mono text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            rows={2}
            placeholder="Script content"
            value={reward.exec ?? ''}
            onChange={(e) => onChange({ ...reward, exec: e.target.value })}
          />
        )}
      </div>
      <button
        type="button"
        className="shrink-0 rounded p-1 text-gray-400 hover:bg-red-100 hover:text-red-600"
        onClick={onRemove}
        aria-label="Remove reward"
      >
        <svg
          className="h-3 w-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
