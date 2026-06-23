import { useEffect, useState, useRef, useCallback } from 'react';

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

const style: Record<string, React.CSSProperties> = {
  empty: {
    color: '#16a34a',
    textAlign: 'center',
    padding: '2rem 0',
    fontSize: '0.75rem',
  },
  error: {
    color: '#9ca3af',
    textAlign: 'center',
    padding: '2rem 0',
    fontSize: '0.75rem',
  },
  violationList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  violation: {
    padding: '0.5rem',
    borderRadius: '4px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    fontSize: '0.75rem',
  },
  violationId: {
    fontWeight: 600,
    color: '#dc2626',
  },
  impact: {
    display: 'inline-block',
    padding: '0.125rem 0.375rem',
    borderRadius: '3px',
    fontSize: '0.625rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    marginLeft: '0.375rem',
  },
  impactCritical: {
    backgroundColor: '#dc2626',
    color: '#ffffff',
  },
  impactSerious: {
    backgroundColor: '#ea580c',
    color: '#ffffff',
  },
  impactModerate: {
    backgroundColor: '#d97706',
    color: '#ffffff',
  },
  impactMinor: {
    backgroundColor: '#ca8a04',
    color: '#ffffff',
  },
  description: {
    color: '#374151',
    marginTop: '0.25rem',
  },
  help: {
    color: '#6b7280',
    marginTop: '0.125rem',
    fontSize: '0.6875rem',
  },
  node: {
    marginTop: '0.25rem',
    padding: '0.25rem 0.375rem',
    backgroundColor: '#ffffff',
    borderRadius: '2px',
    fontSize: '0.6875rem',
    color: '#4b5563',
    fontFamily: 'monospace',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  controls: {
    marginBottom: '0.5rem',
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
  },
  runButton: {
    padding: '0.375rem 0.75rem',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  badge: {
    fontSize: '0.625rem',
    color: '#6b7280',
  },
};

function impactStyle(impact: string): React.CSSProperties {
  switch (impact) {
    case 'critical':
      return { ...style.impact, ...style.impactCritical };
    case 'serious':
      return { ...style.impact, ...style.impactSerious };
    case 'moderate':
      return { ...style.impact, ...style.impactModerate };
    default:
      return { ...style.impact, ...style.impactMinor };
  }
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
    return <div style={style.error}>{error}</div>;
  }

  return (
    <div>
      <div style={style.controls}>
        <button type="button" style={style.runButton} onClick={runAudit} disabled={running}>
          {running ? 'Running...' : 'Run Audit'}
        </button>
        <span style={style.badge}>
          {violations.length > 0
            ? `${violations.length} violation${violations.length === 1 ? '' : 's'}`
            : 'No violations'}
        </span>
      </div>

      {violations.length === 0 ? (
        <div style={style.empty}>✓ No accessibility violations found</div>
      ) : (
        <div style={style.violationList}>
          {violations.map((v) => (
            <div key={v.id} style={style.violation}>
              <div>
                <span style={style.violationId}>{v.id}</span>
                <span style={impactStyle(v.impact)}>{v.impact}</span>
              </div>
              <div style={style.description}>{v.description}</div>
              <div style={style.help}>
                <a
                  href={v.helpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#2563eb' }}
                >
                  {v.help}
                </a>
              </div>
              {v.nodes.slice(0, 3).map((node, i) => (
                <div key={i} style={style.node}>
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
