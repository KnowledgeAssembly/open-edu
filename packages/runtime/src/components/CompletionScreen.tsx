import { CompletionScreen as DSCCompletionScreen } from '@open-edu/design-system';
import type { CompletionScreenProps as DSCCompletionScreenProps } from '@open-edu/design-system';
import { useRuntime } from '../context/RuntimeContext.js';
import { SkillSummary } from './SkillSummary.js';

export type { CompletionStats } from '@open-edu/design-system';

export type CompletionScreenProps = Omit<DSCCompletionScreenProps, 'title' | 'skillSummary'>;

export function CompletionScreen(props: CompletionScreenProps): JSX.Element {
  const { loadedPackage } = useRuntime();
  const title = loadedPackage.manifest.title ?? '';

  return <DSCCompletionScreen {...props} title={title} skillSummary={<SkillSummary />} />;
}
