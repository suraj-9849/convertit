/**
 * convertit - Main Converter Class
 * Core API for file conversion, extraction, analysis, and batch operations.
 */

import type {
  InputDataType,
  ConvertFileOptions,
  ConversionResult,
  BatchConversionResult,
  FileFormat,
  ProgressInfo,
  PDFOptions,
  WordOptions,
  ExcelOptions,
  CSVOptions,
  HTMLOptions,
  ImageOptions,
  WatermarkConfig,
  EncryptionConfig,
  CompressionConfig,
  PageNumberConfig,
  HeaderFooterConfig,
  SplitConfig,
  TableConfig,
  ExtractionResult,
  AnalysisResult,
  AnalysisOptions,
  SearchOptions,
  SearchResult,
} from './types.js';
import { ConvertFileError, ErrorCode, handleError } from './errors.js';
import { BaseConverter, ConverterRegistry } from '../converters/base.js';
import {
  PDFConverter,
  WordConverter,
  ExcelConverter,
  CSVConverter,
  HTMLConverter,
  ImageConverter,
  TextConverter,
  JSONConverter,
  XMLConverter,
  MarkdownConverter,
} from '../converters/index.js';
import {
  CompressionTransformer,
  MergeTransformer,
  SplitTransformer,
  WatermarkTransformer,
  RotationTransformer,
} from '../transformers/index.js';
import { ExtractorRegistry, initializeExtractors } from '../extractors/index.js';
import { validateOptions, validateInput, assertValid } from '../utils/validator.js';
import {
  toBuffer,
  getMimeType,
  getFileSize,
  measureDuration,
  withTimeout,
  retry,
  normalizeFormat,
} from '../utils/helpers.js';
import { writeFile } from 'fs/promises';

export class Convertit {
  private data: InputDataType;
  private options: ConvertFileOptions;
  private static registry: ConverterRegistry = ConverterRegistry.getInstance();
  private static extractorRegistry: ExtractorRegistry = initializeExtractors();

  constructor(data: InputDataType, options: ConvertFileOptions) {
    this.data = data;
    this.options = options;
    this.initializeConverters();
  }

  private initializeConverters(): void {
    const registry = Convertit.registry;

    if (!registry.has('pdf')) {
      registry.register('pdf', new PDFConverter());
      registry.register('word', new WordConverter());
      registry.register('docx', new WordConverter());
      registry.register('excel', new ExcelConverter());
      registry.register('xlsx', new ExcelConverter());
      registry.register('csv', new CSVConverter());
      registry.register('html', new HTMLConverter());
      registry.register('txt', new TextConverter());
      registry.register('json', new JSONConverter());
      registry.register('xml', new XMLConverter());
      registry.register('md', new MarkdownConverter());
      registry.register('markdown', new MarkdownConverter());
      registry.register('png', new ImageConverter('png'));
      registry.register('jpg', new ImageConverter('jpg'));
      registry.register('jpeg', new ImageConverter('jpeg'));
      registry.register('webp', new ImageConverter('webp'));
      registry.register('gif', new ImageConverter('gif'));
      registry.register('bmp', new ImageConverter('bmp'));
      registry.register('tiff', new ImageConverter('tiff'));
    }
  }

  /**
   * Extract content from a document
   */
  static async extract(
    data: InputDataType,
    format: FileFormat,
    options: Record<string, unknown> = {}
  ): Promise<ExtractionResult> {
    const buffer = await toBuffer(data);
    const extractor = Convertit.extractorRegistry.get(format);

    if (!extractor) {
      throw new ConvertFileError(
        ErrorCode.UNSUPPORTED_FORMAT,
        `No extractor available for format: ${format}`
      );
    }

    return extractor.execute(buffer, options);
  }

  /**
   * Analyze a document
   */
  static async analyze(
    data: InputDataType,
    format: FileFormat,
    options: AnalysisOptions = {}
  ): Promise<AnalysisResult> {
    const { DocumentAnalyzer } = await import('../analysis/index.js');
    const analyzer = new DocumentAnalyzer();
    return analyzer.analyze(data, format, options);
  }

  /**
   * Search within documents
   */
  static async search(
    documents: Array<{ data: InputDataType; format: FileFormat; name?: string }>,
    query: string,
    options: Omit<SearchOptions, 'query'> = {}
  ): Promise<SearchResult> {
    const { SearchEngine } = await import('../search/index.js');
    const engine = new SearchEngine();

    // Index all documents
    for (const doc of documents) {
      await engine.indexDocument(doc.data, doc.format, { name: doc.name });
    }

    return engine.search(query, options);
  }

