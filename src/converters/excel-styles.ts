/**
 * Excel styling engine for conditional formatting, row styles, and cell styles.
 */

import type { Worksheet, Cell } from 'exceljs';
import type {
  ExcelOptions,
  ConditionalFormattingRule,
  RowStyleRule,
  CellStyleRule,
  CellStyle,
  ComparisonOperator,
} from '../core/types.js';

export class ExcelStyleEngine {
  private worksheet: Worksheet;
  private options: ExcelOptions;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private data: any[];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(worksheet: Worksheet, options: ExcelOptions, data: any[]) {
    this.worksheet = worksheet;
    this.options = options;
    this.data = data;
  }

  applyAllStyles(): void {
    if (this.options.rowStyles) {
      this.applyRowStyles(this.options.rowStyles);
    }
    if (this.options.cellStyles) {
      this.applyCellStyles(this.options.cellStyles);
    }
    if (this.options.conditionalFormatting) {
      this.applyConditionalFormatting(this.options.conditionalFormatting);
    }
  }

  private applyRowStyles(rules: RowStyleRule[]): void {
    const dataStartRow = 2;
    const totalRows = this.data.length;

    for (const rule of rules) {
      for (let i = 0; i < totalRows; i++) {
        const rowIndex = dataStartRow + i;
        const rowData = this.data[i];

        if (this.evaluateRowCondition(rule.condition, rowData, i)) {
          this.applyStyleToRow(rowIndex, rule.style);
        }
      }
    }
  }

  private evaluateRowCondition(
    condition: RowStyleRule['condition'],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rowData: any,
    rowIndex: number
  ): boolean {
    switch (condition.type) {
      case 'even':
        return rowIndex % 2 === 0;
      case 'odd':
        return rowIndex % 2 === 1;
      case 'every': {
        const offset = condition.offset || 0;
        return (rowIndex - offset) % condition.n === 0;
      }
      case 'range':
        return rowIndex >= condition.start && rowIndex <= condition.end;
      case 'custom': {
        const dataArray = Array.isArray(rowData) ? rowData : Object.values(rowData || {});
        return condition.predicate(dataArray, rowIndex);
      }
      case 'columnValue':
        return this.evaluateColumnCondition(rowData, condition);
      default:
        return false;
    }
  }

