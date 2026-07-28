import { useCallback } from 'react';
import { Plus, X } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

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
      <div className="border-secondary-container bg-secondary-container text-secondary rounded-lg border px-3 py-2 text-xs">
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
        className="text-primary hover:bg-primary-container flex items-center gap-1 rounded px-3 py-1.5 text-xs font-medium"
        onClick={handleAddRoute}
      >
        <Plus className="h-3.5 w-3.5" />
        Add Route
      </button>

      {routingKeys.length === 0 && (
        <div className="border-outline-variant text-on-surface-variant rounded-lg border-2 border-dashed p-6 text-center text-sm">
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
    <div className="border-outline-variant bg-surface shadow-elevation-flat rounded-lg border p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex flex-1 items-center gap-2">
          <span className="text-on-surface-variant text-xs font-medium">Node:</span>
          <Input
            className="border-outline-variant focus:border-primary focus:ring-primary min-w-0 flex-1 rounded border px-2 py-1 font-mono text-xs focus:outline-none focus:ring-1"
            value={routeKey}
            onChange={(e) => onKeyChange(e.target.value)}
            placeholder="nodes/example.md"
          />
        </div>
        <button
          type="button"
          className="text-on-surface-variant hover:bg-error-container hover:text-error ml-2 shrink-0 rounded p-1"
          onClick={onRemove}
          aria-label="Remove route"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <Select
          value={isSimple ? 'simple' : 'conditional'}
          onValueChange={(value) => {
            if (value === 'simple') {
              onRouteChange({ onComplete: COMPLETED_SENTINEL });
            } else {
              onRouteChange({ conditions: [{ if: 'score >= 80', then: 'nodes/next.md' }] });
            }
          }}
        >
          <SelectTrigger className="border-outline-variant focus:border-primary focus:ring-primary rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="simple">Simple Route</SelectItem>
            <SelectItem value="conditional">Conditional</SelectItem>
          </SelectContent>
        </Select>

        {isSimple ? (
          <div className="flex flex-1 items-center gap-2">
            <span className="text-on-surface-variant text-xs">onComplete →</span>
            <Input
              className="border-outline-variant focus:border-primary focus:ring-primary min-w-0 flex-1 rounded border px-2 py-1 font-mono text-xs focus:outline-none focus:ring-1"
              value={route.onComplete ?? ''}
              onChange={(e) => onRouteChange({ onComplete: e.target.value })}
              placeholder={COMPLETED_SENTINEL}
            />
            {targetIsCompleted && (
              <span className="bg-success/20 text-success rounded px-1.5 py-0.5 text-[10px] font-medium">
                End
              </span>
            )}
          </div>
        ) : (
          <div className="flex-1 space-y-1">
            {(route.conditions ?? []).map((cond, idx) => (
              <div key={idx} className="flex items-center gap-1">
                <span className="text-on-surface-variant text-xs">if</span>
                <Input
                  className="border-outline-variant focus:border-primary focus:ring-primary min-w-0 flex-1 rounded border px-2 py-1 font-mono text-xs focus:outline-none focus:ring-1"
                  value={cond.if}
                  onChange={(e) => {
                    const conditions = [...(route.conditions ?? [])];
                    const current = conditions[idx]!;
                    conditions[idx] = { if: e.target.value, then: current.then };
                    onRouteChange({ conditions });
                  }}
                  placeholder="score >= 80"
                />
                <span className="text-on-surface-variant text-xs">→</span>
                <Input
                  className="border-outline-variant focus:border-primary focus:ring-primary min-w-0 flex-1 rounded border px-2 py-1 font-mono text-xs focus:outline-none focus:ring-1"
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
                  className="text-on-surface-variant hover:bg-error-container hover:text-error shrink-0 rounded p-1"
                  onClick={() => {
                    const conditions = route.conditions?.filter((_, i) => i !== idx);
                    onRouteChange({ conditions });
                  }}
                  aria-label="Remove condition"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <button
              type="button"
              className="text-primary hover:bg-primary-container rounded px-2 py-0.5 text-[10px] font-medium"
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
