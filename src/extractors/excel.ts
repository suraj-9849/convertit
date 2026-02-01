/**
 * Excel Extractor
 * Extract data, formulas, styles, charts, images, and metadata from XLSX files
 */

import ExcelJS from 'exceljs';
import { BaseExtractor } from './base.js';
import type {
  FileFormat,
  InputDataType,
  ExtractionResult,
  ExcelExtractionOptions,
  ExcelExtractionResult,
  ExtractedSheet,
  ExtractedTable,
  ExtractedChart,
  ExtractedImage,
  ExtractedName,
  ExtractedCellStyle,
  ExtractedCellComment,
  ExtractedConditionalFormat,
  ExtractedDataValidation,
  MergedCell,
  DocumentMetadata,
  TableRow as ExtractedTableRow,
  TableCell as ExtractedTableCell,
} from '../core/types.js';
import { ConvertFileError, ErrorCode } from '../core/errors.js';
import { generateId } from '../utils/helpers.js';

/**
 * Default Excel extraction options
 */
const DEFAULT_EXCEL_OPTIONS: ExcelExtractionOptions = {
  extractData: true,
  extractFormulas: true,
  extractStyles: true,
  extractCharts: true,
  extractImages: true,
  extractComments: true,
  extractNames: true,
  extractValidation: true,
  extractConditionalFormatting: true,
  extractMetadata: true,
  sheets: 'all',
  includeHiddenSheets: false,
  includeHiddenRows: false,
  includeHiddenColumns: false,
  evaluateFormulas: true,
  dateFormat: 'YYYY-MM-DD',
  numberFormat: '0.00',
};

export class ExcelExtractor extends BaseExtractor {
  constructor() {
    super('xlsx');
  }

  getSupportedFormats(): FileFormat[] {
    return ['excel', 'xlsx'];
  }

  async extract<T>(
    data: InputDataType,
    options: Record<string, unknown>
  ): Promise<ExtractionResult<T>> {
    const opts: ExcelExtractionOptions = { ...DEFAULT_EXCEL_OPTIONS, ...options };
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);

