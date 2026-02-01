/**
 * Document Search Module
 * Full-text search and indexing capabilities for documents
 */

import type {
  FileFormat,
  InputDataType,
  SearchOptions,
  SearchResult,
  DocumentMetadata,
} from '../core/types.js';
import { ExtractorRegistry, initializeExtractors } from '../extractors/index.js';
import { generateId, toBuffer } from '../utils/helpers.js';

/**
 * Search hit information
 */
export interface SearchHit {
  /** Unique identifier for the hit */
  id: string;
  /** Document identifier */
  documentId: string;
  /** Document name/title */
  documentName: string;
  matchedText: string;
  context: string;
  startPosition: number;
  endPosition: number;
  lineNumber?: number;
  pageNumber?: number;
  section?: string;
  score: number;
  highlightedSnippet: string;
}

export interface IndexedDocument {
  id: string;
  name: string;
  format: FileFormat;
  metadata: DocumentMetadata;
  content: string;
  terms: Map<string, number[]>;
  termFrequencies: Map<string, number>;
  wordCount: number;
  indexedAt: Date;
  customFields?: Record<string, unknown>;
}

export interface IndexStatistics {
  totalDocuments: number;
  totalTerms: number;
  averageDocumentLength: number;
  estimatedSize: number;
  lastUpdated: Date;
  documentsByFormat: Record<string, number>;
}

const DEFAULT_SEARCH_OPTIONS: SearchOptions = {
  caseSensitive: false,
  wholeWord: false,
  useRegex: false,
  fuzzyMatch: false,
  fuzzyThreshold: 0.8,
  maxResults: 100,
  includeContext: true,
  contextLength: 50,
  highlightMatches: true,
  searchFields: ['content'],
  sortBy: 'relevance',
  sortOrder: 'descending',
};

export class SearchEngine {
  private documents: Map<string, IndexedDocument>;
  private invertedIndex: Map<string, Set<string>>;
  private registry: ExtractorRegistry;

  constructor() {
    this.documents = new Map();
    this.invertedIndex = new Map();
    this.registry = initializeExtractors();
  }

  async indexDocument(
    data: InputDataType,
    format: FileFormat,
    options: { id?: string; name?: string; customFields?: Record<string, unknown> } = {}
  ): Promise<IndexedDocument> {
    const buffer = await toBuffer(data);
    const documentId = options.id || generateId();

    // Extract content
    const extractor = this.registry.get(format);
    if (!extractor) {
      throw new Error(`No extractor available for format: ${format}`);
    }

    const result = await extractor.execute(buffer, {});
    const extractedData = result.data as Record<string, unknown>;
    const text = extractedData.text as { content?: string } | undefined;
    const content = text?.content || '';

    // Build term index
    const terms = new Map<string, number[]>();
    const termFrequencies = new Map<string, number>();
    const words = this.tokenize(content);

    for (let i = 0; i < words.length; i++) {
      const term = words[i]!.toLowerCase();
      if (term.length < 2) continue;

      const positions = terms.get(term) || [];
      positions.push(i);
      terms.set(term, positions);
      termFrequencies.set(term, (termFrequencies.get(term) || 0) + 1);

      // Add to inverted index
      const docSet = this.invertedIndex.get(term) || new Set();
      docSet.add(documentId);
      this.invertedIndex.set(term, docSet);
    }

    const indexedDoc: IndexedDocument = {
      id: documentId,
      name: options.name || result.metadata.title || 'Untitled',
      format,
      metadata: result.metadata,
      content,
      terms,
      termFrequencies,
      wordCount: words.length,
      indexedAt: new Date(),
      customFields: options.customFields,
    };

    this.documents.set(documentId, indexedDoc);
    return indexedDoc;
  }

  async indexDocuments(
    documents: Array<{
      data: InputDataType;
      format: FileFormat;
      options?: { id?: string; name?: string; customFields?: Record<string, unknown> };
    }>
  ): Promise<IndexedDocument[]> {
    const results: IndexedDocument[] = [];

    for (const doc of documents) {
      const indexed = await this.indexDocument(doc.data, doc.format, doc.options || {});
      results.push(indexed);
    }

    return results;
  }

  removeDocument(documentId: string): boolean {
    const doc = this.documents.get(documentId);
    if (!doc) return false;

    // Remove from inverted index
    for (const term of doc.terms.keys()) {
      const docSet = this.invertedIndex.get(term);
      if (docSet) {
        docSet.delete(documentId);
        if (docSet.size === 0) {
          this.invertedIndex.delete(term);
        }
      }
    }

    this.documents.delete(documentId);
    return true;
  }

