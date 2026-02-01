/**
 * Excel converter with advanced styling and conditional formatting.
 */

import ExcelJS from 'exceljs';
import { BaseConverter } from './base.js';
import type { InputDataType, ConvertFileOptions, FileFormat, ExcelOptions } from '../core/types.js';
import { ConvertFileError, ErrorCode } from '../core/errors.js';
import { ExcelStyleEngine } from './excel-styles.js';

export class ExcelConverter extends BaseConverter {
  constructor() {
    super('xlsx');
  }

  getSupportedInputFormats(): FileFormat[] {
    return ['json', 'csv', 'txt', 'xml'];
  }

  async convert(data: InputDataType, options: ConvertFileOptions): Promise<Buffer> {
    const excelOptions = options.excel || {};

    // Handle different input types
    if (Array.isArray(data)) {
      return this.createFromArray(data, excelOptions);
    }

    if (typeof data === 'object' && !Buffer.isBuffer(data)) {
      return this.createFromObject(data as Record<string, any>, excelOptions);
    }

    if (typeof data === 'string') {
      return this.createFromString(data, excelOptions);
    }

    if (Buffer.isBuffer(data)) {
      const text = data.toString('utf-8');
      return this.createFromString(text, excelOptions);
    }

    throw new ConvertFileError(ErrorCode.INVALID_INPUT, 'Unable to convert input data to Excel');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async createFromArray(data: any[], excelOptions: ExcelOptions): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();

    // Set workbook properties
    workbook.creator = excelOptions.metadata?.author || 'Convertit';
    workbook.title = excelOptions.metadata?.title || 'Workbook';
    workbook.company = excelOptions.metadata?.company || '';
    workbook.description = excelOptions.metadata?.description || '';
    workbook.created = new Date();

    if (data.length === 0) {
      const worksheet = workbook.addWorksheet(excelOptions.sheetName || 'Sheet1');
      worksheet.addRow(['No data']);
      return Buffer.from(await workbook.xlsx.writeBuffer());
    }

    // Check if we have multiple sheets configuration
    if (excelOptions.sheets && excelOptions.sheets.length > 0) {
      for (const sheetConfig of excelOptions.sheets) {
        await this.createSheet(workbook, sheetConfig.name, sheetConfig.data, {
          ...excelOptions,
          headers: sheetConfig.headers,
        });
      }
    } else {
      // Single sheet from data
      await this.createSheet(workbook, excelOptions.sheetName || 'Sheet1', data, excelOptions);
    }

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  private async createFromObject(
    data: Record<string, any>,
    excelOptions: ExcelOptions
  ): Promise<Buffer> {
    // Convert object to array format
    if (Array.isArray(Object.values(data)[0])) {
      // If values are arrays, treat keys as sheet names
      const workbook = new ExcelJS.Workbook();

      for (const [sheetName, sheetData] of Object.entries(data)) {
        if (Array.isArray(sheetData)) {
          await this.createSheet(workbook, sheetName, sheetData, excelOptions);
        }
      }

      return Buffer.from(await workbook.xlsx.writeBuffer());
    }

    // Single object - convert to key-value table
    const arrayData = Object.entries(data).map(([key, value]) => ({
      Property: key,
      Value: typeof value === 'object' ? JSON.stringify(value) : String(value),
    }));

    return this.createFromArray(arrayData, excelOptions);
  }

  private async createFromString(text: string, excelOptions: ExcelOptions): Promise<Buffer> {
    // Try to parse as JSON first
    try {
      const jsonData = JSON.parse(text);
      if (Array.isArray(jsonData)) {
        return this.createFromArray(jsonData, excelOptions);
      }
      return this.createFromObject(jsonData, excelOptions);
    } catch {
      // Not JSON, try CSV-like parsing
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length === 0) {
        return this.createFromArray([{ Text: 'Empty content' }], excelOptions);
      }

      // Detect delimiter
      const firstLine = lines[0] || '';
      const delimiter = this.detectDelimiter(firstLine);

      // Parse as delimited data
      const headers = firstLine.split(delimiter).map(h => h.trim());
      const data = lines.slice(1).map(line => {
        const values = line.split(delimiter);
        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
          row[header] = (values[index] || '').trim();
        });
        return row;
      });

