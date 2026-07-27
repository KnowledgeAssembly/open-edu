export type {
  DictionaryEntry,
  DictionaryProvider,
  LearningContext,
  ExplanationRequest,
  AIResponse,
  AIProvider,
  ContextProvider,
  ConversationMessage,
  ConversationStore,
  CacheEntry,
  CacheProvider,
} from './providers/types.js';

export type { SearchBuilder, SearchBuilderType } from './search/types.js';
export { DictionaryLoader } from './data/DictionaryLoader.js';
export type {
  PackageManifest,
  PackageMetadata,
  PackageInfo,
  LoadedPackage,
} from './data/DictionaryLoader.js';
export { ExactIndex } from './search/ExactIndex.js';
export { FlexSearchIndex } from './search/FlexSearchIndex.js';

export { DictionaryService } from './services/DictionaryService.js';
export { SearchManager } from './services/SearchManager.js';
export type { SearchResponse, InstantResult, EnrichedResult } from './services/SearchManager.js';
export { CacheService } from './services/CacheService.js';
export { ContextManager } from './services/ContextManager.js';
export { ConversationManager } from './services/ConversationManager.js';

export * from './pipili/index.js';