  /**
   * Create a search engine instance for multiple searches
   */
  static async createSearchEngine(): Promise<{
    index: (data: InputDataType, format: FileFormat, options?: { name?: string }) => Promise<void>;
    search: (query: string, options?: Omit<SearchOptions, 'query'>) => SearchResult;
    clear: () => void;
  }> {
    const { SearchEngine } = await import('../search/index.js');
    const engine = new SearchEngine();

    return {
      index: async (data, format, options) => {
        await engine.indexDocument(data, format, options);
      },
      search: (query, options) => engine.search(query, options),
      clear: () => engine.clearIndex(),
    };
  }

  /**
   * Process documents in batch
   */
  static async batchExtract(
    items: Array<{ data: InputDataType; format: FileFormat; options?: Record<string, unknown> }>,
    config: { concurrency?: number; continueOnError?: boolean } = {}
  ): Promise<{ results: ExtractionResult[]; errors: Error[] }> {
    const { BatchProcessor } = await import('../batch/index.js');
    const processor = new BatchProcessor({
      maxConcurrentItems: config.concurrency || 5,
    });

    const job = processor.createJob('Batch Extraction', 'extraction', {
      continueOnError: config.continueOnError ?? true,
    } as any);

    processor.addItems(
      job.id,
      items.map(item => ({
        data: item.data,
        inputFormat: item.format,
        options: item.options,
      }))
    );

    const result = await processor.startJob(job.id);

    return {
      results: (result.results || []) as unknown as ExtractionResult[],
      errors:
        result.errors?.map(
          e => new Error(typeof e.error === 'string' ? e.error : String(e.error))
        ) || [],
    };
  }

  /**
   * Create a stream processor for large files
   */
  static async createStreamProcessor(options: { chunkSize?: number } = {}): Promise<{
    process: (data: InputDataType, format: FileFormat) => Promise<void>;
    onData: (callback: (chunk: unknown) => void) => void;
    onEnd: (callback: () => void) => void;
    onError: (callback: (error: Error) => void) => void;
  }> {
    const { StreamProcessor } = await import('../streaming/index.js');
    const processor = new StreamProcessor(options);

    return {
      process: async (data, format) => {
        await processor.processStream(data, format);
      },
      onData: callback => processor.on('data', callback),
      onEnd: callback => processor.on('end', callback),
      onError: callback => processor.on('error', callback),
    };
  }

  async convert(): Promise<ConversionResult> {
    const startTime = Date.now();

    try {
      const inputValidation = validateInput(this.data);
      const optionsValidation = validateOptions(this.options);

      assertValid(inputValidation, 'Input validation failed');
      assertValid(optionsValidation, 'Options validation failed');

      let processedData = this.data;
      if (this.options.hooks?.beforeConvert) {
        processedData = await this.options.hooks.beforeConvert(this.data);
      }

      const format = normalizeFormat(this.options.type);
      const converter = Convertit.registry.get(format);

      if (!converter) {
        throw new ConvertFileError(
          ErrorCode.UNSUPPORTED_FORMAT,
          `No converter available for format: ${format}`
        );
      }

      const conversionFn = async () => {
        return converter.execute(processedData, this.options);
      };

      let result: ConversionResult;

      if (this.options.timeout) {
        result = await withTimeout(
          this.options.retries
            ? retry(conversionFn, { retries: this.options.retries })
            : conversionFn(),
          this.options.timeout
        );
      } else if (this.options.retries) {
        result = await retry(conversionFn, { retries: this.options.retries });
      } else {
        result = await conversionFn();
      }

      result = await this.applyTransformers(result);

      if (this.options.outputPath && result.data) {
        await writeFile(this.options.outputPath, result.data as Buffer);
        result.path = this.options.outputPath;
      }

      result = await this.formatOutput(result);
      result.duration = measureDuration(startTime);
      return result;
    } catch (error) {
      const convertError = handleError(error);
      this.options.hooks?.onError?.(convertError);
      throw convertError;
    }
  }

