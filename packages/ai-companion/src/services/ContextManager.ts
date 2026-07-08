import type { LearningContext, ContextProvider } from '../providers/types.js';

type ContextListener = (context: LearningContext) => void;

export class ContextManager implements ContextProvider {
  private currentContext: LearningContext = {};
  private listeners = new Set<ContextListener>();

  getCurrentContext(): LearningContext {
    return { ...this.currentContext };
  }

  updateContext(update: Partial<LearningContext>): void {
    this.currentContext = { ...this.currentContext, ...update };
    this.notifyListeners();
  }

  setContext(context: LearningContext): void {
    this.currentContext = { ...context };
    this.notifyListeners();
  }

  subscribe(callback: ContextListener): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(): void {
    const snapshot = this.getCurrentContext();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}
