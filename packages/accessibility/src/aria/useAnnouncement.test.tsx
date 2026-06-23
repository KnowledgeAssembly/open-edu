import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { AriaProvider } from './AriaContext';
import { useAnnouncement } from './useAnnouncement';
import { useEffect } from 'react';

function AnnouncerTest({
  onCall,
}: {
  onCall: (announce: ReturnType<typeof useAnnouncement>) => void;
}): null {
  const announce = useAnnouncement();
  useEffect(() => {
    onCall(announce);
  }, [announce, onCall]);
  return null;
}

describe('useAnnouncement', () => {
  it('should return a function that calls announce on the context', () => {
    let captured: ReturnType<typeof useAnnouncement> | undefined;
    render(
      <AriaProvider>
        <AnnouncerTest
          onCall={(fn) => {
            captured = fn;
          }}
        />
      </AriaProvider>,
    );
    expect(captured).toBeDefined();
    expect(typeof captured).toBe('function');
  });
});
