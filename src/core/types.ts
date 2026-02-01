/**
 * Type definitions for file conversion operations.
 */

export type FileFormat =
  | 'pdf'
  | 'word'
  | 'docx'
  | 'excel'
  | 'xlsx'
  | 'csv'
  | 'html'
  | 'txt'
  | 'json'
  | 'xml'
  | 'markdown'
  | 'md'
  | 'png'
  | 'jpg'
  | 'jpeg'
  | 'webp'
  | 'svg'
  | 'gif'
  | 'bmp'
  | 'tiff';

export type InputDataType =
  | string
  | Buffer
  | ArrayBuffer
  | Uint8Array
  | ReadableStream
  | object
  | object[];

export type OutputFormat = 'buffer' | 'base64' | 'stream' | 'file' | 'blob';

export interface PageSize {
  width: number;
  height: number;
}

export interface PageMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface FontConfig {
  family: string;
  size: number;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

export interface HeaderFooterConfig {
  enabled: boolean;
  content?: string;
  font?: Partial<FontConfig>;
  alignment?: 'left' | 'center' | 'right';
  includePageNumber?: boolean;
  pageNumberFormat?: string;
}

export interface WatermarkConfig {
  text?: string;
  image?: string | Buffer;
  opacity?: number;
  rotation?: number;
  position?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'tile';
  font?: Partial<FontConfig>;
  scale?: number;
}

export interface EncryptionConfig {
  password: string;
  ownerPassword?: string;
  permissions?: {
    printing?: boolean;
    modifying?: boolean;
    copying?: boolean;
    annotating?: boolean;
    fillingForms?: boolean;
    contentAccessibility?: boolean;
    documentAssembly?: boolean;
  };
  encryptionMethod?: '40bit' | '128bit' | '256bit';
}

export interface CompressionConfig {
  level?: 'low' | 'medium' | 'high' | 'maximum';
  quality?: number;
  removeMetadata?: boolean;
  optimizeImages?: boolean;
  imageQuality?: number;
  grayscale?: boolean;
}

export interface MergeConfig {
  files: Array<string | Buffer>;
  outputFormat?: FileFormat;
  addPageBreaks?: boolean;
  addTableOfContents?: boolean;
  bookmarks?: boolean;
}

export interface SplitConfig {
  mode: 'pages' | 'ranges' | 'size' | 'bookmarks';
  pages?: number[];
  ranges?: Array<{ start: number; end: number }>;
  maxSize?: number;
  outputPrefix?: string;
}

export interface RotateConfig {
  angle: 90 | 180 | 270;
  pages?: number[] | 'all' | 'odd' | 'even';
}

export interface PageNumberConfig {
  enabled: boolean;
  format?: string;
  position?:
    | 'top-left'
    | 'top-center'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-center'
    | 'bottom-right';
  startFrom?: number;
  font?: Partial<FontConfig>;
  skipPages?: number[];
}

export interface ImageConversionConfig {
  format?: 'png' | 'jpg' | 'webp' | 'gif' | 'bmp' | 'tiff';
  quality?: number;
  dpi?: number;
  width?: number;
  height?: number;
  fit?: 'contain' | 'cover' | 'fill' | 'inside' | 'outside';
  background?: string;
  pages?: number[] | 'all';
}

export interface OCRConfig {
  enabled: boolean;
  language?: string | string[];
  enhanceScans?: boolean;
  outputFormat?: 'text' | 'searchable-pdf' | 'hocr';
}

export interface TableConfig {
  headers?: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[][];
  style?: {
    headerBackground?: string;
    headerColor?: string;
    alternateRowColors?: boolean;
    borderColor?: string;
    borderWidth?: number;
  };
  columnWidths?: number[];
  autoFit?: boolean;
}

export interface PDFOptions {
  pageSize?: 'A4' | 'A3' | 'A5' | 'Letter' | 'Legal' | 'Tabloid' | PageSize;
  orientation?: 'portrait' | 'landscape';
  margins?: Partial<PageMargins>;
  font?: Partial<FontConfig>;
  header?: HeaderFooterConfig;
  footer?: HeaderFooterConfig;
  watermark?: WatermarkConfig;
  encryption?: EncryptionConfig;
  compression?: CompressionConfig;
  pageNumbers?: PageNumberConfig;
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string[];
    creator?: string;
    producer?: string;
    creationDate?: Date;
    modificationDate?: Date;
  };
  accessibilityTags?: boolean;
  embedFonts?: boolean;
}

export interface WordOptions {
  pageSize?: 'A4' | 'A3' | 'A5' | 'Letter' | 'Legal' | PageSize;
  orientation?: 'portrait' | 'landscape';
  margins?: Partial<PageMargins>;
  font?: Partial<FontConfig>;
  header?: HeaderFooterConfig;
  footer?: HeaderFooterConfig;
  watermark?: WatermarkConfig;
  styles?: {
    title?: Partial<FontConfig>;
    heading1?: Partial<FontConfig>;
    heading2?: Partial<FontConfig>;
    heading3?: Partial<FontConfig>;
    paragraph?: Partial<FontConfig>;
  };
  tableOfContents?: boolean;
  pageNumbers?: PageNumberConfig;
  metadata?: {
    title?: string;
    author?: string;
    description?: string;
    subject?: string;
    keywords?: string[];
    category?: string;
    company?: string;
  };
}

export interface ExcelOptions {
  sheetName?: string;
  sheets?: Array<{
    name: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any[][];
    headers?: string[];
  }>;
  headers?: string[];
  columnWidths?: number[];
  autoFilter?: boolean;
  freezePane?: {
    row?: number;
    column?: number;
  };
  style?: {
    headerStyle?: {
      font?: Partial<FontConfig>;
      fill?: string;
      alignment?: 'left' | 'center' | 'right';
    };
    dataStyle?: {
      font?: Partial<FontConfig>;
      alternateRowFill?: string;
    };
  };
  /**
   * Conditional formatting rules for dynamic row/cell styling
   * Allows styling based on cell values, row position, or custom logic
   */
  conditionalFormatting?: ConditionalFormattingRule[];
  /**
   * Row styling rules - apply styles based on row conditions
   */
  rowStyles?: RowStyleRule[];
  /**
   * Cell styling rules - apply styles to specific cells
   */
  cellStyles?: CellStyleRule[];
  formulas?: Array<{
    cell: string;
    formula: string;
  }>;
  protection?: {
    password?: string;
    lockCells?: boolean;
    lockFormulas?: boolean;
  };
  metadata?: {
    title?: string;
    author?: string;
    company?: string;
    description?: string;
  };
}