    try {
      const workbook = new ExcelJS.Workbook();
      const bufferData = buffer instanceof Buffer ? buffer : Buffer.from(buffer);
      await workbook.xlsx.load(bufferData as any);

      const result: ExcelExtractionResult['data'] = {
        sheets: [],
      };
      const warnings: string[] = [];

      // Extract metadata
      const metadata = this.extractMetadata(workbook);

      // Get sheets to process
      const sheetsToProcess = this.getSheetsToProcess(workbook, opts);

      // Extract sheets
      for (const worksheet of sheetsToProcess) {
        try {
          const sheet = await this.extractSheet(worksheet, opts);
          result.sheets.push(sheet);
        } catch (error) {
          warnings.push(`Sheet "${worksheet.name}" extraction failed: ${(error as Error).message}`);
        }
      }

      // Extract charts
      if (opts.extractCharts) {
        try {
          result.charts = this.extractCharts(workbook);
        } catch (error) {
          warnings.push(`Chart extraction failed: ${(error as Error).message}`);
        }
      }

      // Extract images
      if (opts.extractImages) {
        try {
          result.images = await this.extractImages(workbook);
        } catch (error) {
          warnings.push(`Image extraction failed: ${(error as Error).message}`);
        }
      }

      // Extract defined names
      if (opts.extractNames) {
        try {
          result.names = this.extractNames(workbook);
        } catch (error) {
          warnings.push(`Names extraction failed: ${(error as Error).message}`);
        }
      }

      // Extract styles
      if (opts.extractStyles) {
        try {
          result.styles = this.extractStyles(workbook);
        } catch (error) {
          warnings.push(`Style extraction failed: ${(error as Error).message}`);
        }
      }

      return this.createResult(result as T, metadata, {
        warnings: warnings.length > 0 ? warnings : undefined,
      });
    } catch (error) {
      throw new ConvertFileError(
        ErrorCode.EXTRACTION_FAILED,
        `Excel extraction failed: ${(error as Error).message}`,
        { cause: error as Error }
      );
    }
  }

  /**
   * Extract workbook metadata
   */
  private extractMetadata(workbook: ExcelJS.Workbook): DocumentMetadata {
    return {
      title: workbook.title || undefined,
      author: workbook.creator || undefined,
      subject: workbook.subject || undefined,
      keywords: workbook.keywords ? [workbook.keywords] : undefined,
      creationDate: workbook.created,
      modificationDate: workbook.modified,
      creator: workbook.lastModifiedBy || undefined,
      pageCount: workbook.worksheets.length,
      customProperties: {
        company: workbook.company,
        manager: workbook.manager,
        category: workbook.category,
      },
    };
  }

  /**
   * Get sheets to process based on options
   */
  private getSheetsToProcess(
    workbook: ExcelJS.Workbook,
    opts: ExcelExtractionOptions
  ): ExcelJS.Worksheet[] {
    let sheets = workbook.worksheets;

    // Filter by sheet names/indices
    if (opts.sheets !== 'all') {
      const sheetFilter = opts.sheets as (string | number)[];
      sheets = sheets.filter(
        (ws, index) => sheetFilter.includes(ws.name) || sheetFilter.includes(index)
      );
    }

    // Filter hidden sheets
    if (!opts.includeHiddenSheets) {
      sheets = sheets.filter(ws => ws.state === 'visible');
    }

    return sheets;
  }

  /**
   * Extract data from a worksheet
   */
  private async extractSheet(
    worksheet: ExcelJS.Worksheet,
    opts: ExcelExtractionOptions
  ): Promise<ExtractedSheet> {
    const rows: ExtractedTableRow[] = [];
    const comments: ExtractedCellComment[] = [];
    const conditionalFormats: ExtractedConditionalFormat[] = [];
    const dataValidations: ExtractedDataValidation[] = [];
    const mergedCells: MergedCell[] = [];

    let maxColumns = 0;

    // Extract merged cells
    if (worksheet.hasMerges) {
      const merges = (worksheet as any)._merges || {};
      for (const [, range] of Object.entries(merges) as [string, any][]) {
        if (range && range.model) {
          mergedCells.push({
            startRow: range.model.top,
            startColumn: range.model.left,
            endRow: range.model.bottom,
            endColumn: range.model.right,
          });
        }
      }
    }

    // Extract rows and cells
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      // Skip hidden rows if option is set
      if (!opts.includeHiddenRows && row.hidden) return;

      const cells: ExtractedTableCell[] = [];

      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        // Skip hidden columns if option is set
        const column = worksheet.getColumn(colNumber);
        if (!opts.includeHiddenColumns && column.hidden) return;

        const cellValue = this.getCellValue(cell, opts);
        const cellFormula =
          opts.extractFormulas && cell.formula
            ? typeof cell.formula === 'string'
              ? cell.formula
              : (cell.formula as { formula: string }).formula
            : undefined;
        cells.push({
          content: String(cellValue ?? ''),
          value: cellValue,
          columnIndex: colNumber - 1,
          formula: cellFormula,
          dataType: this.detectCellDataType(cell),
        });

        // Extract comments
        if (opts.extractComments && cell.note) {
          const note =
            typeof cell.note === 'string'
              ? cell.note
              : cell.note.texts?.map(t => (typeof t === 'string' ? t : t.text)).join('');
          if (note) {
            comments.push({
              cell: cell.address,
              content: note,
            });
          }
        }

        maxColumns = Math.max(maxColumns, colNumber);
      });

      rows.push({
        cells,
        rowIndex: rowNumber - 1,
        isHeader: rowNumber === 1,
      });
    });

    // Extract conditional formatting
    if (opts.extractConditionalFormatting) {
      const cfRules = (worksheet as any).conditionalFormattings;
      if (cfRules) {
        for (const cf of cfRules) {
          if (cf.rules) {
            for (const rule of cf.rules) {
              conditionalFormats.push({
                range: cf.ref,
                type: rule.type || 'expression',
                priority: rule.priority || 0,
                formula: rule.formulae?.[0],
              });
            }
          }
        }
      }
    }

    // Extract data validations
    if (opts.extractValidation) {
      const validations = (worksheet as any).dataValidations?.model;
      if (validations) {
        for (const [address, validation] of Object.entries(validations) as [string, any][]) {
          dataValidations.push({
            range: address,
            type: validation.type || 'custom',
            operator: validation.operator,
            formula1: validation.formulae?.[0],
            formula2: validation.formulae?.[1],
            showDropdown: validation.showDropDown !== false,
            showErrorMessage: validation.showErrorMessage !== false,
            errorMessage: validation.error,
          });
        }
      }
    }

    // Extract freeze pane
    let freezePane: { row: number; column: number } | undefined;
    const views = worksheet.views;
    if (views && views.length > 0) {
      const view = views[0] as { xSplit?: number; ySplit?: number } | undefined;
      if (view && (view.xSplit || view.ySplit)) {
        freezePane = {
          row: view.ySplit || 0,
          column: view.xSplit || 0,
        };
      }
    }

    // Extract auto filter
    let autoFilter: { range: string } | undefined;
    if (worksheet.autoFilter) {
      const af = worksheet.autoFilter;
      if (typeof af === 'string') {
        autoFilter = { range: af };
      } else if (af.from && af.to) {
        autoFilter = { range: `${af.from}:${af.to}` };
      }
    }

    const tableData: ExtractedTable = {
      id: generateId(),
      headers: rows[0]?.cells.map(c => c.content),
      rows,
      columnCount: maxColumns,
      rowCount: rows.length,
    };

    return {
      id: generateId(),
      name: worksheet.name,
      index: worksheet.id - 1,
      isHidden: worksheet.state !== 'visible',
      data: tableData,
      mergedCells: mergedCells.length > 0 ? mergedCells : undefined,
      comments: comments.length > 0 ? comments : undefined,
      conditionalFormats: conditionalFormats.length > 0 ? conditionalFormats : undefined,
      dataValidations: dataValidations.length > 0 ? dataValidations : undefined,
      freezePane,
      autoFilter,
    };
  }

  /**
   * Get cell value with proper type handling
   */
  private getCellValue(cell: ExcelJS.Cell, opts: ExcelExtractionOptions): unknown {
    if (cell.value === null || cell.value === undefined) {
      return null;
    }

    // Handle formula results
    if (cell.formula && opts.evaluateFormulas) {
      const result = cell.result;
      if (result !== undefined) {
        return this.formatValue(result, cell.type, opts);
      }
    }

    return this.formatValue(cell.value, cell.type, opts);
  }

  /**
   * Format cell value based on type
   */
  private formatValue(
    value: unknown,
    _type: ExcelJS.ValueType,
    _opts: ExcelExtractionOptions
  ): unknown {
    if (value === null || value === undefined) return null;

    // Handle rich text
    if (typeof value === 'object' && 'richText' in (value as object)) {
      return (value as { richText: Array<{ text: string }> }).richText.map(t => t.text).join('');
    }

    // Handle dates
    if (value instanceof Date) {
      return value.toISOString().split('T')[0]; // Simple date format
    }

    // Handle errors
    if (typeof value === 'object' && 'error' in (value as object)) {
      return `#${(value as { error: string }).error}`;
    }

    // Handle hyperlinks
    if (typeof value === 'object' && 'hyperlink' in (value as object)) {
      return (
        (value as { text?: string; hyperlink: string }).text ||
        (value as { hyperlink: string }).hyperlink
      );
    }

    return value;
  }

  /**
   * Detect cell data type
   */
  private detectCellDataType(cell: ExcelJS.Cell): ExtractedTableCell['dataType'] {
    if (cell.formula) return 'formula';

    switch (cell.type) {
      case ExcelJS.ValueType.Number:
        return 'number';
      case ExcelJS.ValueType.Date:
        return 'date';
      case ExcelJS.ValueType.Boolean:
        return 'boolean';
      case ExcelJS.ValueType.Error:
        return 'error';
      case ExcelJS.ValueType.Null:
        return 'empty';
      case ExcelJS.ValueType.String:
      case ExcelJS.ValueType.RichText:
      default:
        return 'string';
    }
  }

  /**
   * Extract charts from workbook
   */
  private extractCharts(workbook: ExcelJS.Workbook): ExtractedChart[] {
    const charts: ExtractedChart[] = [];

    // ExcelJS has limited chart support, but we can extract basic info
    for (const worksheet of workbook.worksheets) {
      const drawings = (worksheet as any).drawings;
      if (!drawings) continue;

      for (const drawing of drawings) {
        if (drawing.type === 'chart') {
          charts.push({
            id: generateId(),
            name: drawing.name || 'Chart',
            type: drawing.chartType || 'unknown',
            sheet: worksheet.name,
            position: {
              x: drawing.from?.col || 0,
              y: drawing.from?.row || 0,
              width: (drawing.to?.col || 0) - (drawing.from?.col || 0),
              height: (drawing.to?.row || 0) - (drawing.from?.row || 0),
            },
            data: {
              series: [],
            },
          });
        }
      }
    }

    return charts;
  }

  /**
   * Extract images from workbook
   */
  private async extractImages(workbook: ExcelJS.Workbook): Promise<ExtractedImage[]> {
    const images: ExtractedImage[] = [];

    for (const worksheet of workbook.worksheets) {
      const wsImages = worksheet.getImages();

      for (const image of wsImages) {
        const imageData = workbook.getImage(
          typeof image.imageId === 'number' ? image.imageId : parseInt(image.imageId as any)
        );

        if (imageData && imageData.buffer) {
          const extension = imageData.extension || 'png';

          images.push({
            id: generateId(),
            data: Buffer.from(imageData.buffer as ArrayBuffer),
            format: extension as ExtractedImage['format'],
            width: 0, // Would need image processing to get dimensions
            height: 0,
          });
        }
      }
    }

    return images;
  }

  /**
   * Extract defined names from workbook
   */
  private extractNames(workbook: ExcelJS.Workbook): ExtractedName[] {
    const names: ExtractedName[] = [];

    // Access defined names through workbook model
    const definedNames = (workbook as any).definedNames;
    if (definedNames) {
      const nameEntries = definedNames.model || {};

      for (const [name, definition] of Object.entries(nameEntries) as [string, any][]) {
        if (definition && definition.ranges) {
          for (const range of definition.ranges) {
            names.push({
              name,
              value: range.range || range,
              scope: range.sheetName || 'workbook',
            });
          }
        }
      }
    }

    return names;
  }

  /**
   * Extract styles from workbook
   */
  private extractStyles(workbook: ExcelJS.Workbook): ExtractedCellStyle[] {
    const styles: ExtractedCellStyle[] = [];
    const styleMap = new Map<string, ExtractedCellStyle>();

    for (const worksheet of workbook.worksheets) {
      worksheet.eachRow(row => {
        row.eachCell(cell => {
          const style = cell.style;
          if (!style) return;

          const styleKey = JSON.stringify(style);
          if (styleMap.has(styleKey)) return;

          const extractedStyle: ExtractedCellStyle = {
            id: generateId(),
          };

          if (style.font) {
            extractedStyle.font = {
              family: style.font.name,
              size: style.font.size,
              bold: style.font.bold,
              italic: style.font.italic,
              underline: !!style.font.underline,
              color: typeof style.font.color === 'object' ? style.font.color.argb : undefined,
            };
          }

          if (style.fill) {
            const fill = style.fill;
            if ('fgColor' in fill) {
              extractedStyle.fill = {
                type: fill.type || 'pattern',
                color: typeof fill.fgColor === 'object' ? fill.fgColor.argb : undefined,
              };
            }
          }

          if (style.border) {
            extractedStyle.border = {};
            for (const side of ['top', 'bottom', 'left', 'right'] as const) {
              if (style.border[side]) {
                const borderStyle = style.border[side]!.style || 'thin';
                const supportedStyles = new Set([
                  'thin',
                  'medium',
                  'thick',
                  'dotted',
                  'dashed',
                  'double',
                  'hair',
                  'mediumDashed',
                  'dashDot',
                  'mediumDashDot',
                  'dashDotDot',
                  'slantDashDot',
                ]);
                const finalStyle = supportedStyles.has(borderStyle) ? borderStyle : 'thin';
                extractedStyle.border[side] = {
                  style: finalStyle,
                  color:
                    typeof style.border[side]!.color === 'object'
                      ? style.border[side]!.color.argb
                      : undefined,
                };
              }
            }
          }

          if (style.alignment) {
            extractedStyle.alignment = { ...style.alignment };
          }

          if (style.numFmt) {
            extractedStyle.numFmt = style.numFmt;
          }

          styleMap.set(styleKey, extractedStyle);
          styles.push(extractedStyle);
        });
      });
    }

    return styles;
  }
}

