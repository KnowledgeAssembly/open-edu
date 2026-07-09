import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import type {
  LearningContext,
  ConversationMessage,
  AIResponse,
  SearchResponse,
  EnrichedResult,
} from '@open-edu/ai-companion';
import {
  ConversationManager,
  CacheService,
  DictionaryService,
  SearchManager,
  ContextManager,
} from '@open-edu/ai-companion';
import { AIProviderImpl } from './AIProviderImpl';

export type PanelState = 'closed' | 'floating' | 'expanded' | 'pinned';

export interface CompanionContextValue {
  panelState: PanelState;
  setPanelState: (state: PanelState) => void;
  messages: ConversationMessage[];
  isLoading: boolean;
  context: LearningContext;
  sendMessage: (text: string) => Promise<void>;
  search: (query: string) => SearchResponse;
  clearConversation: () => void;
  contextManager: ContextManager;
}

export interface CompanionProviderProps {
  children: ReactNode;
}

const CompanionContext = createContext<CompanionContextValue | null>(null);

export function CompanionProvider({ children }: CompanionProviderProps): JSX.Element {
  const [panelState, setPanelState] = useState<PanelState>('closed');
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [context, setContext] = useState<LearningContext>({});

  const servicesRef = useRef<{
    conversationManager: ConversationManager;
    searchManager: SearchManager;
    aiProvider: AIProviderImpl;
    cacheService: CacheService;
  } | null>(null);

  const contextManagerRef = useRef<ContextManager>(new ContextManager());

  useEffect(() => {
    const cacheService = new CacheService();
    const dictionaryService = DictionaryService.createDefault();
    const conversationManager = new ConversationManager();
    const searchManager = new SearchManager(dictionaryService, cacheService);
    const aiProvider = new AIProviderImpl();

    servicesRef.current = { conversationManager, searchManager, aiProvider, cacheService };
    conversationManager.loadSessions();
    dictionaryService.initialize().catch(() => {});

    const unsub = contextManagerRef.current.subscribe((ctx) => {
      setContext(ctx);
    });

    return () => {
      unsub();
    };
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    const services = servicesRef.current;
    if (!services) return;

    setIsLoading(true);
    const ctx = contextManagerRef.current.getCurrentContext();
    const userMsg = services.conversationManager.send(text, ctx);
    setMessages((prev) => [...prev, userMsg]);

    try {
      let response: AIResponse;

      const firstWord = text.split(/\s+/)[0]?.toLowerCase();
      if (firstWord && services.searchManager.search(firstWord).instant.entry) {
        const searchResult = services.searchManager.search(text, ctx);
        const instant = searchResult.instant;
        if (instant.entry) {
          response = {
            text:
              instant.entry.definitions[0]?.definition ??
              `See definition for "${instant.entry.word}"`,
            citations: instant.entry.definitions.slice(0, 3).map((d) => ({
              source: 'Dictionary',
              text: d.definition,
            })),
            timestamp: Date.now(),
          };
        } else {
          response = await services.aiProvider.ask(text, ctx);
        }
      } else {
        response = await services.aiProvider.ask(text, ctx);
      }

      const aiMsg: ConversationMessage = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        role: 'ai',
        text: response.text,
        timestamp: response.timestamp,
        citations: response.citations,
      };

      const sessionId = services.conversationManager.currentSession;
      if (sessionId) {
        services.conversationManager.addMessage(sessionId, aiMsg);
      }
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const errorMsg: ConversationMessage = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        role: 'ai',
        text: 'Sorry, I had trouble responding. Please try again.',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const search = useCallback((query: string): SearchResponse => {
    const services = servicesRef.current;
    if (!services) {
      return {
        query,
        instant: { entry: null, suggestions: [] },
        enriched: Promise.resolve<EnrichedResult>({
          ftsResults: [],
          cachedAiResponse: null,
          courseReferences: [],
        }),
      };
    }
    return services.searchManager.search(query, contextManagerRef.current.getCurrentContext());
  }, []);

  const clearConversation = useCallback(() => {
    const services = servicesRef.current;
    if (!services) return;
    const sessionId = services.conversationManager.currentSession;
    if (sessionId) {
      services.conversationManager.resetSession(sessionId);
    }
    setMessages([]);
  }, []);

  const value = useMemo<CompanionContextValue>(
    () => ({
      panelState,
      setPanelState,
      messages,
      isLoading,
      context,
      sendMessage,
      search,
      clearConversation,
      contextManager: contextManagerRef.current,
    }),
    [panelState, messages, isLoading, context, sendMessage, search, clearConversation],
  );

  return <CompanionContext.Provider value={value}>{children}</CompanionContext.Provider>;
}

export function useCompanion(): CompanionContextValue {
  const ctx = useContext(CompanionContext);
  if (!ctx) {
    throw new Error('useCompanion must be used within a <CompanionProvider>');
  }
  return ctx;
}