export interface ConditionalFormattingRule {
  type: 'cellValue' | 'expression' | 'colorScale' | 'dataBar' | 'iconSet';
  priority?: number;
  range?: string;
  condition?: {
    operator?:
      | 'equal'
      | 'notEqual'
      | 'greaterThan'
      | 'lessThan'
      | 'greaterThanOrEqual'
      | 'lessThanOrEqual'
      | 'between'
      | 'notBetween'
      | 'containsText'
      | 'notContainsText'
      | 'beginsWith'
      | 'endsWith';
    value?: string | number;
    value2?: string | number;
    formula?: string;
  };
  style: CellStyle;
}
export interface RowStyleRule {
  condition:
    | { type: 'even' }
    | { type: 'odd' }
    | { type: 'every'; n: number; offset?: number }
    | { type: 'range'; start: number; end: number }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    | { type: 'custom'; predicate: (rowData: any[], rowIndex: number) => boolean }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    | { type: 'columnValue'; column: string | number; operator: ComparisonOperator; value: any };
  style: CellStyle;
}

export interface CellStyleRule {
  target: string;
  condition?: {
    operator: ComparisonOperator;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any;
  };
  style: CellStyle;
}

export interface CellStyle {
  font?: {
    name?: string;
    size?: number;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strike?: boolean;
    color?: string;
  };
  fill?: {
    type?: 'solid' | 'pattern' | 'gradient';
    color?: string;
    fgColor?: string;
    bgColor?: string;
    pattern?: 'solid' | 'darkGray' | 'mediumGray' | 'lightGray' | 'gray125' | 'gray0625';
    gradient?: {
      type: 'linear' | 'path';
      degree?: number;
      stops: Array<{ position: number; color: string }>;
    };
  };
  border?: {
    top?: BorderStyle;
    bottom?: BorderStyle;
    left?: BorderStyle;
    right?: BorderStyle;
    diagonal?: BorderStyle;
  };
  alignment?: {
    horizontal?:
      | 'left'
      | 'center'
      | 'right'
      | 'fill'
      | 'justify'
      | 'centerContinuous'
      | 'distributed';
    vertical?: 'top' | 'middle' | 'bottom' | 'distributed' | 'justify';
    wrapText?: boolean;
    shrinkToFit?: boolean;
    indent?: number;
    textRotation?: number;
  };
  numFmt?: string;
}

export interface BorderStyle {
  style?:
    | 'thin'
    | 'medium'
    | 'thick'
    | 'dotted'
    | 'dashed'
    | 'double'
    | 'hair'
    | 'mediumDashed'
    | 'dashDot'
    | 'mediumDashDot'
    | 'dashDotDot'
    | 'slantDashDot'
    | 'mediumDashDotDot';
  color?: string;
}

export type ComparisonOperator =
  | 'equal'
  | 'notEqual'
  | 'greaterThan'
  | 'lessThan'
  | 'greaterThanOrEqual'
  | 'lessThanOrEqual'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'isEmpty'
  | 'isNotEmpty';

export interface CSVOptions {
  delimiter?: ',' | ';' | '\t' | '|' | string;
  quote?: string;
  escape?: string;
  headers?: boolean | string[];
  encoding?: BufferEncoding;
  newline?: '\n' | '\r\n';
  skipEmptyLines?: boolean;
  trimFields?: boolean;
}

export interface HTMLOptions {
  template?: string;
  css?: string;
  inlineStyles?: boolean;
  includeDoctype?: boolean;
  encoding?: BufferEncoding;
  title?: string;
  meta?: Record<string, string>;
  scripts?: string[];
  stylesheets?: string[];
  minify?: boolean;
  responsive?: boolean;
}

export interface ImageOptions {
  format?: 'png' | 'jpg' | 'jpeg' | 'webp' | 'gif' | 'bmp' | 'tiff' | 'svg';
  quality?: number;
  width?: number;
  height?: number;
  dpi?: number;
  fit?: 'contain' | 'cover' | 'fill' | 'inside' | 'outside';
  background?: string;
  transparent?: boolean;
  compression?: 'none' | 'lzw' | 'jpeg' | 'deflate';
  progressive?: boolean;
  grayscale?: boolean;
  rotate?: number;
  flip?: 'horizontal' | 'vertical' | 'both';
  blur?: number;
  sharpen?: boolean;
  brightness?: number;
  contrast?: number;
  saturation?: number;
}

export interface ConvertFileOptions {
  type: FileFormat;
  output?: OutputFormat;
  outputPath?: string;
  pdf?: PDFOptions;
  word?: WordOptions;
  excel?: ExcelOptions;
  csv?: CSVOptions;
  html?: HTMLOptions;
  image?: ImageOptions;
  merge?: MergeConfig;
  split?: SplitConfig;
  compress?: CompressionConfig;
  watermark?: WatermarkConfig;
  encrypt?: EncryptionConfig;
  rotate?: RotateConfig;
  ocr?: OCRConfig;
  tables?: TableConfig[];
  customStyles?: Record<string, any>;
  hooks?: {
    beforeConvert?: (data: InputDataType) => InputDataType | Promise<InputDataType>;
    afterConvert?: (result: ConversionResult) => ConversionResult | Promise<ConversionResult>;
    onProgress?: (progress: ProgressInfo) => void;
    onError?: (error: Error) => void;
  };
  timeout?: number;
  retries?: number;
  cache?: boolean;
  tempDir?: string;
  verbose?: boolean;
}

export interface ConversionResult {
  success: boolean;
  data: Buffer | string | ReadableStream | null;
  format: FileFormat;
  size: number;
  filename?: string;
  path?: string;
  mimeType: string;
  metadata?: Record<string, any>;
  pages?: number;
  duration: number;
  warnings?: string[];
}

export interface BatchConversionResult {
  success: boolean;
  results: ConversionResult[];
  totalFiles: number;
  successCount: number;
  failedCount: number;
  totalDuration: number;
  errors?: ConversionError[];
}

export interface ProgressInfo {
  stage: 'preparing' | 'converting' | 'processing' | 'finalizing';
  progress: number;
  currentFile?: string;
  totalFiles?: number;
  currentFileIndex?: number;
  message?: string;
}

export interface ConversionError {
  code: string;
  message: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details?: any;
  file?: string;
  recoverable: boolean;
}