  private evaluateColumnCondition(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rowData: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    condition: { column: string | number; operator: ComparisonOperator; value: any }
  ): boolean {
    const cellValue =
      typeof condition.column === 'number'
        ? Array.isArray(rowData)
          ? rowData[condition.column]
          : Object.values(rowData)[condition.column]
        : rowData[condition.column];

    return this.compareValues(cellValue, condition.operator, condition.value);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private compareValues(cellValue: any, operator: ComparisonOperator, compareValue: any): boolean {
    // Handle null/undefined
    if (cellValue === null || cellValue === undefined) {
      if (operator === 'isEmpty') return true;
      if (operator === 'isNotEmpty') return false;
      cellValue = '';
    }

    switch (operator) {
      case 'equal':
        return cellValue == compareValue;
      case 'notEqual':
        return cellValue != compareValue;
      case 'greaterThan':
        return Number(cellValue) > Number(compareValue);
      case 'lessThan':
        return Number(cellValue) < Number(compareValue);
      case 'greaterThanOrEqual':
        return Number(cellValue) >= Number(compareValue);
      case 'lessThanOrEqual':
        return Number(cellValue) <= Number(compareValue);
      case 'contains':
        return String(cellValue).toLowerCase().includes(String(compareValue).toLowerCase());
      case 'notContains':
        return !String(cellValue).toLowerCase().includes(String(compareValue).toLowerCase());
      case 'startsWith':
        return String(cellValue).toLowerCase().startsWith(String(compareValue).toLowerCase());
      case 'endsWith':
        return String(cellValue).toLowerCase().endsWith(String(compareValue).toLowerCase());
      case 'isEmpty':
        return cellValue === '' || cellValue === null || cellValue === undefined;
      case 'isNotEmpty':
        return cellValue !== '' && cellValue !== null && cellValue !== undefined;
      default:
        return false;
    }
  }

  private applyStyleToRow(rowIndex: number, style: CellStyle): void {
    const row = this.worksheet.getRow(rowIndex);
    row.eachCell({ includeEmpty: true }, cell => {
      this.applyCellStyle(cell, style);
    });
  }

  private applyCellStyles(rules: CellStyleRule[]): void {
    for (const rule of rules) {
      const cells = this.parseCellTarget(rule.target);

      for (const cellRef of cells) {
        const cell = this.worksheet.getCell(cellRef);

        if (rule.condition) {
          if (this.compareValues(cell.value, rule.condition.operator, rule.condition.value)) {
            this.applyCellStyle(cell, rule.style);
          }
        } else {
          this.applyCellStyle(cell, rule.style);
        }
      }
    }
  }

  private parseCellTarget(target: string): string[] {
    const cells: string[] = [];

    // Check if it's a range (e.g., 'A1:B5')
    if (target.includes(':')) {
      const [start, end] = target.split(':');
      if (!start || !end) return cells;

      const startCol = this.columnLetterToNumber(start.replace(/[0-9]/g, ''));
      const endCol = this.columnLetterToNumber(end.replace(/[0-9]/g, ''));
      const startRow = parseInt(start.replace(/[A-Z]/gi, ''), 10) || 1;
      const endRow = parseInt(end.replace(/[A-Z]/gi, ''), 10) || this.data.length + 1;

      for (let row = startRow; row <= endRow; row++) {
        for (let col = startCol; col <= endCol; col++) {
          cells.push(`${this.columnNumberToLetter(col)}${row}`);
        }
      }
    }
    // Check if it's just a column (e.g., 'A')
    else if (/^[A-Z]+$/i.test(target)) {
      for (let row = 1; row <= this.data.length + 1; row++) {
        cells.push(`${target}${row}`);
      }
    }
    // Single cell
    else {
      cells.push(target);
    }

    return cells;
  }

  private applyConditionalFormatting(rules: ConditionalFormattingRule[]): void {
    const dataStartRow = 2;
    const totalRows = this.data.length;
    const totalCols = this.getColumnCount();

    for (const rule of rules) {
      const range =
        rule.range ||
        `A${dataStartRow}:${this.columnNumberToLetter(totalCols)}${dataStartRow + totalRows - 1}`;
      if (rule.type === 'cellValue' && rule.condition) {
        this.applyValueBasedFormatting(range, rule);
      } else if (rule.type === 'expression' && rule.condition?.formula) {
        this.applyFormulaBasedFormatting(range, rule);
      }
    }
  }

  private applyValueBasedFormatting(range: string, rule: ConditionalFormattingRule): void {
    const cells = this.parseCellTarget(range);

    for (const cellRef of cells) {
      const cell = this.worksheet.getCell(cellRef);
      const value = cell.value;

      if (this.evaluateCellCondition(value, rule.condition!)) {
        this.applyCellStyle(cell, rule.style);
      }
    }
  }

  private applyFormulaBasedFormatting(range: string, rule: ConditionalFormattingRule): void {
    // For formula-based formatting, we would need to evaluate formulas
    // This is a simplified implementation
    const cells = this.parseCellTarget(range);

    for (const cellRef of cells) {
      const cell = this.worksheet.getCell(cellRef);
      // Apply style - in a real implementation, we'd evaluate the formula
      // For now, this is a placeholder
      if (rule.condition?.formula && cell.value) {
        this.applyCellStyle(cell, rule.style);
      }
    }
  }

  private evaluateCellCondition(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any,
    condition: NonNullable<ConditionalFormattingRule['condition']>
  ): boolean {
    if (!condition.operator) return false;

    return this.compareValues(value, condition.operator as ComparisonOperator, condition.value);
  }

  private applyCellStyle(cell: Cell, style: CellStyle): void {
    // Apply font
    if (style.font) {
      cell.font = {
        name: style.font.name,
        size: style.font.size,
        bold: style.font.bold,
        italic: style.font.italic,
        underline: style.font.underline,
        strike: style.font.strike,
        color: style.font.color ? { argb: this.normalizeColor(style.font.color) } : undefined,
      };
    }
    if (style.fill) {
      if (style.fill.type === 'gradient' && style.fill.gradient) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const gradientFill: any = {
          type: 'gradient',
          gradient: style.fill.gradient.type === 'path' ? 'path' : 'angle',
          degree: style.fill.gradient.degree || 0,
          stops: style.fill.gradient.stops.map(stop => ({
            position: stop.position,
            color: { argb: this.normalizeColor(stop.color) },
          })),
        };
        cell.fill = gradientFill;
      } else {
        cell.fill = {
          type: 'pattern',
          pattern: style.fill.pattern || 'solid',
          fgColor: {
            argb: this.normalizeColor(style.fill.color || style.fill.fgColor || 'FFFFFF'),
          },
          bgColor: style.fill.bgColor
            ? { argb: this.normalizeColor(style.fill.bgColor) }
            : undefined,
        };
      }
    }

    // Apply border
    if (style.border) {
      cell.border = {
        top: style.border.top
          ? {
              style: style.border.top.style || 'thin',
              color: style.border.top.color
                ? { argb: this.normalizeColor(style.border.top.color) }
                : undefined,
            }
          : undefined,
        bottom: style.border.bottom
          ? {
              style: style.border.bottom.style || 'thin',
              color: style.border.bottom.color
                ? { argb: this.normalizeColor(style.border.bottom.color) }
                : undefined,
            }
          : undefined,
        left: style.border.left
          ? {
              style: style.border.left.style || 'thin',
              color: style.border.left.color
                ? { argb: this.normalizeColor(style.border.left.color) }
                : undefined,
            }
          : undefined,
        right: style.border.right
          ? {
              style: style.border.right.style || 'thin',
              color: style.border.right.color
                ? { argb: this.normalizeColor(style.border.right.color) }
                : undefined,
            }
          : undefined,
      };
    }

    // Apply alignment
    if (style.alignment) {
      cell.alignment = {
        horizontal: style.alignment.horizontal,
        vertical: style.alignment.vertical,
        wrapText: style.alignment.wrapText,
        shrinkToFit: style.alignment.shrinkToFit,
        indent: style.alignment.indent,
        textRotation: style.alignment.textRotation,
      };
    }

    // Apply number format
    if (style.numFmt) {
      cell.numFmt = style.numFmt;
    }
  }

