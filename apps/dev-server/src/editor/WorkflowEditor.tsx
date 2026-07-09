import { useCallback } from 'react';

interface RouteDef {
  onComplete?: string;
  conditions?: Array<{ if: string; then: string }>;
}

interface WorkflowData {
  routing: Record<string, RouteDef>;
}

interface WorkflowEditorProps {
  data: WorkflowData;
  onChange: (data: WorkflowData) => void;
}

const COMPLETED_SENTINEL = 'COMPLETED';

export function WorkflowEditor({ data, onChange }: WorkflowEditorProps) {
  const routingKeys = Object.keys(data.routing);

  const handleAddRoute = useCallback(() => {
    const newKey = `nodes/new-node-${routingKeys.length + 1}.md`;
    onChange({
      routing: {
        ...data.routing,
        [newKey]: { onComplete: COMPLETED_SENTINEL },
      },
    });
  }, [data, onChange, routingKeys]);

  const handleRemoveRoute = useCallback(
    (key: string) => {
      const { [key]: _removed, ...rest } = data.routing;
      onChange({ routing: rest });
    },
    [data, onChange],
  );

  const handleKeyChange = useCallback(
    (oldKey: string, newKey: string) => {
      const { [oldKey]: value, ...rest } = data.routing;
      if (value) {
        onChange({ routing: { ...rest, [newKey]: value } });
      }
    },
    [data, onChange],
  );

  const handleRouteChange = useCallback(
    (key: string, route: RouteDef) => {
      onChange({
        routing: { ...data.routing, [key]: route },
      });
    },
    [data, onChange],
  );

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
        Define the routing between content nodes. Each key is a node path, and its value specifies
        where the learner goes next.
      </div>

      <div className="space-y-3">
        {routingKeys.map((key) => (
          <RouteCard
            key={key}
            routeKey={key}
            route={data.routing[key] ?? { onComplete: COMPLETED_SENTINEL }}
            onKeyChange={(newKey) => handleKeyChange(key, newKey)}
            onRouteChange={(route) => handleRouteChange(key, route)}
            onRemove={() => handleRemoveRoute(key)}
          />
        ))}
      </div>

      <button
        type="button"
        className="flex items-center gap-1 rounded px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50"
        onClick={handleAddRoute}
      >
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Add Route
      </button>

      {routingKeys.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
          No routes defined. Add a route to define content flow.
        </div>
      )}
    </div>
  );
}

interface RouteCardProps {
  routeKey: string;
  route: RouteDef;
  onKeyChange: (newKey: string) => void;
  onRouteChange: (route: RouteDef) => void;
  onRemove: () => void;
}

function RouteCard({ routeKey, route, onKeyChange, onRouteChange, onRemove }: RouteCardProps) {
  const isSimple = route.onComplete !== undefined;
  const targetIsCompleted = route.onComplete === COMPLETED_SENTINEL;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex flex-1 items-center gap-2">
          <span className="text-xs font-medium text-gray-500">Node:</span>
          <input
            type="text"
            className="min-w-0 flex-1 rounded border border-gray-300 px-2 py-1 font-mono text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={routeKey}
            onChange={(e) => onKeyChange(e.target.value)}
            placeholder="nodes/example.md"
          />
        </div>
        <button
          type="button"
          className="ml-2 shrink-0 rounded p-1 text-gray-400 hover:bg-red-100 hover:text-red-600"
          onClick={onRemove}
          aria-label="Remove route"
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

      <div className="flex items-center gap-2">
        <select
          className="rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={isSimple ? 'simple' : 'conditional'}
          onChange={(e) => {
            if (e.target.value === 'simple') {
              onRouteChange({ onComplete: COMPLETED_SENTINEL });
            } else {
              onRouteChange({ conditions: [{ if: 'score >= 80', then: 'nodes/next.md' }] });
            }
          }}
        >
          <option value="simple">Simple Route</option>
          <option value="conditional">Conditional</option>
        </select>

        {isSimple ? (
          <div className="flex flex-1 items-center gap-2">
            <span className="text-xs text-gray-500">onComplete →</span>
            <input
              type="text"
              className="min-w-0 flex-1 rounded border border-gray-300 px-2 py-1 font-mono text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={route.onComplete ?? ''}
              onChange={(e) => onRouteChange({ onComplete: e.target.value })}
              placeholder={COMPLETED_SENTINEL}
            />
            {targetIsCompleted && (
              <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
                End
              </span>
            )}
          </div>
        ) : (
          <div className="flex-1 space-y-1">
            {(route.conditions ?? []).map((cond, idx) => (
              <div key={idx} className="flex items-center gap-1">
                <span className="text-xs text-gray-500">if</span>
                <input
                  type="text"
                  className="min-w-0 flex-1 rounded border border-gray-300 px-2 py-1 font-mono text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={cond.if}
                  onChange={(e) => {
                    const conditions = [...(route.conditions ?? [])];
                    const current = conditions[idx]!;
                    conditions[idx] = { if: e.target.value, then: current.then };
                    onRouteChange({ conditions });
                  }}
                  placeholder="score >= 80"
                />
                <span className="text-xs text-gray-500">→</span>
                <input
                  type="text"
                  className="min-w-0 flex-1 rounded border border-gray-300 px-2 py-1 font-mono text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={cond.then}
                  onChange={(e) => {
                    const conditions = [...(route.conditions ?? [])];
                    const current = conditions[idx]!;
                    conditions[idx] = { if: current.if, then: e.target.value };
                    onRouteChange({ conditions });
                  }}
                  placeholder="nodes/next.md"
                />
                <button
                  type="button"
                  className="shrink-0 rounded p-1 text-gray-400 hover:bg-red-100 hover:text-red-600"
                  onClick={() => {
                    const conditions = route.conditions?.filter((_, i) => i !== idx);
                    onRouteChange({ conditions });
                  }}
                  aria-label="Remove condition"
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
            ))}
            <button
              type="button"
              className="rounded px-2 py-0.5 text-[10px] font-medium text-blue-600 hover:bg-blue-50"
              onClick={() => {
                const conditions = [...(route.conditions ?? []), { if: '', then: '' }];
                onRouteChange({ conditions });
              }}
            >
              + Add condition
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
