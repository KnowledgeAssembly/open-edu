import { useTranslation } from '@open-edu/i18n';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  StaggerReveal,
} from '@open-edu/design-system';
import { Code2, GraduationCap, Presentation, Users, type LucideIcon } from 'lucide-react';

interface Role {
  titleKey: string;
  descriptionKey: string;
  icon: LucideIcon;
}

const ROLES: Role[] = [
  {
    icon: GraduationCap,
    titleKey: 'website.everyone.learners.title',
    descriptionKey: 'website.everyone.learners.description',
  },
  {
    icon: Presentation,
    titleKey: 'website.everyone.educators.title',
    descriptionKey: 'website.everyone.educators.description',
  },
  {
    icon: Users,
    titleKey: 'website.everyone.parents.title',
    descriptionKey: 'website.everyone.parents.description',
  },
  {
    icon: Code2,
    titleKey: 'website.everyone.developers.title',
    descriptionKey: 'website.everyone.developers.description',
  },
];

export function BuiltForEveryone(): JSX.Element {
  const { t } = useTranslation();

  return (
    <section aria-labelledby="everyone-heading" className="bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="max-w-2xl">
          <p className="text-primary text-sm font-semibold uppercase tracking-wide">
            {t('website.everyone.eyebrow')}
          </p>
          <h2
            id="everyone-heading"
            className="text-on-surface mt-4 text-3xl font-bold tracking-tight sm:text-4xl"
          >
            {t('website.everyone.title')}
          </h2>
          <p className="text-on-surface-variant mt-4 text-lg">{t('website.everyone.subtitle')}</p>
        </div>

        <StaggerReveal delayMs={120} className="mt-12 grid gap-6 sm:grid-cols-2">
          {ROLES.map((role) => {
            const Icon = role.icon;
            return (
              <Card key={role.titleKey} className="h-full">
                <CardHeader>
                  <div className="bg-primary/10 text-primary inline-flex h-12 w-12 items-center justify-center rounded-lg">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <CardTitle className="text-lg">{t(role.titleKey)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{t(role.descriptionKey)}</CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </StaggerReveal>
      </div>
    </section>
  );
}

BuiltForEveryone.displayName = 'BuiltForEveryone';
