/**
 * Utility functions for file operations and data manipulation.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  FileFormat,
  InputDataType,
  PageSize,
  PageMargins,
  FontConfig,
} from '../core/types.js';
import { ValidationError, ConvertFileError, ErrorCode } from '../core/errors.js';

export function generateId(): string {
  return uuidv4();
}

export function generateFilename(format: FileFormat, prefix?: string): string {
  const timestamp = Date.now();
  const id = generateId().slice(0, 8);
  const ext = getFileExtension(format);
  return prefix ? `${prefix}_${timestamp}_${id}${ext}` : `${timestamp}_${id}${ext}`;
}

export function getFileExtension(format: FileFormat): string {
  const extensions: Record<FileFormat, string> = {
    pdf: '.pdf',
    word: '.docx',
    docx: '.docx',
    excel: '.xlsx',
    xlsx: '.xlsx',
    csv: '.csv',
    html: '.html',
    txt: '.txt',
    json: '.json',
    xml: '.xml',
    markdown: '.md',
    md: '.md',
    png: '.png',
    jpg: '.jpg',
    jpeg: '.jpeg',
    webp: '.webp',
    svg: '.svg',
    gif: '.gif',
    bmp: '.bmp',
    tiff: '.tiff',
  };
  return extensions[format] || '.bin';
}

export function getMimeType(format: FileFormat): string {
  const mimeTypes: Record<FileFormat, string> = {
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
  return mimeTypes[format] || 'application/octet-stream';
}

export function detectFormatFromExtension(filename: string): FileFormat | null {
  const ext = filename.toLowerCase().split('.').pop();
  const formatMap: Record<string, FileFormat> = {
    pdf: 'pdf',
    doc: 'word',
    docx: 'docx',
    xls: 'excel',
    xlsx: 'xlsx',
    csv: 'csv',
    html: 'html',
    htm: 'html',
    txt: 'txt',
    json: 'json',
    xml: 'xml',
    md: 'md',
    markdown: 'markdown',
    png: 'png',
    jpg: 'jpg',
    jpeg: 'jpeg',
    webp: 'webp',
    svg: 'svg',
    gif: 'gif',
    bmp: 'bmp',
    tiff: 'tiff',
    tif: 'tiff',
  };
  return ext ? formatMap[ext] || null : null;
}

export function normalizeFormat(format: string): FileFormat {
  const normalized = format.toLowerCase().trim();
  const formatMap: Record<string, FileFormat> = {
    pdf: 'pdf',
    word: 'word',
    doc: 'word',
    docx: 'docx',
    excel: 'excel',
    xls: 'excel',
    xlsx: 'xlsx',
    csv: 'csv',
    html: 'html',
    htm: 'html',
    text: 'txt',
    txt: 'txt',
    json: 'json',
    xml: 'xml',
    markdown: 'markdown',
    md: 'md',
    png: 'png',
    jpg: 'jpg',
    jpeg: 'jpeg',
    webp: 'webp',
    svg: 'svg',
    gif: 'gif',
    bmp: 'bmp',
    tiff: 'tiff',
  };

  const result = formatMap[normalized];
  if (!result) {
    throw new ValidationError(`Unknown format: ${format}`);
  }
  return result;
}

export function isDocumentFormat(format: FileFormat): boolean {
  return ['pdf', 'word', 'docx', 'html', 'txt', 'markdown', 'md'].includes(format);
}

export function isSpreadsheetFormat(format: FileFormat): boolean {
  return ['excel', 'xlsx', 'csv'].includes(format);
}

export function isImageFormat(format: FileFormat): boolean {
  return ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif', 'bmp', 'tiff'].includes(format);
}

export function isDataFormat(format: FileFormat): boolean {
  return ['json', 'xml', 'csv'].includes(format);
}

export async function toBuffer(data: InputDataType): Promise<Buffer> {
  if (Buffer.isBuffer(data)) {
    return data;
  }

  if (typeof data === 'string') {
    return Buffer.from(data, 'utf-8');
  }

  if (data instanceof ArrayBuffer) {
    return Buffer.from(data);
  }

  if (data instanceof Uint8Array) {
    return Buffer.from(data);
  }

  if (typeof data === 'object') {
    return Buffer.from(JSON.stringify(data), 'utf-8');
  }

  if (isReadableStream(data)) {
    return streamToBuffer(data as ReadableStream);
  }

  throw new ValidationError('Unable to convert input data to Buffer');
}

export async function toString(data: InputDataType): Promise<string> {
  if (typeof data === 'string') {
    return data;
  }

  if (Buffer.isBuffer(data)) {
    return data.toString('utf-8');
  }

  if (data instanceof ArrayBuffer) {
    return Buffer.from(new Uint8Array(data)).toString('utf-8');
  }

  if (data instanceof Uint8Array) {
    return Buffer.from(data).toString('utf-8');
  }

  if (typeof data === 'object') {
    return JSON.stringify(data, null, 2);
  }

  if (isReadableStream(data)) {
    const buffer = await streamToBuffer(data as ReadableStream);
    return buffer.toString('utf-8');
  }

  throw new ValidationError('Unable to convert input data to string');
}

export function isReadableStream(value: unknown): boolean {
  return (
    value !== null && typeof value === 'object' && typeof (value as any).getReader === 'function'
  );
}

export async function streamToBuffer(stream: ReadableStream): Promise<Buffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }

  return Buffer.concat(chunks);
}

/**
 * Convert Buffer to ReadableStream
 */
