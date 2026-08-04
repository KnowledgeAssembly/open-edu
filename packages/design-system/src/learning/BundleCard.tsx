import { useState, type JSX } from 'react';
import { cn } from '../lib/utils.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../primitives/card.js';
import { Badge } from '../primitives/badge.js';
import { Progress } from '../primitives/progress.js';
import {
  getCourseCardImage,
  getPrepackagedCourseCardImage,
  resolveCourseCardImageCategory,
  type CourseCardImageCategory,
} from './prepackagedImages.js';

export interface BundleCardProps {
  title: string;
  description?: string;
  moduleCount: number;
  activityCount: number;
  completedModules: number;
  totalModules: number;
  isStarted: boolean;
  onStart: () => void;
  className?: string;
  /** Cover image URL or data URI. Falls back to a subject-themed prepackaged SVG. */
  image?: string;
  subject?: string;
}

function CardCoverImage({
  image,
  fallbackCategory = 'default',
}: {
  image: string;
  fallbackCategory?: CourseCardImageCategory;
}): JSX.Element {
  const [src, setSrc] = useState(image);

  return (
    <div
      className="bg-surface-container-high relative h-36 w-full overflow-hidden rounded-t-2xl"
      data-testid="bundle-card-cover"
    >
      <img
        src={src}
        alt=""
        className="h-full w-full object-cover"
        onError={() => setSrc(getPrepackagedCourseCardImage(fallbackCategory))}
      />
    </div>
  );
}

export function BundleCard({
  title,
  description,
  moduleCount,
  activityCount,
  completedModules,
  totalModules,
  isStarted,
  onStart,
  className,
  image,
  subject,
}: BundleCardProps): JSX.Element {
  const percent = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;
  const coverCategory = resolveCourseCardImageCategory({ subject, title });
  const coverSrc =
    image ??
    getCourseCardImage({
      subject,
      title,
    });

  return (
    <Card
      data-testid="bundle-card"
      onClick={onStart}
      className={cn(
        'flex h-full cursor-pointer flex-col justify-between overflow-hidden shadow-sm transition-shadow hover:shadow-md',
        className,
      )}
    >
      <CardCoverImage image={coverSrc} fallbackCategory={coverCategory} />
      <CardHeader className="pr-16">
        <div className="mb-1 flex items-center gap-2">
          <Badge variant="secondary">Bundle</Badge>
          <CardTitle className="text-h4 font-display truncate">{title}</CardTitle>
        </div>
        {description && <CardDescription>{description}</CardDescription>}
        {!description && <CardDescription>{moduleCount} modules</CardDescription>}
      </CardHeader>
      <CardContent className="mt-auto">
        <div className="text-on-surface-variant flex gap-4 text-xs">
          <span>{moduleCount} modules</span>
          <span>{activityCount} activities</span>
        </div>
        {isStarted && (
          <div className="mt-2">
            <Progress
              value={percent}
              className="h-2"
              label={`${completedModules} of ${totalModules} complete`}
            />
            <span className="text-on-surface-variant mt-1 block text-xs">
              {completedModules} of {totalModules} complete
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

BundleCard.displayName = 'BundleCard';
