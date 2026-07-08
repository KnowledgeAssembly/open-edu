import type { DictionaryEntry } from '../providers/types.js';

class TrieNode {
  children: Map<string, TrieNode> = new Map();
  isEnd = false;
  entry: DictionaryEntry | null = null;
}

export class ExactIndex {
  private root = new TrieNode();
  private wordCount = 0;

  insert(word: string, entry: DictionaryEntry): void {
    const lower = word.toLowerCase();
    let node = this.root;
    for (const char of lower) {
      const existing = node.children.get(char);
      if (existing) {
        node = existing;
      } else {
        const next = new TrieNode();
        node.children.set(char, next);
        node = next;
      }
    }
    if (!node.isEnd) {
      this.wordCount++;
    }
    node.isEnd = true;
    node.entry = entry;
  }

  get(word: string): DictionaryEntry | null {
    const node = this.findNode(word.toLowerCase());
    if (!node) return null;
    return node.isEnd ? node.entry : null;
  }

  has(word: string): boolean {
    const node = this.findNode(word.toLowerCase());
    return node !== null && node.isEnd;
  }

  getSuggestions(prefix: string, limit = 10): string[] {
    const normalized = prefix.toLowerCase();
    const node = this.findNode(normalized);
    if (!node) return [];
    const results: string[] = [];
    this.collectWords(node, normalized, results, limit);
    return results;
  }

  delete(word: string): boolean {
    const lower = word.toLowerCase();
    if (!this.has(lower)) return false;
    this.deleteRecursive(this.root, lower, 0);
    return true;
  }

  get size(): number {
    return this.wordCount;
  }

  clear(): void {
    this.root = new TrieNode();
    this.wordCount = 0;
  }

  private findNode(prefix: string): TrieNode | null {
    let node = this.root as TrieNode;
    for (const char of prefix) {
      const next = node.children.get(char);
      if (!next) return null;
      node = next;
    }
    return node;
  }

  private collectWords(node: TrieNode, prefix: string, results: string[], limit: number): void {
    if (results.length >= limit) return;
    if (node.isEnd) {
      results.push(prefix);
    }
    for (const [char, child] of node.children) {
      if (results.length >= limit) return;
      this.collectWords(child, prefix + char, results, limit);
    }
  }

  private deleteRecursive(node: TrieNode, word: string, depth: number): boolean {
    if (depth === word.length) {
      if (!node.isEnd) return false;
      node.isEnd = false;
      node.entry = null;
      this.wordCount--;
      return node.children.size === 0;
    }
    const char = word[depth]!;
    const child = node.children.get(char);
    if (!child) return false;
    const shouldCollapse = this.deleteRecursive(child, word, depth + 1);
    if (shouldCollapse) {
      node.children.delete(char);
      return !node.isEnd && node.children.size === 0;
    }
    return false;
  }
}