      return this.createFromArray(data.length > 0 ? data : [{ Text: text }], excelOptions);
    }
  }

  private async createSheet(
    workbook: ExcelJS.Workbook,
    sheetName: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any[],
    options: ExcelOptions
  ): Promise<void> {
    const worksheet = workbook.addWorksheet(sheetName);

    if (data.length === 0) {
      worksheet.addRow(['No data']);
      return;
    }

    const isObjectArray = typeof data[0] === 'object' && data[0] !== null;
    const headers = options.headers || (isObjectArray ? Object.keys(data[0]) : ['Value']);

    // Add header row
    const headerRow = worksheet.addRow(headers);
    this.styleHeaderRow(headerRow, options);

    // Add data rows
    if (isObjectArray) {
      data.forEach((item, index) => {
        const rowData = headers.map(header => {
          const value = item[header];
          if (value === null || value === undefined) return '';
          if (typeof value === 'object') return JSON.stringify(value);
          return value;
        });
        const row = worksheet.addRow(rowData);
        this.styleDataRow(row, index, options);
      });
    } else {
      data.forEach((item, index) => {
        const row = worksheet.addRow([item]);
        this.styleDataRow(row, index, options);
      });
    }

    // Set column widths
    if (options.columnWidths) {
      options.columnWidths.forEach((width, index) => {
        const column = worksheet.getColumn(index + 1);
        column.width = width;
      });
    } else {
      // Auto-fit columns
      worksheet.columns.forEach(column => {
        let maxLength = 10;
        column.eachCell?.({ includeEmpty: true }, cell => {
          const cellLength = cell.value ? String(cell.value).length : 0;
          maxLength = Math.max(maxLength, cellLength);
        });
        column.width = Math.min(maxLength + 2, 50);
      });
    }

    // Add auto filter
    if (options.autoFilter) {
      worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: headers.length },
      };
    }

    // Freeze pane
    if (options.freezePane) {
      worksheet.views = [
        {
          state: 'frozen',
          xSplit: options.freezePane.column || 0,
          ySplit: options.freezePane.row || 1,
        },
      ];
    }

    // Add formulas
    if (options.formulas) {
      for (const formula of options.formulas) {
        const cell = worksheet.getCell(formula.cell);
        cell.value = { formula: formula.formula };
      }
    }

    if (options.conditionalFormatting || options.rowStyles || options.cellStyles) {
      const styleEngine = new ExcelStyleEngine(worksheet, options, data);
      styleEngine.applyAllStyles();
    }

    // Apply protection
    if (options.protection) {
      await worksheet.protect(options.protection.password || '', {
        selectLockedCells: true,
        selectUnlockedCells: true,
        formatCells: !options.protection.lockCells,
        formatColumns: !options.protection.lockCells,
        formatRows: !options.protection.lockCells,
      });
    }
  }

  private styleHeaderRow(row: ExcelJS.Row, options: ExcelOptions): void {
    const headerStyle = options.style?.headerStyle;

    row.eachCell(cell => {
      cell.font = {
        bold: true,
        color: { argb: (headerStyle?.font?.color || '#FFFFFF').replace('#', '') },
        name: headerStyle?.font?.family || 'Calibri',
        size: headerStyle?.font?.size || 11,
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: (headerStyle?.fill || '4472C4').replace('#', '') },
      };
      cell.alignment = {
        horizontal: headerStyle?.alignment || 'center',
        vertical: 'middle',
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    row.height = 20;
  }

  private styleDataRow(row: ExcelJS.Row, index: number, options: ExcelOptions): void {
    const dataStyle = options.style?.dataStyle;

    row.eachCell(cell => {
      if (dataStyle?.font) {
        cell.font = {
          name: dataStyle.font.family || 'Calibri',
          size: dataStyle.font.size || 11,
          color: dataStyle.font.color ? { argb: dataStyle.font.color.replace('#', '') } : undefined,
        };
      }

      if (dataStyle?.alternateRowFill && index % 2 === 1) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: dataStyle.alternateRowFill.replace('#', '') },
        };
      }

      cell.border = {
        top: { style: 'thin', color: { argb: 'D9D9D9' } },
        left: { style: 'thin', color: { argb: 'D9D9D9' } },
        bottom: { style: 'thin', color: { argb: 'D9D9D9' } },
        right: { style: 'thin', color: { argb: 'D9D9D9' } },
      };

      cell.alignment = {
        vertical: 'middle',
      };
    });
  }

  private detectDelimiter(line: string): string {
    const delimiters = [',', ';', '\t', '|'];
    let maxCount = 0;
    let bestDelimiter = ',';

    for (const delimiter of delimiters) {
      const count = (line.match(new RegExp(delimiter === '|' ? '\\|' : delimiter, 'g')) || [])
        .length;
      if (count > maxCount) {
        maxCount = count;
        bestDelimiter = delimiter;
      }
    }

    return bestDelimiter;
  }
}

/**
 * Excel Utilities
 */
export class ExcelUtils {
  /**
   * Read Excel file and return data
   */
  static async read(file: Buffer): Promise<any[][]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file as unknown as ExcelJS.Buffer);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any[][] = [];
    const worksheet = workbook.worksheets[0];

    worksheet?.eachRow(row => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rowData: any[] = [];
      row.eachCell({ includeEmpty: true }, cell => {
        rowData.push(cell.value);
      });
      result.push(rowData);
    });

    return result;
  }

  /**
   * Read Excel file and return as JSON objects
   */
  static async readAsJson(file: Buffer): Promise<Record<string, any>[]> {
    const data = await this.read(file);

    if (data.length < 2) {
      return [];
    }

    const headers = data[0] as string[];
    const rows = data.slice(1);

    return rows.map(row => {
      const obj: Record<string, any> = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });
  }

  /**
   * Get sheet names from Excel file
   */
  static async getSheetNames(file: Buffer): Promise<string[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file as unknown as ExcelJS.Buffer);
    return workbook.worksheets.map(ws => ws.name);
  }

  /**
   * Merge multiple Excel files
   */
  static async merge(files: Buffer[], outputSheetName?: string): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const mergedSheet = workbook.addWorksheet(outputSheetName || 'Merged');

    let headersAdded = false;

    for (const file of files) {
      const sourceWorkbook = new ExcelJS.Workbook();
      await sourceWorkbook.xlsx.load(file as unknown as ExcelJS.Buffer);

      const sourceSheet = sourceWorkbook.worksheets[0];
      if (!sourceSheet) continue;

      sourceSheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
          // Handle headers
          if (!headersAdded) {
            mergedSheet.addRow(row.values);
            headersAdded = true;
          }
        } else {
          mergedSheet.addRow(row.values);
        }
      });
    }

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }
}

export default ExcelConverter;
