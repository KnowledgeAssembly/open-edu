import { AiCompanionDemo } from '../components/sections/AiCompanionDemo';
import { BuiltForEveryone } from '../components/sections/BuiltForEveryone';
import { ExploreCourses } from '../components/sections/ExploreCourses';
import { GetStartedCTA } from '../components/sections/GetStartedCTA';
import { InteractiveHero } from '../components/sections/InteractiveHero';
import { OfflineDemo } from '../components/sections/OfflineDemo';
import { OpenSourceCommunity } from '../components/sections/OpenSourceCommunity';
import { TryWidgets } from '../components/sections/TryWidgets';
import { WhyOpenEdu } from '../components/sections/WhyOpenEdu';

export function HomePage(): JSX.Element {
  return (
    <>
      <InteractiveHero />
      <WhyOpenEdu />
      <ExploreCourses />
      <TryWidgets />
      <AiCompanionDemo />
      <OfflineDemo />
      <BuiltForEveryone />
      <OpenSourceCommunity />
      <GetStartedCTA />
    </>
  );
}