export interface ConvertFileBuilder {
  toPdf(options?: PDFOptions): ConvertFileBuilder;
  toWord(options?: WordOptions): ConvertFileBuilder;
  toExcel(options?: ExcelOptions): ConvertFileBuilder;
  toCsv(options?: CSVOptions): ConvertFileBuilder;
  toHtml(options?: HTMLOptions): ConvertFileBuilder;
  toImage(options?: ImageOptions): ConvertFileBuilder;
  withWatermark(config: WatermarkConfig): ConvertFileBuilder;
  withEncryption(config: EncryptionConfig): ConvertFileBuilder;
  withCompression(config: CompressionConfig): ConvertFileBuilder;
  withPageNumbers(config: PageNumberConfig): ConvertFileBuilder;
  withHeader(config: HeaderFooterConfig): ConvertFileBuilder;
  withFooter(config: HeaderFooterConfig): ConvertFileBuilder;
  merge(files: Array<string | Buffer>): ConvertFileBuilder;
  split(config: SplitConfig): ConvertFileBuilder;
  rotate(config: RotateConfig): ConvertFileBuilder;
  addTable(config: TableConfig): ConvertFileBuilder;
  onProgress(callback: (progress: ProgressInfo) => void): ConvertFileBuilder;
  toBuffer(): Promise<Buffer>;
  toBase64(): Promise<string>;
  toFile(path: string): Promise<string>;
  toStream(): Promise<ReadableStream>;
  execute(): Promise<ConversionResult>;
}

export interface ConverterPlugin {
  name: string;
  version: string;
  supportedFormats: FileFormat[];
  convert(data: InputDataType, options: ConvertFileOptions): Promise<ConversionResult>;
  validate?(data: InputDataType, options: ConvertFileOptions): boolean;
}

export interface TransformerPlugin {
  name: string;
  version: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transform(result: ConversionResult, options: any): Promise<ConversionResult>;
}

/**
 * Template configuration for document generation
 */
export interface TemplateConfig {
  /** Template string or file path */
  source: string;
  /** Template engine to use */
  engine?: 'handlebars' | 'mustache' | 'ejs' | 'simple';
  /** Data to inject into template */
  data: Record<string, any>;
  /** Partials/components */
  partials?: Record<string, string>;
  /** Helper functions */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  helpers?: Record<string, (...args: any[]) => any>;
  /** Custom delimiters */
  delimiters?: [string, string];
}

/**
 * Streaming configuration for large files
 */
export interface StreamConfig {
  /** Enable streaming mode */
  enabled: boolean;
  /** Chunk size in bytes */
  chunkSize?: number;
  /** High water mark for backpressure */
  highWaterMark?: number;
  /** Callback for each chunk */
  onChunk?: (chunk: Buffer, index: number) => void;
  /** Enable compression during streaming */
  compress?: boolean;
}

/**
 * Report generation configuration
 */
export interface ReportConfig {
  /** Report title */
  title: string;
  /** Report subtitle */
  subtitle?: string;
  /** Company/organization logo */
  logo?: string | Buffer;
  /** Report sections */
  sections: ReportSection[];
  /** Header configuration */
  header?: {
    content?: string;
    logo?: string | Buffer;
    showDate?: boolean;
    showPageNumber?: boolean;
  };
  /** Footer configuration */
  footer?: {
    content?: string;
    showPageNumber?: boolean;
    showTotalPages?: boolean;
  };
  /** Table of contents */
  tableOfContents?: boolean;
  /** Theme configuration */
  theme?: ReportTheme;
}

/**
 * Report section configuration
 */
export interface ReportSection {
  /** Section type */
  type: 'heading' | 'paragraph' | 'table' | 'chart' | 'image' | 'list' | 'pageBreak' | 'spacer';
  /** Section content */
  content?: string | any[] | Record<string, any>;
  /** Section level (for headings) */
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Section style overrides */
  style?: Partial<CellStyle>;
  /** Chart configuration (for chart type) */
  chart?: ChartConfig;
  /** Image configuration (for image type) */
  image?: {
    src: string | Buffer;
    width?: number;
    height?: number;
    alignment?: 'left' | 'center' | 'right';
    caption?: string;
  };
  /** List configuration */
  list?: {
    type: 'bullet' | 'number' | 'check';
    items: string[];
  };
}

/**
 * Chart configuration for reports
 */
export interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'doughnut' | 'area' | 'scatter';
  data: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      backgroundColor?: string | string[];
      borderColor?: string | string[];
    }>;
  };
  options?: {
    title?: string;
    width?: number;
    height?: number;
    legend?: boolean;
    responsive?: boolean;
  };
}

/**
 * Report theme configuration
 */
export interface ReportTheme {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  fontFamily?: string;
  fontSize?: number;
  headingFont?: string;
  spacing?: 'compact' | 'normal' | 'relaxed';
}

/**
 * Invoice/Receipt generation configuration
 */
export interface InvoiceConfig {
  /** Invoice number */
  invoiceNumber: string;
  /** Invoice date */
  date: Date | string;
  /** Due date */
  dueDate?: Date | string;
  /** Currency */
  currency?: string;
  /** Company details */
  company: {
    name: string;
    address?: string[];
    phone?: string;
    email?: string;
    website?: string;
    logo?: string | Buffer;
    taxId?: string;
  };
  /** Customer details */
  customer: {
    name: string;
    address?: string[];
    phone?: string;
    email?: string;
  };
  /** Line items */
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    tax?: number;
    total?: number;
  }>;
  /** Subtotal */
  subtotal?: number;
  /** Tax details */
  tax?: {
    rate: number;
    amount: number;
    label?: string;
  };
  /** Discount */
  discount?: {
    type: 'percentage' | 'fixed';
    value: number;
    amount?: number;
  };
  /** Total amount */
  total: number;
  /** Payment terms */
  paymentTerms?: string;
  /** Notes */
  notes?: string;
  /** Bank details */
  bankDetails?: {
    bankName?: string;
    accountName?: string;
    accountNumber?: string;
    routingNumber?: string;
    iban?: string;
    swift?: string;
  };
  /** Theme */
  theme?: ReportTheme;
}

/**
 * Data validation rule
 */
export interface DataValidationRule {
  /** Column or field name */
  field: string;
  /** Validation type */
  type: 'required' | 'email' | 'url' | 'number' | 'date' | 'regex' | 'custom' | 'list';
  /** List of allowed values (for list type) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  allowedValues?: any[];
  /** Regex pattern (for regex type) */
  pattern?: string | RegExp;
  /** Custom validation function */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  validator?: (value: any) => boolean;
  /** Min value (for number/date) */
  min?: number | Date;
  /** Max value (for number/date) */
  max?: number | Date;
  /** Error message */
  errorMessage?: string;
  /** Show dropdown (for list type in Excel) */
  showDropdown?: boolean;
}

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type FileExtension = `.${FileFormat}`;