  private async applyTransformers(result: ConversionResult): Promise<ConversionResult> {
    if (!result.data || !Buffer.isBuffer(result.data)) {
      return result;
    }

    let buffer = result.data;

    if (this.options.compress) {
      buffer = await CompressionTransformer.compress(buffer, result.format, this.options.compress);
    }

    if (this.options.watermark) {
      buffer = await WatermarkTransformer.addWatermark(
        buffer,
        result.format,
        this.options.watermark
      );
    }

    if (this.options.rotate) {
      buffer = await RotationTransformer.rotate(buffer, result.format, this.options.rotate);
    }

    result.data = buffer;
    result.size = getFileSize(buffer);
    return result;
  }

  private async formatOutput(result: ConversionResult): Promise<ConversionResult> {
    if (!result.data || !Buffer.isBuffer(result.data)) {
      return result;
    }

    switch (this.options.output) {
      case 'base64':
        result.data = (result.data as Buffer).toString('base64');
        break;

      case 'stream':
        result.data = new ReadableStream({
          start(controller) {
            controller.enqueue(result.data);
            controller.close();
          },
        });
        break;

      case 'blob':
        if (typeof Blob !== 'undefined') {
          const buffer = result.data as Buffer;
          const arrayBuffer = buffer.buffer.slice(
            buffer.byteOffset,
            buffer.byteOffset + buffer.byteLength
          ) as ArrayBuffer;
          result.data = new Blob([new Uint8Array(arrayBuffer)], { type: result.mimeType }) as any;
        }
        break;

      case 'buffer':
      case 'file':
      default:
        break;
    }

    return result;
  }

  async toBuffer(): Promise<Buffer> {
    const result = await this.convert();
    if (!result.data) {
      throw new ConvertFileError(ErrorCode.CONVERSION_FAILED, 'No data in conversion result');
    }

    if (Buffer.isBuffer(result.data)) {
      return result.data;
    }

    if (typeof result.data === 'string') {
      return Buffer.from(result.data, 'base64');
    }

    return toBuffer(result.data);
  }

  async toBase64(): Promise<string> {
    const buffer = await this.toBuffer();
    return buffer.toString('base64');
  }

  async toDataUrl(): Promise<string> {
    const buffer = await this.toBuffer();
    const format = normalizeFormat(this.options.type);
    const mimeType = getMimeType(format);
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  }

  async toFile(path: string): Promise<string> {
    const buffer = await this.toBuffer();
    await writeFile(path, buffer);
    return path;
  }

  static from(data: InputDataType): ConvertitBuilder {
    return new ConvertitBuilder(data);
  }

  static async batch(
    items: Array<{ data: InputDataType; options: ConvertFileOptions }>,
    concurrency: number = 3
  ): Promise<BatchConversionResult> {
    const startTime = Date.now();
    const results: ConversionResult[] = [];
    const errors: ConvertFileError[] = [];

    for (let i = 0; i < items.length; i += concurrency) {
      const chunk = items.slice(i, i + concurrency);
      const chunkResults = await Promise.allSettled(
        chunk.map(item => new Convertit(item.data, item.options).convert())
      );

      for (const result of chunkResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          const error = handleError(result.reason);
          errors.push(error);
          results.push({
            success: false,
            data: null,
            format: 'txt' as FileFormat,
            size: 0,
            mimeType: 'text/plain',
            duration: 0,
          });
        }
      }
    }

    return {
      success: errors.length === 0,
      results,
      totalFiles: items.length,
      successCount: results.filter(r => r.success).length,
      failedCount: errors.length,
      totalDuration: measureDuration(startTime),
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  static async merge(files: Array<string | Buffer>, format: FileFormat): Promise<Buffer> {
    const buffers = await Promise.all(
      files.map(async file => {
        if (typeof file === 'string') {
          return Buffer.from(file, 'base64');
        }
        return file;
      })
    );

    return MergeTransformer.merge(buffers, format);
  }

  static async split(data: Buffer, format: FileFormat, config: SplitConfig): Promise<Buffer[]> {
    return SplitTransformer.split(data, format, config);
  }

  static getSupportedFormats(): FileFormat[] {
    return Convertit.registry.getFormats();
  }

  static registerConverter(format: FileFormat, converter: BaseConverter): void {
    Convertit.registry.register(format, converter);
  }
}

export class ConvertitBuilder {
  private data: InputDataType;
  private options: Partial<ConvertFileOptions> = {};

  constructor(data: InputDataType) {
    this.data = data;
  }

  toPdf(options?: PDFOptions): this {
    this.options.type = 'pdf';
    this.options.pdf = options;
    return this;
  }

  toWord(options?: WordOptions): this {
    this.options.type = 'word';
    this.options.word = options;
    return this;
  }

