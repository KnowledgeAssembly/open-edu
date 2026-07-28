import { useEffect, useState, useRef, useCallback } from 'react';
import { Button } from '../components/ui/button';
import { cn } from '@open-edu/design-system';
import { Play } from 'lucide-react';

interface Violation {
  id: string;
  impact: string;
  description: string;
  help: string;
  helpUrl: string;
  nodes: Array<{
    target: string[];
    html: string;
  }>;
}

interface AxeResults {
  violations: Violation[];
}

export function AccessibilityInspector(): JSX.Element {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const autoRunRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const runAudit = useCallback(async () => {
    setRunning(true);
    setError(null);
    try {
      const axe = await import('axe-core');
      const el = document.querySelector('.open-edu-runtime') ?? document.body;
      const raw = await axe.default.run(el, {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'],
        },
        resultTypes: ['violations'],
      });
      const results = raw as unknown as AxeResults;
      setViolations(results.violations ?? []);
    } catch {
      setError('axe-core not available. Install it or check the console.');
    } finally {
      setRunning(false);
    }
  }, []);

  useEffect(() => {
    autoRunRef.current = setInterval(() => {
      runAudit();
    }, 5000);
    runAudit();
    return () => {
      if (autoRunRef.current) {
        clearInterval(autoRunRef.current);
      }
    };
  }, [runAudit]);

  if (error) {
    return <div className="text-on-surface-variant py-8 text-center text-xs">{error}</div>;
  }

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={runAudit}
          disabled={running}
          className="h-auto py-1.5"
        >
          <Play className="mr-1 h-3 w-3" />
          {running ? 'Running...' : 'Run Audit'}
        </Button>
        <span className="text-on-surface-variant text-[0.625rem]">
          {violations.length > 0
            ? `${violations.length} violation${violations.length === 1 ? '' : 's'}`
            : 'No violations'}
        </span>
      </div>

      {violations.length === 0 ? (
        <div className="text-success py-8 text-center text-xs">
          No accessibility violations found
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {violations.map((v) => (
            <div
              key={v.id}
              className="bg-error/10 border-error/20 space-y-1 rounded border p-2 text-xs"
            >
              <div>
                <span className="text-error font-semibold">{v.id}</span>
                <span
                  className={cn(
                    'ml-1.5 inline-block rounded px-1 py-px text-[0.625rem] font-semibold uppercase text-white',
                    v.impact === 'critical' && 'bg-destructive',
                    v.impact === 'serious' && 'bg-orange-600',
                    v.impact === 'moderate' && 'bg-amber-600',
                    v.impact === 'minor' && 'bg-yellow-600',
                  )}
                >
                  {v.impact}
                </span>
              </div>
              <div className="text-on-surface mt-1">{v.description}</div>
              <div className="text-on-surface-variant mt-0.5 text-[0.6875rem]">
                <a
                  href={v.helpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {v.help}
                </a>
              </div>
              {v.nodes.slice(0, 3).map((node, i) => (
                <div
                  key={i}
                  className="bg-surface text-on-surface mt-1 overflow-hidden text-ellipsis rounded px-1.5 py-1 font-mono text-[0.6875rem]"
                >
                  {node.target.join(', ')}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
