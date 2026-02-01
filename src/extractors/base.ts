/**
 * Base Extractor Class and Registry
 * Foundation for all document extraction operations
 */

import type {
  FileFormat,
  InputDataType,
  ExtractionResult,
  DocumentMetadata,
  ExtractorPlugin,
  ExtractorConfig,
} from '../core/types.js';
import { ConvertFileError, ErrorCode } from '../core/errors.js';
import { generateId, measureDuration, toBuffer } from '../utils/helpers.js';

/**
 * Default extractor configuration
 */
const DEFAULT_EXTRACTOR_CONFIG: ExtractorConfig = {
  maxFileSize: 100 * 1024 * 1024, // 100MB
  timeout: 60000, // 60 seconds
  cache: false,
  verbose: false,
};

/**
 * Base class for all extractors
 */
export abstract class BaseExtractor {
  protected format: FileFormat;
  protected config: ExtractorConfig;

  constructor(format: FileFormat, config?: Partial<ExtractorConfig>) {
    this.format = format;
    this.config = { ...DEFAULT_EXTRACTOR_CONFIG, ...config };
  }

  /**
   * Get the format this extractor handles
   */
  getFormat(): FileFormat {
    return this.format;
  }

  /**
   * Get supported input formats for extraction
   */
  abstract getSupportedFormats(): FileFormat[];

  /**
   * Perform the extraction operation
   */
  abstract extract<T>(
    data: InputDataType,
    options: Record<string, unknown>
  ): Promise<ExtractionResult<T>>;

  /**
   * Execute extraction with common pre/post processing
   */
  async execute<T>(
    data: InputDataType,
    options: Record<string, unknown>
  ): Promise<ExtractionResult<T>> {
    const startTime = Date.now();

    try {
      // Validate input
      const buffer = await this.validateAndPrepare(data);

      // Check file size
      if (this.config.maxFileSize && buffer.length > this.config.maxFileSize) {
        throw new ConvertFileError(
          ErrorCode.FILE_TOO_LARGE,
          `File size ${buffer.length} exceeds maximum allowed ${this.config.maxFileSize}`
        );
      }

      // Perform extraction
      const result = await this.extract<T>(buffer, options);

      // Add timing information
      result.duration = measureDuration(startTime);

      return result;
    } catch (error) {
      if (error instanceof ConvertFileError) {
        throw error;
      }
      throw new ConvertFileError(
        ErrorCode.EXTRACTION_FAILED,
        `Extraction failed: ${(error as Error).message}`,
        { cause: error as Error }
      );
    }
  }

  /**
   * Validate input and convert to buffer
   */
  protected async validateAndPrepare(data: InputDataType): Promise<Buffer> {
    if (!data) {
      throw new ConvertFileError(ErrorCode.INVALID_INPUT, 'Input data is required');
    }

    return toBuffer(data);
  }

  /**
   * Create base metadata structure
   */
  protected createBaseMetadata(partial?: Partial<DocumentMetadata>): DocumentMetadata {
    return {
      creationDate: new Date(),
      ...partial,
    };
  }

  /**
   * Create base extraction result
   */
  protected createResult<T>(
    data: T,
    metadata: DocumentMetadata,
    options?: {
      warnings?: string[];
      errors?: string[];
      sourceFile?: string;
    }
  ): ExtractionResult<T> {
    return {
      success: true,
      data,
      format: this.format,
      metadata,
      duration: 0, // Will be set by execute()
      sourceFile: options?.sourceFile,
      warnings: options?.warnings,
      errors: options?.errors,
    };
  }

  /**
   * Generate unique ID for extracted elements
   */
  protected generateId(_prefix?: string): string {
    return generateId();
  }
}

/**
 * Extractor Registry - Singleton pattern for managing extractors
 */