export interface FileInfo {
  name: string;
  extension: FileExtension;
  size: number;
  mimeType: string;
  path?: string;
  createdAt?: Date;
  modifiedAt?: Date;
}

export const MIME_TYPES: Record<FileFormat, string> = {
  pdf: 'application/pdf',
  word: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
  html: 'text/html',
  txt: 'text/plain',
  json: 'application/json',
  xml: 'application/xml',
  markdown: 'text/markdown',
  md: 'text/markdown',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  gif: 'image/gif',
  bmp: 'image/bmp',
  tiff: 'image/tiff',
};

export const DEFAULT_PAGE_SIZES: Record<string, PageSize> = {
  A4: { width: 595.28, height: 841.89 },
  A3: { width: 841.89, height: 1190.55 },
  A5: { width: 419.53, height: 595.28 },
  Letter: { width: 612, height: 792 },
  Legal: { width: 612, height: 1008 },
  Tabloid: { width: 792, height: 1224 },
};

export const DEFAULT_MARGINS: PageMargins = {
  top: 72,
  right: 72,
  bottom: 72,
  left: 72,
};

export const DEFAULT_FONT: FontConfig = {
  family: 'Gilroy',
  size: 12,
  color: '#000000',
  bold: false,
  italic: false,
  underline: false,
};

// ============================================================================
// EXTRACTION TYPES - Extract content from documents
// ============================================================================

/**
 * Base extraction result interface
 */
export interface ExtractionResult<T = unknown> {
  success: boolean;
  data: T;
  format: FileFormat;
  sourceFile?: string;
  metadata: DocumentMetadata;
  duration: number;
  warnings?: string[];
  errors?: string[];
}

/**
 * Document metadata extracted from files
 */
export interface DocumentMetadata {
  title?: string;
  author?: string;
  creator?: string;
  producer?: string;
  subject?: string;
  keywords?: string[];
  creationDate?: Date;
  modificationDate?: Date;
  pageCount?: number;
  wordCount?: number;
  characterCount?: number;
  language?: string;
  encrypted?: boolean;
  fileSize?: number;
  version?: string;
  customProperties?: Record<string, unknown>;
}

/**
 * Extracted text content with positioning
 */
export interface ExtractedText {
  content: string;
  pages?: PageText[];
  paragraphs?: TextBlock[];
  lines?: TextLine[];
  words?: TextWord[];
  statistics: TextStatistics;
}

export interface PageText {
  pageNumber: number;
  content: string;
  paragraphs: TextBlock[];
  lines: TextLine[];
  boundingBox?: BoundingBox;
}

export interface TextBlock {
  id: string;
  content: string;
  type: 'paragraph' | 'heading' | 'list' | 'code' | 'quote' | 'footnote';
  level?: number;
  style?: TextStyle;
  boundingBox?: BoundingBox;
  pageNumber?: number;
}

export interface TextLine {
  content: string;
  lineNumber: number;
  boundingBox?: BoundingBox;
  confidence?: number;
}

export interface TextWord {
  content: string;
  boundingBox?: BoundingBox;
  confidence?: number;
  fontName?: string;
  fontSize?: number;
}

export interface TextStyle {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline' | 'strikethrough';
  color?: string;
  backgroundColor?: string;
  alignment?: 'left' | 'center' | 'right' | 'justify';
  lineHeight?: number;
  letterSpacing?: number;
}

export interface TextStatistics {
  totalCharacters: number;
  totalWords: number;
  totalSentences: number;
  totalParagraphs: number;
  totalPages: number;
  averageWordsPerSentence: number;
  averageCharactersPerWord: number;
  readingTimeMinutes: number;
  speakingTimeMinutes: number;
  readabilityScores?: ReadabilityScores;
}

export interface ReadabilityScores {
  fleschKincaidGrade?: number;
  fleschReadingEase?: number;
  gunningFog?: number;
  colemanLiau?: number;
  automatedReadabilityIndex?: number;
  smogIndex?: number;
}

/**
 * Bounding box for positioned elements
 */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber?: number;
}

/**
 * Extracted image from document
 */
export interface ExtractedImage {
  id: string;
  data: Buffer;
  format: 'png' | 'jpg' | 'jpeg' | 'gif' | 'bmp' | 'tiff' | 'webp' | 'svg';
  width: number;
  height: number;
  dpi?: number;
  colorSpace?: 'rgb' | 'cmyk' | 'grayscale';
  bitDepth?: number;
  pageNumber?: number;
  boundingBox?: BoundingBox;
  altText?: string;
  caption?: string;
  metadata?: ImageMetadata;
}

export interface ImageMetadata {
  exif?: ExifData;
  iptc?: IptcData;
  xmp?: Record<string, unknown>;
  icc?: IccProfile;
}

export interface ExifData {
  make?: string;
  model?: string;
  dateTime?: Date;
  exposureTime?: string;
  fNumber?: number;
  iso?: number;
  focalLength?: number;
  gpsLatitude?: number;
  gpsLongitude?: number;
  orientation?: number;
  software?: string;
  [key: string]: unknown;
}

export interface IptcData {
  title?: string;
  description?: string;
  keywords?: string[];
  copyright?: string;
  creator?: string;
  city?: string;
  country?: string;
  [key: string]: unknown;
}

export interface IccProfile {
  description?: string;
  colorSpace?: string;
  profileClass?: string;
}

/**
 * Extracted table from document
 */
export interface ExtractedTable {
  id: string;
  headers?: string[];
  rows: TableRow[];
  columnCount: number;
  rowCount: number;
  pageNumber?: number;
  boundingBox?: BoundingBox;
  style?: TableStyle;
  name?: string;
  summary?: string;
}

export interface TableRow {
  cells: TableCell[];
  isHeader?: boolean;
  rowIndex: number;
}

export interface TableCell {
  content: string;
  value?: unknown;
  rowSpan?: number;
  colSpan?: number;
  columnIndex: number;
  style?: CellStyle;
  formula?: string;
  dataType?: 'string' | 'number' | 'date' | 'boolean' | 'formula' | 'error' | 'empty';
}

export interface TableStyle {
  borderCollapse?: 'collapse' | 'separate';
  borderColor?: string;
  headerBackground?: string;
  alternateRowColors?: boolean;
}

/**
 * Extracted hyperlink
 */
export interface ExtractedLink {
  id: string;
  text: string;
  url: string;
  type: 'external' | 'internal' | 'email' | 'phone' | 'anchor';
  pageNumber?: number;
  boundingBox?: BoundingBox;
  isValid?: boolean;
}