  private normalizeColor(color: string): string {
    // Remove # if present
    let normalized = color.replace('#', '');

    // If RGB (6 chars), add FF for alpha
    if (normalized.length === 6) {
      normalized = 'FF' + normalized;
    }

    // If short RGB (3 chars), expand and add alpha
    if (normalized.length === 3) {
      normalized =
        'FF' +
        normalized
          .split('')
          .map(c => c + c)
          .join('');
    }

    return normalized.toUpperCase();
  }

  private getColumnCount(): number {
    if (this.data.length === 0) return 1;
    const firstRow = this.data[0];
    if (Array.isArray(firstRow)) return firstRow.length;
    if (typeof firstRow === 'object') return Object.keys(firstRow).length;
    return 1;
  }

  private columnLetterToNumber(letter: string): number {
    let result = 0;
    for (let i = 0; i < letter.length; i++) {
      result = result * 26 + letter.charCodeAt(i) - 64;
    }
    return result;
  }

  private columnNumberToLetter(num: number): string {
    let result = '';
    while (num > 0) {
      const remainder = (num - 1) % 26;
      result = String.fromCharCode(65 + remainder) + result;
      num = Math.floor((num - 1) / 26);
    }
    return result;
  }
}

export const StylePresets = {
  negativeHighlight: {
    fill: { color: '#FFCDD2' },
    font: { color: '#C62828' },
  } as CellStyle,

  positiveHighlight: {
    fill: { color: '#C8E6C9' },
    font: { color: '#2E7D32' },
  } as CellStyle,

  warningHighlight: {
    fill: { color: '#FFF9C4' },
    font: { color: '#F57F17' },
  } as CellStyle,

  infoHighlight: {
    fill: { color: '#BBDEFB' },
    font: { color: '#1565C0' },
  } as CellStyle,

  disabledStyle: {
    fill: { color: '#EEEEEE' },
    font: { color: '#9E9E9E', italic: true },
  } as CellStyle,

  headerStyle: {
    font: { bold: true, color: '#FFFFFF' },
    fill: { color: '#4472C4' },
    alignment: { horizontal: 'center', vertical: 'middle' },
  } as CellStyle,

  alternateRowLight: {
    fill: { color: '#F5F5F5' },
  } as CellStyle,

  alternateRowBlue: {
    fill: { color: '#E3F2FD' },
  } as CellStyle,

  currencyStyle: {
    numFmt: '$#,##0.00',
    alignment: { horizontal: 'right' },
  } as CellStyle,

  percentageStyle: {
    numFmt: '0.00%',
    alignment: { horizontal: 'right' },
  } as CellStyle,

  dateStyle: {
    numFmt: 'yyyy-mm-dd',
    alignment: { horizontal: 'center' },
  } as CellStyle,
};

export function createRowStyleRules(
  configs: Array<{
    condition:
      | 'even'
      | 'odd'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      | { column: string | number; operator: ComparisonOperator; value: any };
    style: CellStyle;
  }>
): RowStyleRule[] {
  return configs.map(config => {
    if (config.condition === 'even') {
      return { condition: { type: 'even' as const }, style: config.style };
    }
    if (config.condition === 'odd') {
      return { condition: { type: 'odd' as const }, style: config.style };
    }
    return {
      condition: {
        type: 'columnValue' as const,
        column: config.condition.column,
        operator: config.condition.operator,
        value: config.condition.value,
      },
      style: config.style,
    };
  });
}

export default ExcelStyleEngine;