  clearIndex(): void {
    this.documents.clear();
    this.invertedIndex.clear();
  }

  search(query: string, options: SearchOptions = {}): SearchResult {
    const opts = { ...DEFAULT_SEARCH_OPTIONS, ...options };
    const startTime = Date.now();
    const hits: SearchHit[] = [];

    if (!query.trim()) {
      return {
        query,
        totalHits: 0,
        hits: [],
        facets: {},
        searchDuration: 0,
        suggestions: [],
      };
    }

    // Parse query terms
    const queryTerms = this.parseQuery(query, opts);

    // Find matching documents
    const matchingDocIds = this.findMatchingDocuments(queryTerms, opts);

    // Score and rank documents
    for (const docId of matchingDocIds) {
      const doc = this.documents.get(docId);
      if (!doc) continue;

      const docHits = this.findHitsInDocument(doc, queryTerms, opts);
      hits.push(...docHits);
    }

    // Sort results
    this.sortHits(hits, opts);

    // Apply pagination
    const paginatedHits = hits.slice(0, opts.maxResults || 100);

    // Generate facets
    const facets = this.generateFacets(matchingDocIds);

    // Generate suggestions if no results
    const suggestions = hits.length === 0 ? this.generateSuggestions(query) : [];

    return {
      query,
      totalHits: hits.length,
      hits: paginatedHits,
      facets,
      searchDuration: Date.now() - startTime,
      suggestions,
    };
  }

  searchInDocument(documentId: string, query: string, options: SearchOptions = {}): SearchHit[] {
    const doc = this.documents.get(documentId);
    if (!doc) {
      throw new Error(`Document not found: ${documentId}`);
    }

    const opts = { ...DEFAULT_SEARCH_OPTIONS, ...options };
    const queryTerms = this.parseQuery(query, opts);
    return this.findHitsInDocument(doc, queryTerms, opts);
  }

  getDocument(documentId: string): IndexedDocument | undefined {
    return this.documents.get(documentId);
  }

  getDocumentIds(): string[] {
    return Array.from(this.documents.keys());
  }