export class ExtractorRegistry {
  private static instance: ExtractorRegistry;
  private extractors: Map<FileFormat, BaseExtractor> = new Map();
  private plugins: ExtractorPlugin[] = [];

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): ExtractorRegistry {
    if (!ExtractorRegistry.instance) {
      ExtractorRegistry.instance = new ExtractorRegistry();
    }
    return ExtractorRegistry.instance;
  }

  /**
   * Register an extractor for a format
   */
  register(format: FileFormat, extractor: BaseExtractor): void {
    this.extractors.set(format, extractor);
  }

  /**
   * Register a plugin extractor
   */
  registerPlugin(plugin: ExtractorPlugin): void {
    this.plugins.push(plugin);
    // Register for all supported formats
    for (const format of plugin.supportedFormats) {
      if (!this.extractors.has(format)) {
        this.extractors.set(format, new PluginExtractorWrapper(plugin, format));
      }
    }
  }

  /**
   * Get extractor for a format
   */
  get(format: FileFormat): BaseExtractor | undefined {
    return this.extractors.get(format);
  }

  /**
   * Check if extractor exists for format
   */
  has(format: FileFormat): boolean {
    return this.extractors.has(format);
  }

  /**
   * Get all registered formats
   */
  getRegisteredFormats(): FileFormat[] {
    return Array.from(this.extractors.keys());
  }

  /**
   * Get all registered plugins
   */
  getPlugins(): ExtractorPlugin[] {
    return [...this.plugins];
  }

  /**
   * Clear all extractors (useful for testing)
   */
  clear(): void {
    this.extractors.clear();
    this.plugins = [];
  }
}

/**
 * Wrapper class to adapt plugin to BaseExtractor interface
 */
class PluginExtractorWrapper extends BaseExtractor {
  private plugin: ExtractorPlugin;

  constructor(plugin: ExtractorPlugin, format: FileFormat) {
    super(format);
    this.plugin = plugin;
  }

  getSupportedFormats(): FileFormat[] {
    return this.plugin.supportedFormats;
  }

  async extract<T>(
    data: InputDataType,
    options: Record<string, unknown>
  ): Promise<ExtractionResult<T>> {
    return this.plugin.extract(data, options) as Promise<ExtractionResult<T>>;
  }
}

/**
 * Utility functions for extractors
 */
export class ExtractorUtils {
  /**
   * Detect file format from buffer magic bytes
   */
  static detectFormat(buffer: Buffer): FileFormat | null {
    // PDF: %PDF
    if (buffer.slice(0, 4).toString() === '%PDF') {
      return 'pdf';
    }

    // ZIP-based formats (docx, xlsx, etc.)
    if (buffer[0] === 0x50 && buffer[1] === 0x4b) {
      // Check for specific Office formats
      const content = buffer.toString('utf-8', 0, Math.min(buffer.length, 2000));
      if (content.includes('word/')) return 'docx';
      if (content.includes('xl/')) return 'xlsx';
      return null;
    }

    // PNG
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
      return 'png';
    }

