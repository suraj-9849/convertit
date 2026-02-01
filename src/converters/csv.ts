/**
 * CSV converter for arrays, objects, and tabular data.
 */

import { stringify } from 'csv-stringify/sync';
import { parse } from 'csv-parse/sync';
import { BaseConverter } from './base.js';
import type { InputDataType, ConvertFileOptions, FileFormat, CSVOptions } from '../core/types.js';
import { ConvertFileError, ErrorCode } from '../core/errors.js';

export class CSVConverter extends BaseConverter {
  constructor() {
    super('csv');
  }

  getSupportedInputFormats(): FileFormat[] {
    return ['json', 'excel', 'xlsx', 'xml', 'txt'];
  }

  async convert(data: InputDataType, options: ConvertFileOptions): Promise<Buffer> {
    const csvOptions = options.csv || {};

    // Handle different input types
    if (Array.isArray(data)) {
      return this.createFromArray(data, csvOptions);
    }

    if (typeof data === 'object' && !Buffer.isBuffer(data)) {
      return this.createFromObject(data as Record<string, any>, csvOptions);
    }

    if (typeof data === 'string') {
      return this.createFromString(data, csvOptions);
    }

    if (Buffer.isBuffer(data)) {
      const text = data.toString('utf-8');
      return this.createFromString(text, csvOptions);
    }

    throw new ConvertFileError(ErrorCode.INVALID_INPUT, 'Unable to convert input data to CSV');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async createFromArray(data: any[], csvOptions: CSVOptions): Promise<Buffer> {
    if (data.length === 0) {
      return Buffer.from('');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let records: any[][];
    let headers: string[] | undefined;

    // Check if array of objects
    if (typeof data[0] === 'object' && data[0] !== null && !Array.isArray(data[0])) {
      headers =
        csvOptions.headers === true
          ? Object.keys(data[0])
          : Array.isArray(csvOptions.headers)
            ? csvOptions.headers
            : Object.keys(data[0]);

      records = data.map(item =>
        headers!.map(header => {
          const value = item[header];
          if (value === null || value === undefined) return '';
          if (typeof value === 'object') return JSON.stringify(value);
          return String(value);
        })
      );

      if (csvOptions.headers !== false) {
        records.unshift(headers);
      }
    } else if (Array.isArray(data[0])) {
      // Array of arrays
      records = data.map(row =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        row.map((cell: any) => {
          if (cell === null || cell === undefined) return '';
          if (typeof cell === 'object') return JSON.stringify(cell);
          return String(cell);
        })
      );

      if (Array.isArray(csvOptions.headers)) {
        records.unshift(csvOptions.headers);
      }
    } else {
      // Simple array of values
      records = data.map(item => [String(item)]);

      if (Array.isArray(csvOptions.headers) && csvOptions.headers.length > 0) {
        records.unshift([csvOptions.headers[0]]);
      }
    }

    const csvContent = stringify(records, {
      delimiter: csvOptions.delimiter || ',',
      quote: csvOptions.quote || '"',
      escape: csvOptions.escape || '"',
      record_delimiter: csvOptions.newline || '\n',
    });

    return Buffer.from(csvContent, csvOptions.encoding || 'utf-8');
  }

  private async createFromObject(
    data: Record<string, any>,
    csvOptions: CSVOptions
  ): Promise<Buffer> {
    // Single object - convert to key-value pairs
    if (!Array.isArray(Object.values(data)[0])) {
      const rows = Object.entries(data).map(([key, value]) => ({
        Key: key,
        Value: typeof value === 'object' ? JSON.stringify(value) : String(value),
      }));
      return this.createFromArray(rows, csvOptions);
    }

    // Object with array values - treat first array as data
    const firstArrayKey = Object.keys(data).find(key => Array.isArray(data[key]));
    if (firstArrayKey) {
      return this.createFromArray(data[firstArrayKey], csvOptions);
    }

    // Fallback to key-value
    const rows = Object.entries(data).map(([key, value]) => ({
      Key: key,
      Value: typeof value === 'object' ? JSON.stringify(value) : String(value),
    }));
    return this.createFromArray(rows, csvOptions);
  }

  private async createFromString(text: string, csvOptions: CSVOptions): Promise<Buffer> {
    // Try to parse as JSON first
    try {
      const jsonData = JSON.parse(text);
      if (Array.isArray(jsonData)) {
        return this.createFromArray(jsonData, csvOptions);
      }
      return this.createFromObject(jsonData, csvOptions);
    } catch {
      // Not JSON, return as-is or format as single column
      const lines = text
        .split('\n')
        .filter(line => (csvOptions.skipEmptyLines ? line.trim() : true));

      if (lines.length === 0) {
        return Buffer.from('');
      }

      // Check if already CSV-like
      const delimiter = csvOptions.delimiter || ',';
      const firstLine = lines[0] || '';

      if (firstLine && firstLine.includes(delimiter)) {
        // Likely already CSV, just normalize
        return Buffer.from(
          lines
            .map(line =>
              csvOptions.trimFields
                ? line
                    .split(delimiter)
                    .map(f => f.trim())
                    .join(delimiter)
                : line
            )
            .join(csvOptions.newline || '\n'),
          csvOptions.encoding || 'utf-8'
        );
      }

      // Convert lines to single-column CSV
      const records: string[][] = lines.map(line => [csvOptions.trimFields ? line.trim() : line]);

      if (Array.isArray(csvOptions.headers) && csvOptions.headers.length > 0) {
        const firstHeader = csvOptions.headers[0] || '';
        records.unshift([firstHeader]);
      }

      const csvContent = stringify(records, {
        delimiter: delimiter,
        quote: csvOptions.quote || '"',
        escape: csvOptions.escape || '"',
        record_delimiter: csvOptions.newline || '\n',
      });

      return Buffer.from(csvContent, csvOptions.encoding || 'utf-8');
    }
  }
}

/**
 * CSV Utilities
 */
export class CSVUtils {
  /**
   * Parse CSV string to array of objects
   */
  static parse(
    content: string | Buffer,
    options?: {
      delimiter?: string;
      headers?: boolean | string[];
      skipEmptyLines?: boolean;
      trim?: boolean;
    }
  ): Record<string, any>[] {
    const csvContent = Buffer.isBuffer(content) ? content.toString('utf-8') : content;

    const records = parse(csvContent, {
      delimiter: options?.delimiter || ',',
      columns: options?.headers === false ? false : options?.headers || true,
      skip_empty_lines: options?.skipEmptyLines ?? true,
      trim: options?.trim ?? true,
      relax_quotes: true,
      relax_column_count: true,
    });

    return records;
  }

  /**
   * Parse CSV to array of arrays
   */
  static parseToArrays(
    content: string | Buffer,
    options?: {
      delimiter?: string;
      skipEmptyLines?: boolean;
      trim?: boolean;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): any[][] {
    const csvContent = Buffer.isBuffer(content) ? content.toString('utf-8') : content;

    return parse(csvContent, {
      delimiter: options?.delimiter || ',',
      columns: false,
      skip_empty_lines: options?.skipEmptyLines ?? true,
      trim: options?.trim ?? true,
      relax_quotes: true,
      relax_column_count: true,
    });
  }

  /**
   * Get column headers from CSV
   */
  static getHeaders(content: string | Buffer, delimiter: string = ','): string[] {
    const csvContent = Buffer.isBuffer(content) ? content.toString('utf-8') : content;
    const firstLine = csvContent.split('\n')[0] || '';
    return firstLine.split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''));
  }

  /**
   * Convert CSV to JSON
   */
  static toJson(
    content: string | Buffer,
    options?: {
      delimiter?: string;
      headers?: string[];
    }
  ): Record<string, any>[] {
    return this.parse(content, {
      delimiter: options?.delimiter,
      headers: options?.headers || true,
    });
  }

  /**
   * Merge multiple CSV contents
   */
  static merge(
    csvContents: (string | Buffer)[],
    options?: {
      delimiter?: string;
      includeHeaders?: boolean;
    }
  ): string {
    const delimiter = options?.delimiter || ',';
    const includeHeaders = options?.includeHeaders ?? true;

    const result: string[] = [];
    let headers: string[] | null = null;

    for (const content of csvContents) {
      const csvContent = Buffer.isBuffer(content) ? content.toString('utf-8') : content;
      const lines = csvContent.split('\n').filter(l => l.trim());

      if (lines.length === 0) continue;

      const firstLine = lines[0] || '';
      if (headers === null && includeHeaders) {
        headers = firstLine.split(delimiter);
        result.push(firstLine);
        lines.shift();
      } else if (includeHeaders) {
        // Skip header row of subsequent files
        lines.shift();
      }

      result.push(...lines);
    }

    return result.join('\n');
  }

  /**
   * Filter CSV by column value
   */
  static filter(
    content: string | Buffer,
    column: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    predicate: (value: any) => boolean,
    options?: { delimiter?: string }
  ): Record<string, any>[] {
    const records = this.parse(content, { delimiter: options?.delimiter });
    return records.filter(record => predicate(record[column]));
  }

  /**
   * Sort CSV by column
   */
  static sort(
    content: string | Buffer,
    column: string,
    order: 'asc' | 'desc' = 'asc',
    options?: { delimiter?: string }
  ): Record<string, any>[] {
    const records = this.parse(content, { delimiter: options?.delimiter });
    return records.sort((a, b) => {
      const aVal = a[column];
      const bVal = b[column];

      if (aVal === bVal) return 0;

      const comparison = aVal < bVal ? -1 : 1;
      return order === 'asc' ? comparison : -comparison;
    });
  }
}

export default CSVConverter;