  getStatistics(): IndexStatistics {
    const documentsByFormat: Record<string, number> = {};
    let totalWordCount = 0;

    for (const doc of this.documents.values()) {
      documentsByFormat[doc.format] = (documentsByFormat[doc.format] || 0) + 1;
      totalWordCount += doc.wordCount;
    }

    // Estimate size (rough calculation)
    let estimatedSize = 0;
    for (const doc of this.documents.values()) {
      estimatedSize += doc.content.length * 2; // UTF-16
      estimatedSize += doc.terms.size * 50; // Rough estimate for terms
    }

    return {
      totalDocuments: this.documents.size,
      totalTerms: this.invertedIndex.size,
      averageDocumentLength: this.documents.size > 0 ? totalWordCount / this.documents.size : 0,
      estimatedSize,
      lastUpdated: new Date(),
      documentsByFormat,
    };
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 0);
  }

  private parseQuery(
    query: string,
    opts: SearchOptions
  ): Array<{ term: string; required: boolean; excluded: boolean; phrase: boolean }> {
    const terms: Array<{ term: string; required: boolean; excluded: boolean; phrase: boolean }> =
      [];

    // Handle phrase queries (quoted strings)
    const phraseRegex = /"([^"]+)"/g;
    const phrases: string[] = [];
    let match;

    while ((match = phraseRegex.exec(query)) !== null) {
      phrases.push(match[1]!);
      terms.push({
        term: match[1]!.toLowerCase(),
        required: true,
        excluded: false,
        phrase: true,
      });
    }

    // Remove phrases from query
    const remainingQuery = query.replace(phraseRegex, '');

    // Parse individual terms
    const words = remainingQuery.split(/\s+/).filter(w => w.length > 0);

    for (const word of words) {
      let term = word;
      let required = false;
      let excluded = false;

      if (term.startsWith('+')) {
        required = true;
        term = term.slice(1);
      } else if (term.startsWith('-')) {
        excluded = true;
        term = term.slice(1);
      }

      if (term.length > 0) {
        terms.push({
          term: opts.caseSensitive ? term : term.toLowerCase(),
          required,
          excluded,
          phrase: false,
        });
      }
    }

    return terms;
  }

  private findMatchingDocuments(
    queryTerms: Array<{ term: string; required: boolean; excluded: boolean; phrase: boolean }>,
    opts: SearchOptions
  ): Set<string> {
    if (queryTerms.length === 0) {
      return new Set();
    }

    let matchingDocs: Set<string> | null = null;

    // Handle regular terms
    for (const qt of queryTerms) {
      if (qt.excluded) continue;

      const termDocs = new Set<string>();

      if (qt.phrase) {
        // Search for phrase in all documents
        for (const doc of this.documents.values()) {
          if (doc.content.toLowerCase().includes(qt.term)) {
            termDocs.add(doc.id);
          }
        }
      } else if (opts.fuzzyMatch) {
        // Fuzzy matching
        for (const [term, docSet] of this.invertedIndex) {
          if (this.fuzzyMatch(qt.term, term, opts.fuzzyThreshold || 0.8)) {
            for (const docId of docSet) {
              termDocs.add(docId);
            }
          }
        }
      } else if (opts.wholeWord) {
        // Exact term match
        const docSet = this.invertedIndex.get(qt.term);
        if (docSet) {
          for (const docId of docSet) {
            termDocs.add(docId);
          }
        }
      } else {
        // Partial match
        for (const [term, docSet] of this.invertedIndex) {
          if (term.includes(qt.term) || qt.term.includes(term)) {
            for (const docId of docSet) {
              termDocs.add(docId);
            }
          }
        }
      }

      if (qt.required) {
        if (matchingDocs === null) {
          matchingDocs = termDocs;
        } else {
          // Intersection for required terms
          matchingDocs = new Set([...matchingDocs].filter((d: string) => termDocs.has(d)));
        }
      } else {
        if (matchingDocs === null) {
          matchingDocs = termDocs;
        } else {
          // Union for optional terms
          for (const docId of termDocs) {
            matchingDocs.add(docId);
          }
        }
      }
    }

    // Remove excluded documents
    if (matchingDocs) {
      const excludedTerms = queryTerms.filter(qt => qt.excluded);
      for (const qt of excludedTerms) {
        const excludedDocs = this.invertedIndex.get(qt.term);
        if (excludedDocs) {
          for (const docId of excludedDocs) {
            matchingDocs.delete(docId);
          }
        }
      }
    }

    return matchingDocs || new Set();
  }

  private findHitsInDocument(
    doc: IndexedDocument,
    queryTerms: Array<{ term: string; required: boolean; excluded: boolean; phrase: boolean }>,
    opts: SearchOptions
  ): SearchHit[] {
    const hits: SearchHit[] = [];
    const content = opts.caseSensitive ? doc.content : doc.content.toLowerCase();

    for (const qt of queryTerms) {
      if (qt.excluded) continue;

      const term = opts.caseSensitive ? qt.term : qt.term.toLowerCase();
      let searchPattern: RegExp;

      if (opts.useRegex) {
        try {
          searchPattern = new RegExp(term, opts.caseSensitive ? 'g' : 'gi');
        } catch {
          searchPattern = new RegExp(this.escapeRegex(term), opts.caseSensitive ? 'g' : 'gi');
        }
      } else if (opts.wholeWord) {
        searchPattern = new RegExp(
          `\\b${this.escapeRegex(term)}\\b`,
          opts.caseSensitive ? 'g' : 'gi'
        );
      } else {
        searchPattern = new RegExp(this.escapeRegex(term), opts.caseSensitive ? 'g' : 'gi');
      }

      let match;
      while ((match = searchPattern.exec(content)) !== null) {
        const startPos = match.index;
        const endPos = startPos + match[0].length;

        // Calculate context
        const contextStart = Math.max(0, startPos - (opts.contextLength || 50));
        const contextEnd = Math.min(content.length, endPos + (opts.contextLength || 50));
        let context = doc.content.substring(contextStart, contextEnd);

        if (contextStart > 0) context = '...' + context;
        if (contextEnd < content.length) context = context + '...';

        // Calculate line number
        const lineNumber = doc.content.substring(0, startPos).split('\n').length;

        // Calculate score (TF-IDF inspired)
        const tf = (doc.termFrequencies.get(term) || 1) / doc.wordCount;
        const idf = Math.log(this.documents.size / (this.invertedIndex.get(term)?.size || 1));
        const score = tf * idf;

        // Create highlighted snippet
        let highlightedSnippet = context;
        if (opts.highlightMatches) {
          const originalMatch = doc.content.substring(startPos, endPos);
          highlightedSnippet = context.replace(
            new RegExp(this.escapeRegex(originalMatch), 'gi'),
            `<mark>${originalMatch}</mark>`
          );
        }

        hits.push({
          id: generateId(),
          documentId: doc.id,
          documentName: doc.name,
          matchedText: doc.content.substring(startPos, endPos),
          context,
          startPosition: startPos,
          endPosition: endPos,
          lineNumber,
          score,
          highlightedSnippet,
        });
      }
    }

    return hits;
  }

  private sortHits(hits: SearchHit[], opts: SearchOptions): void {
    const ascending = opts.sortOrder === 'ascending';
    const multiplier = ascending ? 1 : -1;

    hits.sort((a, b) => {
      switch (opts.sortBy) {
        case 'relevance':
          return (b.score - a.score) * multiplier;
        case 'position':
          return (a.startPosition - b.startPosition) * multiplier;
        case 'document':
          return a.documentName.localeCompare(b.documentName) * multiplier;
        default:
          return (b.score - a.score) * multiplier;
      }
    });
  }

  private generateFacets(
    matchingDocIds: Set<string>
  ): Record<string, Array<{ value: string; count: number }>> {
    const formatFacet: Map<string, number> = new Map();

    for (const docId of matchingDocIds) {
      const doc = this.documents.get(docId);
      if (doc) {
        formatFacet.set(doc.format, (formatFacet.get(doc.format) || 0) + 1);
      }
    }

    return {
      format: Array.from(formatFacet.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count),
    };
  }

  private generateSuggestions(query: string): string[] {
    const suggestions: string[] = [];
    const queryTerms = query.toLowerCase().split(/\s+/);

    for (const term of queryTerms) {
      // Find similar terms in index
      for (const indexedTerm of this.invertedIndex.keys()) {
        if (this.fuzzyMatch(term, indexedTerm, 0.6) && indexedTerm !== term) {
          suggestions.push(query.replace(new RegExp(term, 'gi'), indexedTerm));
        }
      }
    }

    return [...new Set(suggestions)].slice(0, 5);
  }

  private fuzzyMatch(str1: string, str2: string, threshold: number): boolean {
    const similarity = this.calculateSimilarity(str1, str2);
    return similarity >= threshold;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1;
    if (str1.length === 0 || str2.length === 0) return 0;

    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    const longerLength = longer.length;
    if (longerLength === 0) return 1;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longerLength - distance) / longerLength;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0]![j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2[i - 1] === str1[j - 1]) {
          matrix[i]![j] = matrix[i - 1]![j - 1]!;
        } else {
          matrix[i]![j] = Math.min(
            matrix[i - 1]![j - 1]! + 1,
            matrix[i]![j - 1]! + 1,
            matrix[i - 1]![j]! + 1
          );
        }
      }
    }

    return matrix[str2.length]![str1.length]!;
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

