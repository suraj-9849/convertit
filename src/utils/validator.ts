/**
 * Input validation utilities.
 */

import type {
  FileFormat,
  InputDataType,
  ConvertFileOptions,
  PDFOptions,
  WordOptions,
  ExcelOptions,
  CSVOptions,
  HTMLOptions,
  ImageOptions,
  WatermarkConfig,
  EncryptionConfig,
  CompressionConfig,
  MergeConfig,
  SplitConfig,
} from '../core/types.js';
import { ValidationError } from '../core/errors.js';

const SUPPORTED_FORMATS: FileFormat[] = [
  'pdf',
  'word',
  'docx',
  'excel',
  'xlsx',
  'csv',
  'html',
  'txt',
  'json',
  'xml',
  'markdown',
  'md',
  'png',
  'jpg',
  'jpeg',
  'webp',
  'svg',
  'gif',
  'bmp',
  'tiff',
];

const DOCUMENT_FORMATS: FileFormat[] = ['pdf', 'word', 'docx', 'html', 'txt', 'markdown', 'md'];
const SPREADSHEET_FORMATS: FileFormat[] = ['excel', 'xlsx', 'csv'];
const IMAGE_FORMATS: FileFormat[] = ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif', 'bmp', 'tiff'];
const DATA_FORMATS: FileFormat[] = ['json', 'xml', 'csv'];

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateOptions(options: ConvertFileOptions): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  if (!options) {
    result.valid = false;
    result.errors.push('Options are required');
    return result;
  }

  if (!options.type) {
    result.valid = false;
    result.errors.push('Output type is required');
    return result;
  }

  if (!isValidFormat(options.type)) {
    result.valid = false;
    result.errors.push(`Invalid output format: ${options.type}`);
    return result;
  }

  // Validate format-specific options
  switch (options.type) {
    case 'pdf':
      if (options.pdf) {
        const pdfValidation = validatePDFOptions(options.pdf);
        result.errors.push(...pdfValidation.errors);
        result.warnings.push(...pdfValidation.warnings);
        if (!pdfValidation.valid) result.valid = false;
      }
      break;

    case 'word':
    case 'docx':
      if (options.word) {
        const wordValidation = validateWordOptions(options.word);
        result.errors.push(...wordValidation.errors);
        result.warnings.push(...wordValidation.warnings);
        if (!wordValidation.valid) result.valid = false;
      }
      break;

    case 'excel':
    case 'xlsx':
      if (options.excel) {
        const excelValidation = validateExcelOptions(options.excel);
        result.errors.push(...excelValidation.errors);
        result.warnings.push(...excelValidation.warnings);
        if (!excelValidation.valid) result.valid = false;
      }
      break;

    case 'csv':
      if (options.csv) {
        const csvValidation = validateCSVOptions(options.csv);
        result.errors.push(...csvValidation.errors);
        result.warnings.push(...csvValidation.warnings);
        if (!csvValidation.valid) result.valid = false;
      }
      break;

    case 'html':
      if (options.html) {
        const htmlValidation = validateHTMLOptions(options.html);
        result.errors.push(...htmlValidation.errors);
        result.warnings.push(...htmlValidation.warnings);
        if (!htmlValidation.valid) result.valid = false;
      }
      break;

    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'webp':
    case 'gif':
    case 'bmp':
    case 'tiff':
      if (options.image) {
        const imageValidation = validateImageOptions(options.image);
        result.errors.push(...imageValidation.errors);
        result.warnings.push(...imageValidation.warnings);
        if (!imageValidation.valid) result.valid = false;
      }
      break;
  }

  // Validate transformer options
  if (options.watermark) {
    const watermarkValidation = validateWatermarkConfig(options.watermark);
    result.errors.push(...watermarkValidation.errors);
    result.warnings.push(...watermarkValidation.warnings);
    if (!watermarkValidation.valid) result.valid = false;
  }

  if (options.encrypt) {
    const encryptValidation = validateEncryptionConfig(options.encrypt);
    result.errors.push(...encryptValidation.errors);
    result.warnings.push(...encryptValidation.warnings);
    if (!encryptValidation.valid) result.valid = false;
  }

  if (options.compress) {
    const compressValidation = validateCompressionConfig(options.compress);
    result.errors.push(...compressValidation.errors);
    result.warnings.push(...compressValidation.warnings);
    if (!compressValidation.valid) result.valid = false;
  }

  if (options.merge) {
    const mergeValidation = validateMergeConfig(options.merge);
    result.errors.push(...mergeValidation.errors);
    result.warnings.push(...mergeValidation.warnings);
    if (!mergeValidation.valid) result.valid = false;
  }

  if (options.split) {
    const splitValidation = validateSplitConfig(options.split);
    result.errors.push(...splitValidation.errors);
    result.warnings.push(...splitValidation.warnings);
    if (!splitValidation.valid) result.valid = false;
  }

  if (options.timeout !== undefined && (options.timeout < 0 || !Number.isFinite(options.timeout))) {
    result.errors.push('Timeout must be a positive number');
    result.valid = false;
  }

  if (
    options.retries !== undefined &&
    (options.retries < 0 || !Number.isInteger(options.retries))
  ) {
    result.errors.push('Retries must be a non-negative integer');
    result.valid = false;
  }

  return result;
}