/**
 * Extracted annotation/comment
 */
export interface ExtractedAnnotation {
  id: string;
  type:
    | 'highlight'
    | 'underline'
    | 'strikeout'
    | 'note'
    | 'comment'
    | 'freeText'
    | 'stamp'
    | 'drawing';
  content?: string;
  author?: string;
  createdAt?: Date;
  modifiedAt?: Date;
  color?: string;
  pageNumber?: number;
  boundingBox?: BoundingBox;
  replies?: ExtractedAnnotation[];
  status?: 'open' | 'resolved' | 'accepted' | 'rejected';
}

/**
 * Extracted form field
 */
export interface ExtractedFormField {
  id: string;
  name: string;
  type: 'text' | 'checkbox' | 'radio' | 'select' | 'button' | 'signature' | 'date' | 'number';
  value?: unknown;
  options?: string[];
  required?: boolean;
  readOnly?: boolean;
  maxLength?: number;
  pageNumber?: number;
  boundingBox?: BoundingBox;
  validation?: FormFieldValidation;
}

export interface FormFieldValidation {
  type?: 'none' | 'email' | 'phone' | 'url' | 'number' | 'date' | 'regex';
  pattern?: string;
  min?: number | Date;
  max?: number | Date;
  errorMessage?: string;
}

/**
 * Extracted bookmark/outline
 */
export interface ExtractedBookmark {
  id: string;
  title: string;
  pageNumber?: number;
  destination?: string;
  level: number;
  children?: ExtractedBookmark[];
  color?: string;
  isOpen?: boolean;
}

/**
 * Extracted attachment/embedded file
 */
export interface ExtractedAttachment {
  id: string;
  filename: string;
  data: Buffer;
  mimeType: string;
  size: number;
  description?: string;
  createdAt?: Date;
  modifiedAt?: Date;
  checksum?: string;
}

/**
 * General extraction options (base interface)
 */
export interface ExtractionOptions {
  extractText?: boolean;
  extractImages?: boolean;
  extractTables?: boolean;
  extractMetadata?: boolean;
  preserveFormatting?: boolean;
  [key: string]: unknown;
}

/**
 * PDF-specific extraction options
 */
export interface PDFExtractionOptions {
  extractText?: boolean;
  extractImages?: boolean;
  extractTables?: boolean;
  extractLinks?: boolean;
  extractAnnotations?: boolean;
  extractForms?: boolean;
  extractBookmarks?: boolean;
  extractAttachments?: boolean;
  extractMetadata?: boolean;
  pages?: number[] | 'all';
  preserveLayout?: boolean;
  ocrIfNeeded?: boolean;
  ocrLanguage?: string | string[];
  password?: string;
  imageFormat?: 'png' | 'jpg' | 'webp';
  imageQuality?: number;
  minImageSize?: number;
}

/**
 * PDF extraction result
 */
export interface PDFExtractionResult extends ExtractionResult {
  data: {
    text?: ExtractedText;
    images?: ExtractedImage[];
    tables?: ExtractedTable[];
    links?: ExtractedLink[];
    annotations?: ExtractedAnnotation[];
    formFields?: ExtractedFormField[];
    bookmarks?: ExtractedBookmark[];
    attachments?: ExtractedAttachment[];
  };
}

/**
 * Word-specific extraction options
 */
export interface WordExtractionOptions {
  extractText?: boolean;
  extractImages?: boolean;
  extractTables?: boolean;
  extractStyles?: boolean;
  extractComments?: boolean;
  extractHeaders?: boolean;
  extractFooters?: boolean;
  extractFootnotes?: boolean;
  extractEndnotes?: boolean;
  extractBookmarks?: boolean;
  extractMetadata?: boolean;
  preserveFormatting?: boolean;
  includeTrackedChanges?: boolean;
}

/**
 * Word extraction result
 */
export interface WordExtractionResult extends ExtractionResult {
  data: {
    text?: ExtractedText;
    images?: ExtractedImage[];
    tables?: ExtractedTable[];
    styles?: ExtractedStyle[];
    comments?: ExtractedComment[];
    headers?: ExtractedHeaderFooter[];
    footers?: ExtractedHeaderFooter[];
    footnotes?: ExtractedNote[];
    endnotes?: ExtractedNote[];
    bookmarks?: ExtractedBookmark[];
    sections?: DocumentSection[];
  };
}

export interface ExtractedStyle {
  id: string;
  name: string;
  type: 'paragraph' | 'character' | 'table' | 'list';
  basedOn?: string;
  font?: Partial<FontConfig>;
  paragraph?: {
    alignment?: 'left' | 'center' | 'right' | 'justify';
    spacing?: { before?: number; after?: number; line?: number };
    indent?: { left?: number; right?: number; firstLine?: number };
  };
}

export interface ExtractedComment {
  id: string;
  author: string;
  content: string;
  createdAt?: Date;
  referencedText?: string;
  replies?: ExtractedComment[];
  resolved?: boolean;
}

export interface ExtractedHeaderFooter {
  type: 'header' | 'footer';
  section: 'first' | 'odd' | 'even' | 'default';
  content: string;
  images?: ExtractedImage[];
}

export interface ExtractedNote {
  id: string;
  type: 'footnote' | 'endnote';
  referenceNumber: number;
  content: string;
}

export interface DocumentSection {
  id: string;
  startPage: number;
  endPage: number;
  orientation: 'portrait' | 'landscape';
  pageSize: PageSize;
  margins: PageMargins;
  columns: number;
}

/**
 * Excel-specific extraction options
 */
export interface ExcelExtractionOptions {
  extractData?: boolean;
  extractFormulas?: boolean;
  extractStyles?: boolean;
  extractCharts?: boolean;
  extractImages?: boolean;
  extractComments?: boolean;
  extractNames?: boolean;
  extractValidation?: boolean;
  extractConditionalFormatting?: boolean;
  extractMetadata?: boolean;
  sheets?: string[] | number[] | 'all';
  includeHiddenSheets?: boolean;
  includeHiddenRows?: boolean;
  includeHiddenColumns?: boolean;
  evaluateFormulas?: boolean;
  dateFormat?: string;
  numberFormat?: string;
  password?: string;
}

/**
 * Excel extraction result
 */
export interface ExcelExtractionResult extends ExtractionResult {
  data: {
    sheets: ExtractedSheet[];
    charts?: ExtractedChart[];
    images?: ExtractedImage[];
    names?: ExtractedName[];
    styles?: ExtractedCellStyle[];
  };
}