export class SearchBuilder {
  private engine: SearchEngine;
  private queryParts: string[] = [];
  private options: SearchOptions = {};

  constructor(engine: SearchEngine) {
    this.engine = engine;
  }

  term(value: string): this {
    this.queryParts.push(value);
    return this;
  }

  mustHave(value: string): this {
    this.queryParts.push(`+${value}`);
    return this;
  }

  mustNotHave(value: string): this {
    this.queryParts.push(`-${value}`);
    return this;
  }

  phrase(value: string): this {
    this.queryParts.push(`"${value}"`);
    return this;
  }

  caseSensitive(): this {
    this.options.caseSensitive = true;
    return this;
  }

  wholeWord(): this {
    this.options.wholeWord = true;
    return this;
  }

  regex(): this {
    this.options.useRegex = true;
    return this;
  }

  fuzzy(threshold: number = 0.8): this {
    this.options.fuzzyMatch = true;
    this.options.fuzzyThreshold = threshold;
    return this;
  }

  limit(max: number): this {
    this.options.maxResults = max;
    return this;
  }

  contextLength(length: number): this {
    this.options.contextLength = length;
    return this;
  }

  sortBy(field: SearchOptions['sortBy'], order: SearchOptions['sortOrder'] = 'descending'): this {
    this.options.sortBy = field;
    this.options.sortOrder = order;
    return this;
  }

  execute(): SearchResult {
    const query = this.queryParts.join(' ');
    return this.engine.search(query, this.options);
  }

  getQuery(): string {
    return this.queryParts.join(' ');
  }

  reset(): this {
    this.queryParts = [];
    this.options = {};
    return this;
  }
}

export { SearchEngine as default };