export function validateInput(data: InputDataType): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  if (data === null || data === undefined) {
    result.valid = false;
    result.errors.push('Input data is required');
    return result;
  }

  if (typeof data === 'string' && data.trim() === '') {
    result.warnings.push('Input data is an empty string');
  }

  if (Buffer.isBuffer(data) && data.length === 0) {
    result.warnings.push('Input data is an empty buffer');
  }

  if (Array.isArray(data) && data.length === 0) {
    result.warnings.push('Input data is an empty array');
  }

  if (typeof data === 'object' && !Buffer.isBuffer(data) && !Array.isArray(data)) {
    if (Object.keys(data).length === 0) {
      result.warnings.push('Input data is an empty object');
    }
  }

  return result;
}

export function isValidFormat(format: string): format is FileFormat {
  return SUPPORTED_FORMATS.includes(format as FileFormat);
}

export function validatePDFOptions(options: PDFOptions): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  if (options.pageSize && typeof options.pageSize === 'object') {
    if (!options.pageSize.width || !options.pageSize.height) {
      result.errors.push('Custom page size must include width and height');
      result.valid = false;
    }
    if (options.pageSize.width <= 0 || options.pageSize.height <= 0) {
      result.errors.push('Page dimensions must be positive numbers');
      result.valid = false;
    }
  }

  if (options.margins) {
    const marginKeys = ['top', 'right', 'bottom', 'left'] as const;
    for (const key of marginKeys) {
      if (options.margins[key] !== undefined && options.margins[key]! < 0) {
        result.errors.push(`Margin ${key} cannot be negative`);
        result.valid = false;
      }
    }
  }

  if (options.font?.size !== undefined && options.font.size <= 0) {
    result.errors.push('Font size must be a positive number');
    result.valid = false;
  }

  return result;
}

export function validateWordOptions(options: WordOptions): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  if (options.pageSize && typeof options.pageSize === 'object') {
    if (!options.pageSize.width || !options.pageSize.height) {
      result.errors.push('Custom page size must include width and height');
      result.valid = false;
    }
  }

  return result;
}

export function validateExcelOptions(options: ExcelOptions): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  if (options.sheets) {
    for (let i = 0; i < options.sheets.length; i++) {
      const sheet = options.sheets[i];
      if (!sheet?.name) {
        result.errors.push(`Sheet at index ${i} must have a name`);
        result.valid = false;
      }
      if (!sheet?.data || !Array.isArray(sheet.data)) {
        result.errors.push(`Sheet "${sheet?.name || 'unknown'}" must have data array`);
        result.valid = false;
      }
    }
  }

  if (options.columnWidths) {
    for (let i = 0; i < options.columnWidths.length; i++) {
      const width = options.columnWidths[i];
      if (width !== undefined && width <= 0) {
        result.errors.push(`Column width at index ${i} must be positive`);
        result.valid = false;
      }
    }
  }

  return result;
}

export function validateCSVOptions(options: CSVOptions): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  if (options.delimiter && options.delimiter.length > 1) {
    result.warnings.push('Delimiter longer than 1 character may cause parsing issues');
  }

  return result;
}

export function validateHTMLOptions(options: HTMLOptions): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  if (options.template && typeof options.template !== 'string') {
    result.errors.push('Template must be a string');
    result.valid = false;
  }

  return result;
}

export function validateImageOptions(options: ImageOptions): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  if (options.quality !== undefined) {
    if (options.quality < 0 || options.quality > 100) {
      result.errors.push('Image quality must be between 0 and 100');
      result.valid = false;
    }
  }

  if (options.width !== undefined && options.width <= 0) {
    result.errors.push('Image width must be a positive number');
    result.valid = false;
  }

  if (options.height !== undefined && options.height <= 0) {
    result.errors.push('Image height must be a positive number');
    result.valid = false;
  }

  if (options.dpi !== undefined && options.dpi <= 0) {
    result.errors.push('DPI must be a positive number');
    result.valid = false;
  }

  if (
    options.rotate !== undefined &&
    ![0, 90, 180, 270, -90, -180, -270].includes(options.rotate)
  ) {
    result.warnings.push('Non-standard rotation angle may produce unexpected results');
  }

  return result;
}

export function validateWatermarkConfig(config: WatermarkConfig): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  if (!config.text && !config.image) {
    result.errors.push('Watermark must have either text or image');
    result.valid = false;
  }

  if (config.opacity !== undefined) {
    if (config.opacity < 0 || config.opacity > 1) {
      result.errors.push('Watermark opacity must be between 0 and 1');
      result.valid = false;
    }
  }

  if (config.scale !== undefined && config.scale <= 0) {
    result.errors.push('Watermark scale must be a positive number');
    result.valid = false;
  }

  return result;
}

