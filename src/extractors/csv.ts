/**
 * CSV Extractor
 * Extract structured data, statistics, and schema information from CSV files
 */

import { parse } from 'csv-parse/sync';
import { BaseExtractor } from './base.js';
import type {
  FileFormat,
  InputDataType,
  ExtractionResult,
  CSVExtractionOptions,
  CSVExtractionResult,
  CSVStatistics,
  DocumentMetadata,
} from '../core/types.js';
import { ConvertFileError, ErrorCode } from '../core/errors.js';

/**
 * Default CSV extraction options
 */
const DEFAULT_CSV_OPTIONS: CSVExtractionOptions = {
  delimiter: ',',
  quote: '"',
  escape: '"',
  hasHeaders: true,
  encoding: 'utf-8',
  skipEmptyLines: true,
  trimFields: true,
  transformValues: true,
};

export class CSVExtractor extends BaseExtractor {
  constructor() {
    super('csv');
  }

  getSupportedFormats(): FileFormat[] {
    return ['csv'];
  }

  async extract<T>(
    data: InputDataType,
    options: Record<string, unknown>
  ): Promise<ExtractionResult<T>> {
    const opts: CSVExtractionOptions = { ...DEFAULT_CSV_OPTIONS, ...options };
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);

    try {
      const content = buffer.toString(opts.encoding || 'utf-8');

      // Detect delimiter if not specified
      const delimiter = opts.delimiter || this.detectDelimiter(content);

      // Parse CSV
      const parseOptions = {
        delimiter,
        quote: opts.quote || '"',
        escape: opts.escape || '"',
        columns: opts.hasHeaders,
        skip_empty_lines: opts.skipEmptyLines,
        trim: opts.trimFields,
        relax_quotes: true,
        relax_column_count: true,
      };

      let rows: unknown[][];
      let records: Record<string, unknown>[];
      let headers: string[] | undefined;

      if (opts.hasHeaders) {
        // Parse with headers
        records = parse(content, parseOptions);
        headers = records.length > 0 ? Object.keys(records[0]!) : [];
        rows = records.map(r => headers!.map(h => (r as Record<string, unknown>)[h]));
      } else {
        // Parse without headers
        rows = parse(content, { ...parseOptions, columns: false });
        records = rows.map(row => {
          const obj: Record<string, unknown> = {};
          (row as unknown[]).forEach((val, i) => {
            obj[`column_${i + 1}`] = val;
          });
          return obj;
        });
        headers = rows.length > 0 ? (rows[0] as unknown[]).map((_, i) => `column_${i + 1}`) : [];
      }

      // Apply column filter if specified
      if (opts.columns) {
        const columnFilter = opts.columns as (string | number)[];
        const filteredHeaders = headers.filter(
          (h, i) => columnFilter.includes(h) || columnFilter.includes(i)
        );

        rows = rows.map(row =>
          (row as unknown[]).filter(
            (_, i) => columnFilter.includes(headers![i]!) || columnFilter.includes(i)
          )
        );
        records = records.map(r => {
          const filtered: Record<string, unknown> = {};
          for (const h of filteredHeaders) {
            filtered[h] = (r as Record<string, unknown>)[h];
          }
          return filtered;
        });
        headers = filteredHeaders;
      }

      // Apply max rows if specified
      if (opts.maxRows && opts.maxRows > 0) {
        rows = rows.slice(0, opts.maxRows);
        records = records.slice(0, opts.maxRows);
      }

      // Transform values if enabled
      if (opts.transformValues) {
        records = records.map(r => this.transformRecord(r));
        rows = rows.map(row => (row as unknown[]).map(v => this.transformValue(v)));
      }

      // Calculate statistics
      const statistics = this.calculateStatistics(records, headers);

      const result: CSVExtractionResult['data'] = {
        headers,
        rows: rows as unknown[][],
        records,
        statistics,
      };

      // Document metadata
      const metadata: DocumentMetadata = {
        fileSize: buffer.length,
        customProperties: {
          rowCount: statistics.rowCount,
          columnCount: statistics.columnCount,
          delimiter,
          hasHeaders: opts.hasHeaders,
        },
      };

      return this.createResult(result as T, metadata);
    } catch (error) {
      throw new ConvertFileError(
        ErrorCode.EXTRACTION_FAILED,
        `CSV extraction failed: ${(error as Error).message}`,
        { cause: error as Error }
      );
    }
  }

  /**
   * Detect delimiter from content
   */
  private detectDelimiter(content: string): string {
    const firstLine = content.split('\n')[0] || '';

    const delimiters = [',', ';', '\t', '|'];
    const counts = delimiters.map(d => ({
      delimiter: d,
      count: (firstLine.match(new RegExp(d === '|' ? '\\|' : d, 'g')) || []).length,
    }));

    const best = counts.sort((a, b) => b.count - a.count)[0];
    return best && best.count > 0 ? best.delimiter : ',';
  }

  /**
   * Transform record values to appropriate types
   */
  private transformRecord(record: Record<string, unknown>): Record<string, unknown> {
    const transformed: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(record)) {
      transformed[key] = this.transformValue(value);
    }

    return transformed;
  }

  /**
   * Transform a single value to appropriate type
   */
  private transformValue(value: unknown): unknown {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const strValue = String(value).trim();

    // Check for boolean
    if (strValue.toLowerCase() === 'true') return true;
    if (strValue.toLowerCase() === 'false') return false;

    // Check for number
    if (!isNaN(Number(strValue)) && strValue !== '') {
      return Number(strValue);
    }

    // Check for date (ISO format)
    if (/^\d{4}-\d{2}-\d{2}/.test(strValue)) {
      const date = new Date(strValue);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    // Return as string
    return strValue;
  }

  /**
   * Calculate CSV statistics
   */
  private calculateStatistics(
    records: Record<string, unknown>[],
    headers: string[]
  ): CSVStatistics {
    const rowCount = records.length;
    const columnCount = headers.length;

    let emptyRowCount = 0;
    const columnTypes: Record<string, 'string' | 'number' | 'date' | 'boolean' | 'mixed'> = {};
    const nullCounts: Record<string, number> = {};
    const uniqueValues: Record<string, Set<unknown>> = {};

    // Initialize
    for (const header of headers) {
      columnTypes[header] = 'string';
      nullCounts[header] = 0;
      uniqueValues[header] = new Set();
    }

    // Analyze each record
    for (const record of records) {
      let isEmptyRow = true;

      for (const header of headers) {
        const value = record[header];

        // Track null/empty values
        if (value === null || value === undefined || value === '') {
          nullCounts[header] = (nullCounts[header] || 0) + 1;
        } else {
          isEmptyRow = false;
          uniqueValues[header]?.add(value);
        }
      }

      if (isEmptyRow) {
        emptyRowCount++;
      }
    }

    // Determine column types
    for (const header of headers) {
      const values = Array.from(uniqueValues[header] || []);

      if (values.length === 0) {
        columnTypes[header] = 'string';
        continue;
      }

      const types = new Set<string>();

      for (const value of values) {
        if (typeof value === 'number') types.add('number');
        else if (typeof value === 'boolean') types.add('boolean');
        else if (value instanceof Date) types.add('date');
        else types.add('string');
      }

      if (types.size === 1) {
        columnTypes[header] = types.values().next().value as CSVStatistics['columnTypes'][string];
      } else {
        columnTypes[header] = 'mixed';
      }
    }

    // Calculate unique counts
    const uniqueCounts: Record<string, number> = {};
    for (const header of headers) {
      uniqueCounts[header] = uniqueValues[header]?.size || 0;
    }

    // Calculate duplicate rows
    const rowStrings = records.map(r => JSON.stringify(r));
    const uniqueRows = new Set(rowStrings);
    const duplicateRowCount = rowCount - uniqueRows.size;

    return {
      rowCount,
      columnCount,
      emptyRowCount,
      duplicateRowCount,
      columnTypes,
      nullCounts,
      uniqueCounts,
    };
  }
}

