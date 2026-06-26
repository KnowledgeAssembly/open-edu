import { AppShell } from './AppShell';
import { catalogPackages, packageEntries } from 'virtual:edu-data';

export function App(): JSX.Element {
  return <AppShell catalogPackages={catalogPackages} packageEntries={packageEntries} />;
}
