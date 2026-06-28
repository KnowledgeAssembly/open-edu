import { cn } from '../lib/utils.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../primitives/card.js';

export interface ReferenceCardProps {
  title: string;
  url?: string;
  description?: string;
  className?: string;
}

export function ReferenceCard({
  title,
  url,
  description,
  className,
}: ReferenceCardProps): JSX.Element {
  return (
    <Card className={cn('', className)} data-testid="reference-card">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      {url && (
        <CardContent>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-primary hover:underline"
          >
            View reference &rarr;
          </a>
        </CardContent>
      )}
    </Card>
  );
}
ReferenceCard.displayName = 'ReferenceCard';
