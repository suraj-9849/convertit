/**
 * convertit - File conversion library for Node.js and Bun
 * Convert between PDF, Word, Excel, CSV, HTML, images and more.
 * Now with extraction, analysis, search, batch processing, and streaming capabilities.
 */

export { Convertit, ConvertitBuilder } from './core/converter.js';
export type {
  // Basic types
  FileFormat,
  InputDataType,
  OutputFormat,
  ConvertFileOptions,
  ConversionResult,
  BatchConversionResult,
  ProgressInfo,
  ConversionError,

  // Conversion options
  PDFOptions,
  WordOptions,
  ExcelOptions,
  CSVOptions,
  HTMLOptions,
  ImageOptions,
  PageSize,
  PageMargins,
  FontConfig,
  HeaderFooterConfig,
  PageNumberConfig,
  WatermarkConfig,
  EncryptionConfig,
  CompressionConfig,
  MergeConfig,
  SplitConfig,
  RotateConfig,
  OCRConfig,
  TableConfig,
  ImageConversionConfig,
  ConvertFileBuilder,
  ConverterPlugin,
  TransformerPlugin,
  CellStyle,
  RowStyleRule,
  CellStyleRule,
  ConditionalFormattingRule,
  ComparisonOperator,
  TemplateConfig,
  DeepPartial,
  RequiredFields,
  FileExtension,
  FileInfo,

  // Extraction types
  ExtractionResult,
  ExtractionOptions,
  DocumentMetadata,
  ExtractedText,
  ExtractedImage,
  ExtractedTable,
  ExtractedLink,
  ExtractedAnnotation,
  ExtractedFormField,
  ExtractedBookmark,
  PDFExtractionOptions,
  PDFExtractionResult,
  WordExtractionOptions,
  WordExtractionResult,
  ExcelExtractionOptions,
  ExcelExtractionResult,
  ImageExtractionOptions,
  ImageExtractionResult,
  CSVExtractionOptions,
  CSVExtractionResult,

  // Analysis types
  AnalysisOptions,
  AnalysisResult,
  ComparisonOptions,
  ComparisonResult,
  DocumentSummary,
  StructureAnalysis,
  ContentAnalysis,
  StyleAnalysis,
  SecurityAnalysis,
  AccessibilityAnalysis,
  QualityAnalysis,
  TextStatistics,
  KeywordInfo,
  ExtractedEntity,
  LanguageInfo,
  SentimentInfo,

  // Search types
  SearchOptions,
  SearchResult,

  // Batch types
  BatchJobConfig,
  BatchJobResult,
  BatchJobStatus,

  // Streaming types
  StreamProcessingOptions,

  // Plugin types
  ExtractorPlugin,
  AnalyzerPlugin,
  ProcessorPlugin,
} from './core/types.js';

export { MIME_TYPES, DEFAULT_PAGE_SIZES, DEFAULT_MARGINS, DEFAULT_FONT } from './core/types.js';

export {
  ConvertFileError,
  ValidationError,
  FormatError,
  FileError,
  ConversionFailedError,
  TimeoutError,
  ErrorCode,
  isConvertFileError,
  handleError,
} from './core/errors.js';

export {
  ConverterRegistry,
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
  initializeConverters,
} from './converters/index.js';

// Extractors
export {
  BaseExtractor,
  ExtractorRegistry,
  ExtractorUtils,
  PDFExtractor,
  WordExtractor,
  ExcelExtractor,
  ExcelExtractorUtils,
  ImageExtractor,
  ImageExtractorUtils,
  CSVExtractor,
  CSVExtractorUtils,
  initializeExtractors,
} from './extractors/index.js';

// Analysis
export { DocumentAnalyzer, DocumentComparator } from './analysis/index.js';

// Search
export {
  SearchEngine,
  SearchBuilder,
  type SearchHit,
  type IndexedDocument,
  type IndexStatistics,
} from './search/index.js';

// Batch Processing
export {
  BatchProcessor,
  BatchJobBuilder,
  type BatchJob,
  type BatchJobItem,
  type BatchJobProgress,
  type BatchProcessorConfig,
} from './batch/index.js';

// Streaming
export {
  StreamProcessor,
  DocumentTransformStream,
  StreamPipelineBuilder,
  StreamUtils,
  type StreamChunk,
  type StreamState,
  type StreamProgress,
} from './streaming/index.js';

export { TemplateEngine, DocumentTemplates } from './core/template-engine.js';

export {
  CompressionTransformer,
  MergeTransformer,
  SplitTransformer,
  WatermarkTransformer,
  RotationTransformer,
  EncryptionTransformer,
  PageNumberTransformer,
} from './transformers/index.js';

export {
  generateId,
  generateFilename,
  getFileExtension,
  getMimeType,
  detectFormatFromExtension,
  normalizeFormat,
  isDocumentFormat,
  isSpreadsheetFormat,
  isImageFormat,
  isDataFormat,
  toBuffer,
  toString,
  streamToBuffer,
  bufferToStream,
  getPageSize,
  mergeMargins,
  mergeFont,
  parseColor,
  rgbToHex,
  getFileSize,
  formatFileSize,
  deepMerge,
  isPlainObject,
  compact,
  escapeHtml,
  unescapeHtml,
  sanitizeFilename,
  chunk,
  flatten,
  delay,
  retry,
  withTimeout,
  isNode,
  isBun,
  isBrowser,
  timestamp,
  measureDuration,
} from './utils/helpers.js';

export {
  validateOptions,
  validateInput,
  isValidFormat,
  canConvert,
  assertValid,
  type ValidationResult,
} from './utils/validator.js';

import { Convertit } from './core/converter.js';
export default Convertit;