  toExcel(options?: ExcelOptions): this {
    this.options.type = 'excel';
    this.options.excel = options;
    return this;
  }

  toCsv(options?: CSVOptions): this {
    this.options.type = 'csv';
    this.options.csv = options;
    return this;
  }

  toHtml(options?: HTMLOptions): this {
    this.options.type = 'html';
    this.options.html = options;
    return this;
  }

  toImage(format: 'png' | 'jpg' | 'jpeg' | 'webp' | 'gif' = 'png', options?: ImageOptions): this {
    this.options.type = format;
    this.options.image = { ...options, format };
    return this;
  }

  toJson(): this {
    this.options.type = 'json';
    return this;
  }

  toText(): this {
    this.options.type = 'txt';
    return this;
  }

  toMarkdown(): this {
    this.options.type = 'md';
    return this;
  }

  toXml(): this {
    this.options.type = 'xml';
    return this;
  }

  withWatermark(config: WatermarkConfig): this {
    this.options.watermark = config;
    return this;
  }

  withEncryption(config: EncryptionConfig): this {
    this.options.encrypt = config;
    return this;
  }

  withCompression(config: CompressionConfig): this {
    this.options.compress = config;
    return this;
  }

  withPageNumbers(config: PageNumberConfig): this {
    if (this.options.pdf) {
      this.options.pdf.pageNumbers = config;
    } else {
      this.options.pdf = { pageNumbers: config };
    }
    return this;
  }

  withHeader(config: HeaderFooterConfig): this {
    if (this.options.pdf) {
      this.options.pdf.header = config;
    } else if (this.options.word) {
      this.options.word.header = config;
    } else {
      this.options.pdf = { header: config };
    }
    return this;
  }

  withFooter(config: HeaderFooterConfig): this {
    if (this.options.pdf) {
      this.options.pdf.footer = config;
    } else if (this.options.word) {
      this.options.word.footer = config;
    } else {
      this.options.pdf = { footer: config };
    }
    return this;
  }

  landscape(): this {
    if (this.options.pdf) {
      this.options.pdf.orientation = 'landscape';
    } else if (this.options.word) {
      this.options.word.orientation = 'landscape';
    } else {
      this.options.pdf = { orientation: 'landscape' };
    }
    return this;
  }

  pageSize(size: 'A4' | 'A3' | 'A5' | 'Letter' | 'Legal'): this {
    if (this.options.pdf) {
      this.options.pdf.pageSize = size;
    } else if (this.options.word) {
      this.options.word.pageSize = size;
    } else {
      this.options.pdf = { pageSize: size };
    }
    return this;
  }

  withTable(config: TableConfig): this {
    this.options.tables = this.options.tables || [];
    this.options.tables.push(config);
    return this;
  }

  onProgress(callback: (progress: ProgressInfo) => void): this {
    this.options.hooks = this.options.hooks || {};
    this.options.hooks.onProgress = callback;
    return this;
  }

  onError(callback: (error: Error) => void): this {
    this.options.hooks = this.options.hooks || {};
    this.options.hooks.onError = callback;
    return this;
  }

  timeout(ms: number): this {
    this.options.timeout = ms;
    return this;
  }

  retries(count: number): this {
    this.options.retries = count;
    return this;
  }

  async toBuffer(): Promise<Buffer> {
    this.ensureType();
    const api = new Convertit(this.data, this.options as ConvertFileOptions);
    return api.toBuffer();
  }

  async toBase64(): Promise<string> {
    this.ensureType();
    const api = new Convertit(this.data, this.options as ConvertFileOptions);
    return api.toBase64();
  }

  async toDataUrl(): Promise<string> {
    this.ensureType();
    const api = new Convertit(this.data, this.options as ConvertFileOptions);
    return api.toDataUrl();
  }

  async toFile(path: string): Promise<string> {
    this.ensureType();
    const api = new Convertit(this.data, this.options as ConvertFileOptions);
    return api.toFile(path);
  }

  async execute(): Promise<ConversionResult> {
    this.ensureType();
    const api = new Convertit(this.data, this.options as ConvertFileOptions);
    return api.convert();
  }

  private ensureType(): void {
    if (!this.options.type) {
      throw new ConvertFileError(
        ErrorCode.INVALID_OPTIONS,
        'Output format not specified. Use toPdf(), toWord(), etc. before executing.'
      );
    }
  }
}

export default Convertit;
