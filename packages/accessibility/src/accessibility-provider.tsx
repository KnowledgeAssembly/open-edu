import { type ReactNode } from 'react';
import { FocusProvider } from './focus/FocusContext';
import { AriaProvider } from './aria/AriaContext';

export interface AccessibilityProviderProps {
  children: ReactNode;
}

export function AccessibilityProvider({ children }: AccessibilityProviderProps): JSX.Element {
  return (
    <AriaProvider>
      <FocusProvider>{children}</FocusProvider>
    </AriaProvider>
  );
}
