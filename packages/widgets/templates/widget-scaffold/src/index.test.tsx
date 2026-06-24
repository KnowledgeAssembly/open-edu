import { describe, it, expect } from 'vitest';
import myWidget from './index';

describe('myWidget', () => {
  it('should have a non-empty id', () => {
    expect(myWidget.id).toBeTruthy();
    expect(typeof myWidget.id).toBe('string');
  });

  it('should have a render function', () => {
    expect(typeof myWidget.render).toBe('function');
  });

  it('should not throw when calling render with mock props', () => {
    const mockProps = {
      nodeId: 'test-node',
      config: {},
      emitInteraction: () => {},
      complete: () => {},
    };
    expect(() => myWidget.render(mockProps)).not.toThrow();
  });
});
