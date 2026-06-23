import { useEffect, useRef, useState } from 'react';

export interface AxeValidatorProps {
  disabled?: boolean;
}

export interface AxeViolation {
  id: string;
  impact: string;
  description: string;
  help: string;
  helpUrl: string;
  nodes: Array<{
    target: string[];
    html: string;
    failureSummary?: string;
  }>;
}

export interface AxeResults {
  violations: AxeViolation[];
  passes: Array<unknown>;
}

export function AxeValidator({ disabled = false }: AxeValidatorProps): JSX.Element | null {
  const ref = useRef<HTMLDivElement | null>(null);
  const [_results, _setResults] = useState<AxeResults | null>(null);

  const isDev = typeof process !== 'undefined' && process.env.NODE_ENV === 'development';

  useEffect(() => {
    if (!isDev || disabled) return;

    let cancelled = false;

    const run = async () => {
      try {
        const axe = await import('axe-core');
        const el = ref.current?.parentElement ?? document.body;

        const raw = await axe.default.run(el, {
          runOnly: {
            type: 'tag',
            values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'],
          },
          resultTypes: ['violations', 'passes'],
        });

        if (cancelled) return;
        const result = raw as AxeResults;
        _setResults(result);

        if (result.violations.length > 0) {
          console.groupCollapsed(
            `[AxeValidator] ${result.violations.length} accessibility violation(s) found`,
          );
          for (const v of result.violations) {
            console.group(`${v.id} (${v.impact})`);
            console.log(`Description: ${v.description}`);
            console.log(`Help: ${v.help}\n${v.helpUrl}`);
            for (const node of v.nodes) {
              console.log('Target:', node.target.join(', '));
              console.log('HTML:', node.html);
              if (node.failureSummary) {
                console.log('Summary:', node.failureSummary);
              }
            }
            console.groupEnd();
          }
          console.groupEnd();
        } else {
          console.log('[AxeValidator] No accessibility violations found.');
        }
      } catch {
        console.warn('[AxeValidator] Failed to load axe-core');
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [disabled, isDev]);

  if (!isDev || disabled) return null;

  return (
    <div ref={ref} data-testid="axe-validator" style={{ display: 'none' }} aria-hidden="true" />
  );
}
