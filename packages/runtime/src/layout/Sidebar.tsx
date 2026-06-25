import { type CSSProperties } from 'react';
import { useRuntime } from '../context/RuntimeContext.js';
import type { LoadedNode } from '@open-edu/core';

export interface SidebarProps {
  nodes: LoadedNode[];
}

export function Sidebar({ nodes }: SidebarProps): JSX.Element {
  const { loadedPackage, currentNodeId, visitedNodes } = useRuntime();
  const title = loadedPackage.manifest.title;
  const total = nodes.length;

  const navStyle: CSSProperties = {
    width: '280px',
    borderRight: `1px solid var(--oe-color-border, #e5e7eb)`,
    padding: '1rem',
    overflowY: 'auto',
    fontFamily: 'var(--oe-font-sans, system-ui, sans-serif)',
    height: '100%',
    boxSizing: 'border-box',
  };

  const headingStyle: CSSProperties = {
    fontSize: '1.125rem',
    fontWeight: 700,
    margin: '0 0 1rem',
    color: 'var(--oe-color-fg, #1a1a1a)',
  };

  const listStyle: CSSProperties = {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  };

  const mutedStyle: CSSProperties = {
    color: 'var(--oe-color-muted, #6b7280)',
    fontSize: '0.75rem',
    marginTop: '1rem',
  };

  return (
    <nav aria-label="Course outline" style={navStyle} data-testid="sidebar">
      <h2 style={headingStyle}>{title}</h2>
      {nodes.length === 0 ? (
        <p style={mutedStyle}>No lessons</p>
      ) : (
        <ol style={listStyle}>
          {nodes.map((node) => {
            const nodeTitle =
              (node.node as { title?: string }).title ?? node.relativePath.replace('.md', '');
            const isCurrent = node.relativePath === currentNodeId;
            const isVisited = visitedNodes.includes(node.relativePath);

            let icon: string;
            let iconColor: string;
            if (isCurrent) {
              icon = '\u25CF';
              iconColor = 'var(--oe-color-primary-fg, #ffffff)';
            } else if (isVisited) {
              icon = '\u25CF';
              iconColor = 'var(--oe-color-muted, #6b7280)';
            } else {
              icon = '\u25CB';
              iconColor = 'var(--oe-color-muted, #6b7280)';
            }

            const liStyle: CSSProperties = {
              padding: '0.5rem',
              borderRadius: 'var(--oe-radius, 8px)',
              backgroundColor: isCurrent
                ? 'var(--oe-color-primary, #2563eb)'
                : 'transparent',
              color: isCurrent
                ? 'var(--oe-color-primary-fg, #ffffff)'
                : 'var(--oe-color-fg, #1a1a1a)',
              cursor: 'default',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            };

            return (
              <li
                key={node.relativePath}
                style={liStyle}
                aria-current={isCurrent ? 'step' : undefined}
                data-testid={`sidebar-node-${node.relativePath}`}
              >
                <span style={{ color: iconColor, flexShrink: 0 }}>{icon}</span>
                <span>{nodeTitle}</span>
              </li>
            );
          })}
        </ol>
      )}
      <p style={mutedStyle}>
        {visitedNodes.length} of {total} complete
      </p>
    </nav>
  );
}