export function bufferToStream(buffer: Buffer): ReadableStream {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(buffer);
      controller.close();
    },
  });
}

export function getPageSize(size: string | PageSize): PageSize {
  if (typeof size === 'object') {
    return size;
  }

  const sizes: Record<string, PageSize> = {
    A4: { width: 595.28, height: 841.89 },
    A3: { width: 841.89, height: 1190.55 },
    A5: { width: 419.53, height: 595.28 },
    Letter: { width: 612, height: 792 },
    Legal: { width: 612, height: 1008 },
    Tabloid: { width: 792, height: 1224 },
  };

  return sizes[size] ?? sizes['A4']!;
}

export function mergeMargins(margins?: Partial<PageMargins>): PageMargins {
  const defaults: PageMargins = {
    top: 72,
    right: 72,
    bottom: 72,
    left: 72,
  };
  return { ...defaults, ...margins };
}

export function mergeFont(font?: Partial<FontConfig>): FontConfig {
  const defaults: FontConfig = {
    family: 'Helvetica',
    size: 12,
    color: '#000000',
    bold: false,
    italic: false,
    underline: false,
  };
  return { ...defaults, ...font };
}

export function parseColor(color: string): { r: number; g: number; b: number } {
  let hex = color.replace('#', '');

  if (hex.length === 3) {
    hex = hex
      .split('')
      .map(c => c + c)
      .join('');
  }

  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

export function getFileSize(data: Buffer | string): number {
  if (Buffer.isBuffer(data)) {
    return data.length;
  }
  return Buffer.byteLength(data, 'utf-8');
}

export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  let size = bytes;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

export function deepMerge<T extends Record<string, any>>(target: T, ...sources: Partial<T>[]): T {
  if (!sources.length) return target;

  const source = sources.shift();
  if (!source) return target;

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key] as any;
      const targetValue = (target as any)[key];

      if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
        (target as any)[key] = deepMerge({ ...targetValue }, sourceValue);
      } else if (sourceValue !== undefined) {
        (target as any)[key] = sourceValue;
      }
    }
  }

  return deepMerge(target, ...sources);
}

export function isPlainObject(value: unknown): value is Record<string, any> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    value.constructor === Object
  );
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    retries?: number;
    delay?: number;
    backoff?: number;
    onRetry?: (error: Error, attempt: number) => void;
  } = {}
): Promise<T> {
  const { retries = 3, delay: initialDelay = 1000, backoff = 2, onRetry } = options;

  let lastError: Error;
  let currentDelay = initialDelay;

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt <= retries) {
        onRetry?.(lastError, attempt);
        await delay(currentDelay);
        currentDelay *= backoff;
      }
    }
  }

  throw lastError!;
}

export function withTimeout<T>(promise: Promise<T>, ms: number, message?: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(
        new ConvertFileError(
          ErrorCode.CONVERSION_TIMEOUT,
          message || `Operation timed out after ${ms}ms`
        )
      );
    }, ms);

    promise
      .then(result => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch(error => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export function flatten<T>(arrays: T[][]): T[] {
  return arrays.reduce((acc, arr) => acc.concat(arr), []);
}

export function compact<T extends Record<string, any>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined)) as Partial<T>;
}

export function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, char => htmlEntities[char] || char);
}

export function unescapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
  };
  return text.replace(/&(?:amp|lt|gt|quot|#39);/g, entity => htmlEntities[entity] || entity);
}

export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/^\.+/, '')
    .replace(/\.+$/, '')
    .trim();
}

export function isNode(): boolean {
  return (
    typeof process !== 'undefined' && process.versions != null && process.versions.node != null
  );
}

export function isBun(): boolean {
  return typeof Bun !== 'undefined';
}

export function isBrowser(): boolean {
  return (
    typeof globalThis !== 'undefined' &&
    typeof (globalThis as any).window !== 'undefined' &&
    typeof (globalThis as any).document !== 'undefined'
  );
}

export function timestamp(): string {
  return new Date().toISOString();
}

export function measureDuration(startTime: number): number {
  return Date.now() - startTime;
}