export interface ExtractedSheet {
  id: string;
  name: string;
  index: number;
  isHidden: boolean;
  data: ExtractedTable;
  mergedCells?: MergedCell[];
  comments?: ExtractedCellComment[];
  conditionalFormats?: ExtractedConditionalFormat[];
  dataValidations?: ExtractedDataValidation[];
  freezePane?: { row: number; column: number };
  autoFilter?: { range: string };
}

export interface MergedCell {
  startRow: number;
  startColumn: number;
  endRow: number;
  endColumn: number;
}

export interface ExtractedCellComment {
  cell: string;
  author?: string;
  content: string;
  isResolved?: boolean;
}

export interface ExtractedConditionalFormat {
  range: string;
  type: string;
  priority: number;
  formula?: string;
  style?: CellStyle;
}

export interface ExtractedDataValidation {
  range: string;
  type: 'list' | 'whole' | 'decimal' | 'date' | 'time' | 'textLength' | 'custom';
  operator?: string;
  formula1?: string;
  formula2?: string;
  allowedValues?: unknown[];
  showDropdown?: boolean;
  showErrorMessage?: boolean;
  errorMessage?: string;
}

export interface ExtractedChart {
  id: string;
  name: string;
  type: string;
  title?: string;
  sheet: string;
  position: BoundingBox;
  data: {
    categories?: string[];
    series: ChartSeries[];
  };
}

export interface ChartSeries {
  name: string;
  values: number[];
  color?: string;
}

export interface ExtractedName {
  name: string;
  value: string;
  scope: string | 'workbook';
  comment?: string;
}

export interface ExtractedCellStyle {
  id: string;
  name?: string;
  font?: Partial<FontConfig>;
  fill?: { type: string; color?: string };
  border?: Record<string, BorderStyle>;
  alignment?: Record<string, unknown>;
  numFmt?: string;
}

/**
 * CSV-specific extraction options
 */
export interface CSVExtractionOptions {
  delimiter?: string;
  quote?: string;
  escape?: string;
  hasHeaders?: boolean;
  encoding?: BufferEncoding;
  skipEmptyLines?: boolean;
  trimFields?: boolean;
  maxRows?: number;
  columns?: string[] | number[];
  transformValues?: boolean;
}

/**
 * CSV extraction result
 */
export interface CSVExtractionResult extends ExtractionResult {
  data: {
    headers?: string[];
    rows: unknown[][];
    records: Record<string, unknown>[];
    statistics: CSVStatistics;
  };
}

export interface CSVStatistics {
  rowCount: number;
  columnCount: number;
  emptyRowCount: number;
  duplicateRowCount: number;
  columnTypes: Record<string, 'string' | 'number' | 'date' | 'boolean' | 'mixed'>;
  nullCounts: Record<string, number>;
  uniqueCounts: Record<string, number>;
}

/**
 * Image-specific extraction options
 */
export interface ImageExtractionOptions {
  extractMetadata?: boolean;
  extractExif?: boolean;
  extractIptc?: boolean;
  extractXmp?: boolean;
  extractColors?: boolean;
  extractText?: boolean;
  ocrLanguage?: string | string[];
  colorCount?: number;
  analyzeFaces?: boolean;
  analyzeObjects?: boolean;
}

/**
 * Image extraction result
 */
export interface ImageExtractionResult extends ExtractionResult {
  data: {
    dimensions: { width: number; height: number };
    format: string;
    colorSpace: string;
    bitDepth: number;
    hasAlpha: boolean;
    isAnimated: boolean;
    frameCount?: number;
    metadata?: ImageMetadata;
    dominantColors?: DominantColor[];
    text?: ExtractedText;
    faces?: DetectedFace[];
    objects?: DetectedObject[];
  };
}

export interface DominantColor {
  color: string;
  hex: string;
  rgb: { r: number; g: number; b: number };
  percentage: number;
  name?: string;
}

export interface DetectedFace {
  boundingBox: BoundingBox;
  confidence: number;
  landmarks?: FaceLandmark[];
  attributes?: FaceAttributes;
}

export interface FaceLandmark {
  type: string;
  x: number;
  y: number;
}

export interface FaceAttributes {
  age?: number;
  gender?: string;
  emotion?: Record<string, number>;
}

export interface DetectedObject {
  name: string;
  confidence: number;
  boundingBox: BoundingBox;
  category?: string;
}

// ============================================================================
// ANALYSIS TYPES - Document analysis and comparison
// ============================================================================

/**
 * Document analysis options
 */
export interface AnalysisOptions {
  analyzeStructure?: boolean;
  analyzeContent?: boolean;
  analyzeStyle?: boolean;
  analyzeSecurity?: boolean;
  analyzeAccessibility?: boolean;
  analyzeQuality?: boolean;
  generateSummary?: boolean;
  extractKeywords?: boolean;
  extractEntities?: boolean;
  detectLanguage?: boolean;
  detectSentiment?: boolean;
}

/**
 * Document analysis result
 */
export interface AnalysisResult {
  documentInfo: DocumentMetadata;
  structure?: StructureAnalysis;
  content?: ContentAnalysis;
  style?: StyleAnalysis;
  security?: SecurityAnalysis;
  accessibility?: AccessibilityAnalysis;
  quality?: QualityAnalysis;
  summary?: DocumentSummary;
}

export interface StructureAnalysis {
  sections: number;
  chapters: number;
  headings: HeadingInfo[];
  tableOfContents?: ExtractedBookmark[];
  pageBreaks: number;
  columns: number;
}

export interface HeadingInfo {
  level: number;
  text: string;
  pageNumber?: number;
  count?: number;
}

export interface ContentAnalysis {
  textStatistics: TextStatistics;
  keywords: KeywordInfo[];
  entities?: ExtractedEntity[];
  topics?: TopicInfo[];
  language?: LanguageInfo;
  sentiment?: SentimentInfo;
}

export interface KeywordInfo {
  keyword: string;
  frequency: number;
  relevance?: number;
  score?: number;
  positions?: number[];
}

export interface ExtractedEntity {
  text: string;
  type:
    | 'person'
    | 'organization'
    | 'location'
    | 'date'
    | 'money'
    | 'email'
    | 'phone'
    | 'url'
    | 'custom';
  confidence: number;
  positions?: number[];
  metadata?: Record<string, unknown>;
}

export interface TopicInfo {
  topic: string;
  confidence: number;
  keywords: string[];
}

export interface LanguageInfo {
  detected: string;
  confidence: number;
  alternatives?: Array<{ language: string; confidence: number }>;
}

export interface SentimentInfo {
  overall: 'positive' | 'negative' | 'neutral' | 'mixed';
  score: number;
  magnitude: number;
  breakdown?: Record<string, SentimentScore>;
}