export function validateEncryptionConfig(config: EncryptionConfig): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  if (!config.password) {
    result.errors.push('Encryption password is required');
    result.valid = false;
  }

  if (config.password && config.password.length < 4) {
    result.warnings.push('Password is too short, consider using a stronger password');
  }

  if (config.encryptionMethod && !['40bit', '128bit', '256bit'].includes(config.encryptionMethod)) {
    result.errors.push('Invalid encryption method');
    result.valid = false;
  }

  return result;
}

export function validateCompressionConfig(config: CompressionConfig): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  if (config.level && !['low', 'medium', 'high', 'maximum'].includes(config.level)) {
    result.errors.push('Invalid compression level');
    result.valid = false;
  }

  if (config.quality !== undefined) {
    if (config.quality < 0 || config.quality > 100) {
      result.errors.push('Compression quality must be between 0 and 100');
      result.valid = false;
    }
  }

  if (config.imageQuality !== undefined) {
    if (config.imageQuality < 0 || config.imageQuality > 100) {
      result.errors.push('Image quality must be between 0 and 100');
      result.valid = false;
    }
  }

  return result;
}

export function validateMergeConfig(config: MergeConfig): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  if (!config.files || !Array.isArray(config.files)) {
    result.errors.push('Merge files array is required');
    result.valid = false;
    return result;
  }

  if (config.files.length < 2) {
    result.errors.push('At least 2 files are required for merging');
    result.valid = false;
  }

  for (let i = 0; i < config.files.length; i++) {
    const file = config.files[i];
    if (!file || (typeof file !== 'string' && !Buffer.isBuffer(file))) {
      result.errors.push(`Invalid file at index ${i}`);
      result.valid = false;
    }
  }

  return result;
}

export function validateSplitConfig(config: SplitConfig): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  if (!config.mode) {
    result.errors.push('Split mode is required');
    result.valid = false;
    return result;
  }

  if (!['pages', 'ranges', 'size', 'bookmarks'].includes(config.mode)) {
    result.errors.push('Invalid split mode');
    result.valid = false;
  }

  if (config.mode === 'pages' && (!config.pages || config.pages.length === 0)) {
    result.errors.push('Pages array is required for pages split mode');
    result.valid = false;
  }

  if (config.mode === 'ranges' && (!config.ranges || config.ranges.length === 0)) {
    result.errors.push('Ranges array is required for ranges split mode');
    result.valid = false;
  }

  if (config.mode === 'size' && (!config.maxSize || config.maxSize <= 0)) {
    result.errors.push('Max size must be a positive number for size split mode');
    result.valid = false;
  }

  if (config.pages) {
    for (const page of config.pages) {
      if (!Number.isInteger(page) || page < 1) {
        result.errors.push('Page numbers must be positive integers');
        result.valid = false;
        break;
      }
    }
  }

  if (config.ranges) {
    for (const range of config.ranges) {
      if (range.start > range.end) {
        result.errors.push('Range start must be less than or equal to end');
        result.valid = false;
      }
      if (range.start < 1 || range.end < 1) {
        result.errors.push('Range values must be positive integers');
        result.valid = false;
      }
    }
  }

  return result;
}

export function assertValid(validation: ValidationResult, context?: string): void {
  if (!validation.valid) {
    const message = context
      ? `${context}: ${validation.errors.join(', ')}`
      : validation.errors.join(', ');
    throw new ValidationError(message, { errors: validation.errors });
  }
}

export function canConvert(from: FileFormat, to: FileFormat): boolean {
  // Document to document conversions
  if (DOCUMENT_FORMATS.includes(from) && DOCUMENT_FORMATS.includes(to)) {
    return true;
  }

  // Spreadsheet to spreadsheet conversions
  if (SPREADSHEET_FORMATS.includes(from) && SPREADSHEET_FORMATS.includes(to)) {
    return true;
  }

  // Image to image conversions
  if (IMAGE_FORMATS.includes(from) && IMAGE_FORMATS.includes(to)) {
    return true;
  }

  // Data format conversions
  if (DATA_FORMATS.includes(from) && DATA_FORMATS.includes(to)) {
    return true;
  }

  // Cross-type conversions
  // HTML can be converted to PDF
  if (from === 'html' && to === 'pdf') return true;

  // JSON/CSV can be converted to Excel
  if (['json', 'csv'].includes(from) && SPREADSHEET_FORMATS.includes(to)) return true;

  // Excel can be converted to CSV/JSON
  if (SPREADSHEET_FORMATS.includes(from) && ['json', 'csv'].includes(to)) return true;

  // PDF can be converted to images
  if (from === 'pdf' && IMAGE_FORMATS.includes(to)) return true;

  // Images can be converted to PDF
  if (IMAGE_FORMATS.includes(from) && to === 'pdf') return true;

  // Text/Markdown to document formats
  if (['txt', 'markdown', 'md'].includes(from) && DOCUMENT_FORMATS.includes(to)) return true;

  return false;
}
