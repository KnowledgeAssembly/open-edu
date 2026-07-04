import * as React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils.js';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

const Breadcrumb = React.forwardRef<HTMLElement, BreadcrumbProps>(({ items, className }, ref) => (
  <nav ref={ref} aria-label="Breadcrumb" className={className}>
    <ol className="flex items-center gap-1">
      {items.map((item, idx) => (
        <li
          key={`${item.label}-${item.href ?? idx}`}
          className="text-muted-foreground flex items-center gap-1 text-sm"
        >
          {idx > 0 && <ChevronRight className="h-4 w-4" />}
          {item.href ? (
            <a href={item.href} className={cn('text-primary hover:underline')}>
              {item.label}
            </a>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
        </li>
      ))}
    </ol>
  </nav>
));
Breadcrumb.displayName = 'Breadcrumb';

export { Breadcrumb };