/**
 * CSV extraction utilities
 */
export class CSVExtractorUtils {
  /**
   * Infer schema from CSV data
   */
  static inferSchema(records: Record<string, unknown>[]): Record<
    string,
    {
      type: string;
      nullable: boolean;
      unique: boolean;
      examples: unknown[];
    }
  > {
    if (records.length === 0) return {};

    const schema: ReturnType<typeof CSVExtractorUtils.inferSchema> = {};
    const headers = Object.keys(records[0] || {});

    for (const header of headers) {
      const values = records.map(r => r[header]).filter(v => v !== null && v !== undefined);
      const uniqueValues = new Set(values);
      const types = new Set<string>();

      for (const value of values) {
        types.add(typeof value);
      }

      schema[header] = {
        type: types.size === 1 ? types.values().next().value || 'mixed' : 'mixed',
        nullable: values.length < records.length,
        unique: uniqueValues.size === records.length,
        examples: Array.from(uniqueValues).slice(0, 3),
      };
    }

    return schema;
  }

  /**
   * Validate CSV data against schema
   */
  static validateData(
    records: Record<string, unknown>[],
    schema: Record<string, { type: string; nullable: boolean; required?: boolean }>
  ): { valid: boolean; errors: Array<{ row: number; column: string; message: string }> } {
    const errors: Array<{ row: number; column: string; message: string }> = [];

    records.forEach((record, rowIndex) => {
      for (const [column, constraints] of Object.entries(schema)) {
        const value = record[column];

        // Check required
        if (constraints.required && (value === null || value === undefined || value === '')) {
          errors.push({
            row: rowIndex + 1,
            column,
            message: `Required field is empty`,
          });
          continue;
        }

        // Check nullable
        if (!constraints.nullable && (value === null || value === undefined)) {
          errors.push({
            row: rowIndex + 1,
            column,
            message: `Field cannot be null`,
          });
          continue;
        }

        // Check type
        if (value !== null && value !== undefined) {
          const actualType = typeof value;
          if (constraints.type !== 'mixed' && actualType !== constraints.type) {
            errors.push({
              row: rowIndex + 1,
              column,
              message: `Expected ${constraints.type}, got ${actualType}`,
            });
          }
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Group records by column value
   */
  static groupBy(
    records: Record<string, unknown>[],
    column: string
  ): Map<unknown, Record<string, unknown>[]> {
    const groups = new Map<unknown, Record<string, unknown>[]>();

    for (const record of records) {
      const key = record[column];
      const group = groups.get(key) || [];
      group.push(record);
      groups.set(key, group);
    }

    return groups;
  }

  /**
   * Calculate column statistics for numeric columns
   */
  static calculateNumericStats(
    records: Record<string, unknown>[],
    column: string
  ): {
    count: number;
    sum: number;
    average: number;
    min: number;
    max: number;
    median: number;
    standardDeviation: number;
  } | null {
    const values = records
      .map(r => r[column])
      .filter((v): v is number => typeof v === 'number' && !isNaN(v));

    if (values.length === 0) return null;

    const count = values.length;
    const sum = values.reduce((a, b) => a + b, 0);
    const average = sum / count;
    const min = Math.min(...values);
    const max = Math.max(...values);

    const sorted = [...values].sort((a, b) => a - b);
    const median =
      count % 2 === 0
        ? ((sorted[count / 2 - 1] || 0) + (sorted[count / 2] || 0)) / 2
        : sorted[Math.floor(count / 2)] || 0;

    const squaredDiffs = values.map(v => Math.pow(v - average, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / count;
    const standardDeviation = Math.sqrt(avgSquaredDiff);

    return { count, sum, average, min, max, median, standardDeviation };
  }

  /**
   * Find duplicate rows
   */
  static findDuplicates(records: Record<string, unknown>[]): {
    duplicates: Array<{ indices: number[]; record: Record<string, unknown> }>;
    uniqueCount: number;
    duplicateCount: number;
  } {
    const seen = new Map<string, number[]>();

    records.forEach((record, index) => {
      const key = JSON.stringify(record);
      const indices = seen.get(key) || [];
      indices.push(index);
      seen.set(key, indices);
    });

    const duplicates: Array<{ indices: number[]; record: Record<string, unknown> }> = [];
    let duplicateCount = 0;

    for (const [key, indices] of seen.entries()) {
      if (indices.length > 1) {
        duplicates.push({
          indices,
          record: JSON.parse(key),
        });
        duplicateCount += indices.length - 1;
      }
    }

    return {
      duplicates,
      uniqueCount: records.length - duplicateCount,
      duplicateCount,
    };
  }

  /**
   * Pivot data
   */
  static pivot(
    records: Record<string, unknown>[],
    rowKey: string,
    columnKey: string,
    valueKey: string,
    aggregation: 'sum' | 'count' | 'avg' | 'min' | 'max' = 'sum'
  ): Record<string, Record<string, number>> {
    const result: Record<string, Record<string, number[]>> = {};
    const columns = new Set<string>();

    for (const record of records) {
      const row = String(record[rowKey]);
      const col = String(record[columnKey]);
      const value = Number(record[valueKey]) || 0;

      columns.add(col);

      if (!result[row]) {
        result[row] = {};
      }

      if (!result[row]![col]) {
        result[row]![col] = [];
      }

      result[row]![col]!.push(value);
    }

    // Apply aggregation
    const pivoted: Record<string, Record<string, number>> = {};

    for (const [row, cols] of Object.entries(result)) {
      pivoted[row] = {};

      for (const col of columns) {
        const values = cols[col] || [0];

        switch (aggregation) {
          case 'sum':
            pivoted[row]![col] = values.reduce((a, b) => a + b, 0);
            break;
          case 'count':
            pivoted[row]![col] = values.length;
            break;
          case 'avg':
            pivoted[row]![col] = values.reduce((a, b) => a + b, 0) / values.length;
            break;
          case 'min':
            pivoted[row]![col] = Math.min(...values);
            break;
          case 'max':
            pivoted[row]![col] = Math.max(...values);
            break;
        }
      }
    }

    return pivoted;
  }
}

export { CSVExtractor as default };
