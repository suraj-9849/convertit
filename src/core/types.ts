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
    | 'slantDashDot';
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
