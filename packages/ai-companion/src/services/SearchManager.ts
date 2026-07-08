import type { DictionaryEntry } from '../providers/types.js';
import type { LearningContext } from '../providers/types.js';
import type { DictionaryService } from './DictionaryService.js';
import type { CacheService } from './CacheService.js';

export interface InstantResult {
  entry: DictionaryEntry | null;
  suggestions: string[];
}

export interface EnrichedResult {
  ftsResults: DictionaryEntry[];
  cachedAiResponse: string | null;
  courseReferences: Array<{ title: string; snippet: string }>;
}

export interface SearchResponse {
  query: string;
  instant: InstantResult;
  enriched: Promise<EnrichedResult>;
}

export class SearchManager {
  constructor(
    private dictionaryService: DictionaryService,
    private cacheService: CacheService,
  ) {}

  search(query: string, context?: LearningContext): SearchResponse {
    const normalized = query.toLowerCase().trim();

    const exact = this.dictionaryService.lookupExact(normalized);
    const suggestions = exact ? [] : this.dictionaryService.getSuggestions(normalized, 5);

    const instant: InstantResult = {
      entry: exact,
      suggestions,
    };

    const enriched = this.performLevel2Search(normalized, context);

    return { query, instant, enriched };
  }

  private async performLevel2Search(
    query: string,
    context?: LearningContext,
  ): Promise<EnrichedResult> {
    const [ftsResults, cachedAiResponse, courseReferences] = await Promise.all([
      this.dictionaryService.searchFTS(query, 8),
      this.lookupAiCache(query),
      this.searchCourseContent(query, context),
    ]);

    return { ftsResults, cachedAiResponse, courseReferences };
  }

  private async lookupAiCache(query: string): Promise<string | null> {
    const cacheKey = `ai:${query}`;
    const cached = this.cacheService.get<string>(cacheKey);
    return cached ?? null;
  }

  private async searchCourseContent(
    query: string,
    context?: LearningContext,
  ): Promise<Array<{ title: string; snippet: string }>> {
    if (!context?.pageContent) return [];

    const references: Array<{ title: string; snippet: string }> = [];
    const queryWords = query.toLowerCase().split(/\s+/);

    const sentences = context.pageContent.split(/[.!?]+/);
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (!trimmed) continue;

      const words = queryWords.filter((w) => trimmed.toLowerCase().includes(w));
      if (words.length > 0 && words.length > queryWords.length * 0.5) {
        references.push({
          title: context.lessonTitle ?? context.courseTitle ?? 'Course Content',
          snippet: trimmed.length > 120 ? trimmed.slice(0, 120) + '...' : trimmed,
        });
        if (references.length >= 3) break;
      }
    }

    return references;
  }
}