/**
 * Excel extraction utilities
 */
export class ExcelExtractorUtils {
  /**
   * Convert column number to letter (1 -> A, 27 -> AA, etc.)
   */
  static columnToLetter(column: number): string {
    let result = '';
    while (column > 0) {
      const remainder = (column - 1) % 26;
      result = String.fromCharCode(65 + remainder) + result;
      column = Math.floor((column - 1) / 26);
    }
    return result;
  }

  /**
   * Convert column letter to number (A -> 1, AA -> 27, etc.)
   */
  static letterToColumn(letter: string): number {
    let result = 0;
    for (let i = 0; i < letter.length; i++) {
      result = result * 26 + (letter.charCodeAt(i) - 64);
    }
    return result;
  }

  /**
   * Parse cell address (A1 -> { column: 1, row: 1 })
   */
  static parseCellAddress(address: string): { column: number; row: number } | null {
    const match = address.match(/^([A-Z]+)(\d+)$/i);
    if (!match) return null;

    return {
      column: this.letterToColumn(match[1]!.toUpperCase()),
      row: parseInt(match[2]!),
    };
  }

  /**
   * Create cell address from column and row
   */
  static createCellAddress(column: number, row: number): string {
    return `${this.columnToLetter(column)}${row}`;
  }

  /**
   * Parse range (A1:B2 -> { start: { column: 1, row: 1 }, end: { column: 2, row: 2 } })
   */
  static parseRange(range: string): {
    start: { column: number; row: number };
    end: { column: number; row: number };
  } | null {
    const parts = range.split(':');
    if (parts.length !== 2) return null;

    const start = this.parseCellAddress(parts[0]!);
    const end = this.parseCellAddress(parts[1]!);

    if (!start || !end) return null;

    return { start, end };
  }

  /**
   * Calculate statistics for a column of numbers
   */
  static calculateColumnStats(values: number[]): {
    count: number;
    sum: number;
    average: number;
    min: number;
    max: number;
    median: number;
    standardDeviation: number;
  } {
    const validValues = values.filter(v => !isNaN(v) && isFinite(v));
    const count = validValues.length;

    if (count === 0) {
      return { count: 0, sum: 0, average: 0, min: 0, max: 0, median: 0, standardDeviation: 0 };
    }

    const sum = validValues.reduce((a, b) => a + b, 0);
    const average = sum / count;
    const min = Math.min(...validValues);
    const max = Math.max(...validValues);

    // Calculate median
    const sorted = [...validValues].sort((a, b) => a - b);
    const median =
      count % 2 === 0
        ? ((sorted[count / 2 - 1] || 0) + (sorted[count / 2] || 0)) / 2
        : sorted[Math.floor(count / 2)] || 0;

    // Calculate standard deviation
    const squaredDiffs = validValues.map(v => Math.pow(v - average, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / count;
    const standardDeviation = Math.sqrt(avgSquaredDiff);

    return { count, sum, average, min, max, median, standardDeviation };
  }
}

export { ExcelExtractor as default };
