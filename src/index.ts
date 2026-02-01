/**
 * convertit - File conversion library for Node.js and Bun
 * Convert between PDF, Word, Excel, CSV, HTML, images and more.
 */

export { Convertit, ConvertitBuilder } from './core/converter.js';
export type {
  FileFormat,
  InputDataType,
  OutputFormat,
  ConvertFileOptions,
  ConversionResult,
  BatchConversionResult,
  ProgressInfo,
  ConversionError,
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
  BaseConverter,
  ConverterRegistry,
  PDFConverter,
  PDFManipulator,
  WordConverter,
  ExcelConverter,
  ExcelUtils,
  ExcelStyleEngine,
  StylePresets,
  CSVConverter,
  CSVUtils,
  HTMLConverter,
  ImageConverter,
  ImageUtils,
  TextConverter,
  JSONConverter,
  XMLConverter,
  MarkdownConverter,
} from './converters/index.js';

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