    // JPEG
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return 'jpg';
    }

    // GIF
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
      return 'gif';
    }

    // WebP
    if (
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    ) {
      return 'webp';
    }

    // BMP
    if (buffer[0] === 0x42 && buffer[1] === 0x4d) {
      return 'bmp';
    }

    // TIFF (little endian)
    if (buffer[0] === 0x49 && buffer[1] === 0x49 && buffer[2] === 0x2a && buffer[3] === 0x00) {
      return 'tiff';
    }

    // TIFF (big endian)
    if (buffer[0] === 0x4d && buffer[1] === 0x4d && buffer[2] === 0x00 && buffer[3] === 0x2a) {
      return 'tiff';
    }

    // Try to detect text-based formats
    const textContent = buffer.toString('utf-8', 0, Math.min(buffer.length, 500));

    // JSON
    if (textContent.trim().startsWith('{') || textContent.trim().startsWith('[')) {
      try {
        JSON.parse(buffer.toString('utf-8'));
        return 'json';
      } catch {
        // Not valid JSON
      }
    }

    // XML
    if (textContent.trim().startsWith('<?xml') || textContent.trim().startsWith('<')) {
      return 'xml';
    }

    // HTML
    if (
      textContent.toLowerCase().includes('<!doctype html') ||
      textContent.toLowerCase().includes('<html')
    ) {
      return 'html';
    }

    // Markdown (basic detection)
    if (textContent.includes('# ') || textContent.includes('## ') || textContent.includes('```')) {
      return 'markdown';
    }

    // CSV (basic detection - contains commas and newlines in a pattern)
    const lines = textContent.split('\n');
    if (lines.length > 1) {
      const commaCount = (lines[0] || '').split(',').length;
      if (
        commaCount > 1 &&
        lines.slice(1).every(l => l.split(',').length === commaCount || l.trim() === '')
      ) {
        return 'csv';
      }
    }

    // Default to txt for plain text
    if (this.isValidText(textContent)) {
      return 'txt';
    }

    return null;
  }

  /**
   * Check if string is valid UTF-8 text
   */
  static isValidText(text: string): boolean {
    const invalidChars = text.match(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g);
    return !invalidChars || invalidChars.length < text.length * 0.1;
  }

  /**
   * Calculate text statistics
   */
  static calculateTextStatistics(text: string): {
    characters: number;
    words: number;
    sentences: number;
    paragraphs: number;
    lines: number;
  } {
    const characters = text.length;
    const words = text.split(/\s+/).filter(w => w.length > 0).length;
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
    const lines = text.split('\n').length;

    return { characters, words, sentences, paragraphs, lines };
  }

  /**
   * Calculate reading time in minutes
   */
  static calculateReadingTime(wordCount: number, wordsPerMinute: number = 200): number {
    return Math.ceil(wordCount / wordsPerMinute);
  }

  /**
   * Calculate speaking time in minutes
   */
  static calculateSpeakingTime(wordCount: number, wordsPerMinute: number = 150): number {
    return Math.ceil(wordCount / wordsPerMinute);
  }

  /**
   * Calculate Flesch-Kincaid Grade Level
   */
  static calculateFleschKincaidGrade(words: number, sentences: number, syllables: number): number {
    if (sentences === 0 || words === 0) return 0;
    return 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59;
  }

  /**
   * Calculate Flesch Reading Ease Score
   */
  static calculateFleschReadingEase(words: number, sentences: number, syllables: number): number {
    if (sentences === 0 || words === 0) return 0;
    return 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
  }

  /**
   * Estimate syllable count in English text
   */
  static countSyllables(word: string): number {
    word = word.toLowerCase().trim();
    if (word.length <= 3) return 1;

    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');

    const syllables = word.match(/[aeiouy]{1,2}/g);
    return syllables ? syllables.length : 1;
  }

  /**
   * Extract keywords from text using TF-IDF-like scoring
   */
  static extractKeywords(
    text: string,
    options: { maxKeywords?: number; minWordLength?: number; stopWords?: string[] } = {}
  ): Array<{ keyword: string; frequency: number; score: number }> {
    const { maxKeywords = 20, minWordLength = 3, stopWords = DEFAULT_STOP_WORDS } = options;

    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length >= minWordLength && !stopWords.includes(w));

    const frequency: Map<string, number> = new Map();
    for (const word of words) {
      frequency.set(word, (frequency.get(word) || 0) + 1);
    }

    const totalWords = words.length;
    const results = Array.from(frequency.entries())
      .map(([keyword, freq]) => ({
        keyword,
        frequency: freq,
        score: (freq / totalWords) * Math.log(totalWords / freq + 1),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, maxKeywords);

    return results;
  }
}

/**
 * Default English stop words
 */
const DEFAULT_STOP_WORDS = [
  'a',
  'an',
  'the',
  'and',
  'or',
  'but',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'with',
  'by',
  'from',
  'as',
  'is',
  'was',
  'are',
  'were',
  'been',
  'be',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'could',
  'should',
  'may',
  'might',
  'must',
  'shall',
  'can',
  'need',
  'dare',
  'ought',
  'used',
  'this',
  'that',
  'these',
  'those',
  'i',
  'you',
  'he',
  'she',
  'it',
  'we',
  'they',
  'what',
  'which',
  'who',
  'whom',
  'whose',
  'where',
  'when',
  'why',
  'how',
  'all',
  'each',
  'every',
  'both',
  'few',
  'more',
  'most',
  'other',
  'some',
  'such',
  'no',
  'nor',
  'not',
  'only',
  'own',
  'same',
  'so',
  'than',
  'too',
  'very',
  'just',
  'also',
  'now',
  'here',
  'there',
];

export { DEFAULT_STOP_WORDS };