export interface SentimentScore {
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number;
}

export interface StyleAnalysis {
  fonts: FontUsage[];
  colors: ColorUsage[];
  paragraphStyles: ParagraphStyleUsage[];
  consistency: ConsistencyReport;
}

export interface FontUsage {
  fontFamily: string;
  usageCount: number;
  sizes: number[];
  styles: string[];
}

export interface ColorUsage {
  color: string;
  hex: string;
  usageCount: number;
  usedFor: ('text' | 'background' | 'border' | 'highlight')[];
}

export interface ParagraphStyleUsage {
  name: string;
  usageCount: number;
}

export interface ConsistencyReport {
  isConsistent: boolean;
  issues: ConsistencyIssue[];
  score: number;
}

export interface ConsistencyIssue {
  type: 'font' | 'size' | 'spacing' | 'alignment' | 'color';
  description: string;
  locations: number[];
  severity: 'low' | 'medium' | 'high';
}

export interface SecurityAnalysis {
  isEncrypted: boolean;
  encryptionType?: string;
  hasPassword: boolean;
  permissions?: DocumentPermissions;
  signatures?: DigitalSignature[];
  macros?: MacroInfo[];
  externalLinks?: ExtractedLink[];
  risks: SecurityRisk[];
}

export interface DocumentPermissions {
  canPrint: boolean;
  canModify: boolean;
  canCopy: boolean;
  canAnnotate: boolean;
  canFillForms: boolean;
  canExtract: boolean;
  canAssemble: boolean;
}

export interface DigitalSignature {
  signer: string;
  signedAt: Date;
  isValid: boolean;
  certificateInfo?: CertificateInfo;
}

export interface CertificateInfo {
  issuer: string;
  subject: string;
  validFrom: Date;
  validTo: Date;
  serialNumber: string;
}

export interface MacroInfo {
  name: string;
  type: string;
  isSafe: boolean;
  code?: string;
}

export interface SecurityRisk {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendation: string;
}

export interface AccessibilityAnalysis {
  score: number;
  isAccessible: boolean;
  issues: AccessibilityIssue[];
  hasAltText: boolean;
  hasTableHeaders: boolean;
  hasDocumentTitle: boolean;
  hasLanguage: boolean;
  headingStructure: 'correct' | 'incorrect' | 'missing';
  readingOrder: 'correct' | 'incorrect' | 'unknown';
}

export interface AccessibilityIssue {
  type: string;
  wcagCriteria?: string;
  severity: 'minor' | 'moderate' | 'serious' | 'critical';
  description: string;
  element?: string;
  pageNumber?: number;
  recommendation: string;
}

export interface QualityAnalysis {
  overallScore: number;
  imageQuality: ImageQualityReport;
  textQuality: TextQualityReport;
  formattingQuality: FormattingQualityReport;
  recommendations: QualityRecommendation[];
}

export interface ImageQualityReport {
  totalImages: number;
  lowResolutionCount: number;
  optimalResolutionCount: number;
  averageDpi: number;
  totalSize: number;
  recommendations: string[];
}

export interface TextQualityReport {
  spellingErrors: number;
  grammarIssues: number;
  readabilityScore: number;
  inconsistencies: string[];
}

export interface FormattingQualityReport {
  orphanLines: number;
  widowLines: number;
  overflowingText: number;
  inconsistentSpacing: number;
}

export interface QualityRecommendation {
  area: 'images' | 'text' | 'formatting' | 'structure';
  issue: string;
  recommendation: string;
  priority: 'low' | 'medium' | 'high';
}

export interface DocumentSummary {
  title: string;
  abstract: string;
  keyPoints: string[];
  wordCount: number;
  estimatedReadTime: number;
}

/**
 * Document comparison options
 */
export interface ComparisonOptions {
  compareText?: boolean;
  compareFormatting?: boolean;
  compareImages?: boolean;
  compareTables?: boolean;
  compareMetadata?: boolean;
  ignoreWhitespace?: boolean;
  ignoreCase?: boolean;
  ignoreFormatting?: boolean;
  granularity?: 'character' | 'word' | 'sentence' | 'paragraph' | 'page';
  outputFormat?: 'detailed' | 'summary' | 'visual';
}

/**
 * Document comparison result
 */
export interface ComparisonResult {
  areIdentical: boolean;
  similarityScore: number;
  differences: DocumentDifference[];
  additions: DocumentChange[];
  deletions: DocumentChange[];
  modifications: DocumentChange[];
  summary: ComparisonSummary;
}

export interface DocumentDifference {
  type: 'addition' | 'deletion' | 'modification' | 'move' | 'format';
  location: {
    document: 'source' | 'target';
    pageNumber?: number;
    position?: number;
    path?: string;
  };
  content: {
    original?: string;
    modified?: string;
  };
  metadata?: Record<string, unknown>;
}

export interface DocumentChange {
  type: 'text' | 'image' | 'table' | 'style' | 'metadata';
  content: string;
  location: string;
  details?: Record<string, unknown>;
}

export interface ComparisonSummary {
  totalChanges: number;
  addedCharacters: number;
  deletedCharacters: number;
  addedWords: number;
  deletedWords: number;
  modifiedParagraphs: number;
  addedImages: number;
  deletedImages: number;
  modifiedTables: number;
}

// ============================================================================
// SEARCH TYPES - Full-text search across documents
// ============================================================================

/**
 * Search options
 */
export interface SearchOptions {
  query?: string;
  caseSensitive?: boolean;
  wholeWord?: boolean;
  regex?: boolean;
  useRegex?: boolean;
  fuzzy?: boolean;
  fuzzyMatch?: boolean;
  fuzzyThreshold?: number;
  maxResults?: number;
  highlightMatches?: boolean;
  includeContext?: boolean;
  contextLength?: number;
  highlightTag?: string;
  searchIn?: ('text' | 'metadata' | 'comments' | 'annotations')[];
  searchFields?: string[];
  fileTypes?: FileFormat[];
  dateRange?: { from?: Date; to?: Date };
  sortBy?: 'relevance' | 'date' | 'name' | 'size' | 'position' | 'document';
  sortOrder?: 'asc' | 'desc' | 'ascending' | 'descending';
}

/**
 * Search result
 */
export interface SearchResult {
  query?: string;
  totalMatches?: number;
  totalHits?: number;
  hits?: Array<{
    id: string;
    documentId: string;
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
  }>;
  documents?: DocumentSearchResult[];
  facets?: SearchFacets | Record<string, Array<{ value: string; count: number }>>;
  suggestions?: string[];
  duration?: number;
  searchDuration?: number;
}

