import { lazy, type ComponentType } from 'react';
import { History, Images, ListChecks, MapPin, Tag, type LucideIcon } from 'lucide-react';

export type WidgetDemoId = 'quiz' | 'timeline' | 'image_compare' | 'hotspot' | 'label_diagram';

export interface WidgetDemoMeta {
  id: WidgetDemoId;
  titleKey: string;
  descriptionKey: string;
  icon: LucideIcon;
  Demo: ComponentType;
}

export const WIDGET_DEMOS: WidgetDemoMeta[] = [
  {
    id: 'quiz',
    titleKey: 'website.widgets.quiz.title',
    descriptionKey: 'website.widgets.quiz.description',
    icon: ListChecks,
    Demo: lazy(() =>
      import('../ui/demos/QuizDemo').then((module) => ({ default: module.QuizDemo })),
    ),
  },
  {
    id: 'timeline',
    titleKey: 'website.widgets.timeline.title',
    descriptionKey: 'website.widgets.timeline.description',
    icon: History,
    Demo: lazy(() =>
      import('../ui/demos/TimelineDemo').then((module) => ({ default: module.TimelineDemo })),
    ),
  },
  {
    id: 'image_compare',
    titleKey: 'website.widgets.image_compare.title',
    descriptionKey: 'website.widgets.image_compare.description',
    icon: Images,
    Demo: lazy(() =>
      import('../ui/demos/ImageCompareDemo').then((module) => ({
        default: module.ImageCompareDemo,
      })),
    ),
  },
  {
    id: 'hotspot',
    titleKey: 'website.widgets.hotspot.title',
    descriptionKey: 'website.widgets.hotspot.description',
    icon: MapPin,
    Demo: lazy(() =>
      import('../ui/demos/HotspotDemo').then((module) => ({ default: module.HotspotDemo })),
    ),
  },
  {
    id: 'label_diagram',
    titleKey: 'website.widgets.label_diagram.title',
    descriptionKey: 'website.widgets.label_diagram.description',
    icon: Tag,
    Demo: lazy(() =>
      import('../ui/demos/LabelDiagramDemo').then((module) => ({
        default: module.LabelDiagramDemo,
      })),
    ),
  },
];
