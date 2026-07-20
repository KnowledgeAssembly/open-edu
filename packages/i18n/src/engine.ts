export interface TranslationEngineOptions {
  locales: readonly string[];
  fallbackLocale: string;
  onMissing?: (key: string, locale: string) => void;
}

type Dictionary = Record<string, string>;

export class TranslationEngine {
  private dictionaries = new Map<string, Map<string, Dictionary>>();
  private fallbackLocale: string;
  private onMissing?: (key: string, locale: string) => void;

  constructor(options: TranslationEngineOptions) {
    this.fallbackLocale = options.fallbackLocale;
    this.onMissing = options.onMissing;
  }

  loadNamespace(namespace: string, locale: string, data: Dictionary): void {
    if (!this.dictionaries.has(locale)) {
      this.dictionaries.set(locale, new Map());
    }
    this.dictionaries.get(locale)!.set(namespace, { ...data });
  }

  t(key: string, locale: string, params?: Record<string, string>): string {
    const namespace = this.resolveNamespace(key);
    const dictKey = namespace ? key.slice(namespace.length + 1) : key;

    let result = this.lookup(dictKey, namespace, locale);
    if (result === undefined && locale !== this.fallbackLocale) {
      result = this.lookup(dictKey, namespace, this.fallbackLocale);
    }
    if (result === undefined) {
      this.onMissing?.(key, locale);
      return key;
    }
    if (params) {
      result = this.interpolate(result, params);
    }
    return result;
  }

  hasNamespace(namespace: string, locale: string): boolean {
    return this.dictionaries.get(locale)?.has(namespace) ?? false;
  }

  getLoadedNamespaces(locale: string): string[] {
    return Array.from(this.dictionaries.get(locale)?.keys() ?? []);
  }

  private resolveNamespace(key: string): string | null {
    const dotIndex = key.indexOf('.');
    return dotIndex > 0 ? key.slice(0, dotIndex) : null;
  }

  private lookup(dictKey: string, namespace: string | null, locale: string): string | undefined {
    const localeDicts = this.dictionaries.get(locale);
    if (!localeDicts) return undefined;
    if (namespace) {
      const dict = localeDicts.get(namespace);
      return dict?.[dictKey];
    }
    for (const dict of localeDicts.values()) {
      if (dictKey in dict) return dict[dictKey];
    }
    return undefined;
  }

  private interpolate(template: string, params: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, name: string) => {
      return params[name] ?? `{{${name}}}`;
    });
  }
}