export interface DocumentSearchResult {
  file: string;
  format: FileFormat;
  matches: SearchMatch[];
  score: number;
  highlights?: string[];
  metadata?: DocumentMetadata;
}

export interface SearchMatch {
  content: string;
  context: string;
  position: {
    start: number;
    end: number;
    pageNumber?: number;
    lineNumber?: number;
  };
  score: number;
  type: 'text' | 'metadata' | 'comment' | 'annotation';
}

export interface SearchFacets {
  formats: Record<string, number>;
  dates: Record<string, number>;
  authors: Record<string, number>;
  keywords: Record<string, number>;
}

/**
 * Index options for search optimization
 */
export interface IndexOptions {
  fields?: string[];
  stemming?: boolean;
  stopWords?: string[] | boolean;
  minWordLength?: number;
  maxWordLength?: number;
  boost?: Record<string, number>;
  analyzers?: Record<string, TextAnalyzer>;
}

export interface TextAnalyzer {
  tokenizer: 'standard' | 'whitespace' | 'letter' | 'custom';
  filters: Array<'lowercase' | 'stopwords' | 'stemmer' | 'synonyms' | 'ngram'>;
  customTokenizer?: (text: string) => string[];
}

// ============================================================================
// BATCH PROCESSING TYPES
// ============================================================================

/**
 * Batch job configuration
 */
export interface BatchJobConfig {
  id?: string;
  name?: string;
  files?: Array<string | Buffer | { data: InputDataType; name: string }>;
  operation?: 'convert' | 'extract' | 'analyze' | 'compare' | 'search';
  options?:
    | ConvertFileOptions
    | PDFExtractionOptions
    | AnalysisOptions
    | ComparisonOptions
    | SearchOptions;
  defaultOptions?: Record<string, unknown>;
  outputDir?: string;
  outputDirectory?: string;
  concurrency?: number;
  retries?: number;
  retryAttempts?: number;
  retryDelay?: number;
  timeout?: number;
  continueOnError?: boolean;
  onProgress?: (progress: BatchProgress) => void;
  onFileComplete?: (result: BatchFileResult) => void;
  onError?: (error: Error, file: string) => void;
}

/**
 * Batch job status
 */
export type BatchJobStatus =
  | 'pending'
  | 'processing'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * Batch progress information
 */
export interface BatchProgress {
  jobId: string;
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  currentFile?: string;
  progress: number;
  estimatedTimeRemaining?: number;
  startedAt: Date;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
}

/**
 * Batch file result
 */
export interface BatchFileResult {
  file: string;
  success: boolean;
  result?: ConversionResult | ExtractionResult | AnalysisResult;
  error?: Error;
  duration: number;
  outputPath?: string;
}

/**
 * Batch job result
 */
export interface BatchJobResult {
  jobId: string;
  success?: boolean;
  status?: 'completed' | 'partial' | 'failed';
  totalFiles?: number;
  totalItems?: number;
  successCount?: number;
  successfulItems?: number;
  failedCount?: number;
  failedItems?: number;
  results?: BatchFileResult[] | unknown[];
  errors?: Array<{ file?: string; itemId?: string; error: string | Error }>;
  duration?: number;
  totalDuration?: number;
  averageItemDuration?: number;
  startedAt?: Date;
  startTime?: Date;
  completedAt?: Date;
  endTime?: Date;
}

// ============================================================================
// STREAMING TYPES
// ============================================================================

/**
 * Stream processing options
 */
export interface StreamProcessingOptions {
  chunkSize?: number;
  highWaterMark?: number;
  encoding?: BufferEncoding;
  onChunk?: (chunk: Buffer, index: number) => void | Promise<void>;
  onProgress?: (bytesProcessed: number, totalBytes?: number) => void;
  transform?: (chunk: Buffer) => Buffer | Promise<Buffer>;
  filter?: (chunk: Buffer) => boolean;
  maxMemory?: number;
  tempDir?: string;
  pauseOnBackpressure?: boolean;
  emitProgress?: boolean;
  progressInterval?: number;
}

/**
 * Stream result
 */
export interface StreamResult {
  stream: ReadableStream<Uint8Array>;
  metadata: {
    totalSize?: number;
    chunkCount?: number;
    format: FileFormat;
    mimeType: string;
  };
  abort: () => void;
}
/**
 * Extractor plugin interface
 */
export interface ExtractorPlugin {
  name: string;
  version: string;
  supportedFormats: FileFormat[];
  extract(data: InputDataType, options: Record<string, unknown>): Promise<ExtractionResult>;
  canExtract?(data: InputDataType): boolean;
}

/**
 * Analyzer plugin interface
 */
export interface AnalyzerPlugin {
  name: string;
  version: string;
  supportedFormats: FileFormat[];
  analyze(data: InputDataType, options: AnalysisOptions): Promise<AnalysisResult>;
}

/**
 * Processor plugin interface (for transformations)
 */
export interface ProcessorPlugin {
  name: string;
  version: string;
  supportedFormats: FileFormat[];
  process(data: Buffer, options: Record<string, unknown>): Promise<Buffer>;
  priority?: number;
}

/**
 * Hook types for extensibility
 */
export interface ConvertitHooks {
  beforeExtract?: (data: InputDataType, options: Record<string, unknown>) => Promise<InputDataType>;
  afterExtract?: <T>(result: ExtractionResult<T>) => Promise<ExtractionResult<T>>;
  beforeAnalyze?: (data: InputDataType, options: AnalysisOptions) => Promise<InputDataType>;
  afterAnalyze?: (result: AnalysisResult) => Promise<AnalysisResult>;
  beforeBatch?: (config: BatchJobConfig) => Promise<BatchJobConfig>;
  afterBatch?: (result: BatchJobResult) => Promise<BatchJobResult>;
  onError?: (error: Error, context: Record<string, unknown>) => void;
}
/**
 * Extractor configuration
 */
export interface ExtractorConfig {
  tempDir?: string;
  maxFileSize?: number;
  timeout?: number;
  cache?: boolean;
  cacheDir?: string;
  cacheTTL?: number;
  verbose?: boolean;
  plugins?: ExtractorPlugin[];
}

/**
 * Universal extraction options
 */
export interface UniversalExtractionOptions {
  pdf?: PDFExtractionOptions;
  word?: WordExtractionOptions;
  excel?: ExcelExtractionOptions;
  csv?: CSVExtractionOptions;
  image?: ImageExtractionOptions;
  autoDetect?: boolean;
  fallbackFormat?: FileFormat;
}
