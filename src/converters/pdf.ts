/**
 * PDF converter for text, tables, images, and data structures.
 */

import PDFDocument from 'pdfkit';
import { PDFDocument as PDFLib, PDFPage, rgb, StandardFonts, degrees } from 'pdf-lib';
import { BaseConverter } from './base.js';
import type {
  InputDataType,
  ConvertFileOptions,
  FileFormat,
  PDFOptions,
  PageSize,
  PageMargins,
  PageNumberConfig,
} from '../core/types.js';
import { ConvertFileError, ErrorCode } from '../core/errors.js';
import { getPageSize, mergeMargins, mergeFont, parseColor } from '../utils/helpers.js';

export class PDFConverter extends BaseConverter {
  constructor() {
    super('pdf');
  }

  getSupportedInputFormats(): FileFormat[] {
    return ['txt', 'html', 'markdown', 'md', 'json', 'csv', 'xml', 'png', 'jpg', 'jpeg', 'webp'];
  }

  async convert(data: InputDataType, options: ConvertFileOptions): Promise<Buffer> {
    const pdfOptions = options.pdf || {};

    // Handle different input types
    if (typeof data === 'string') {
      return this.createFromText(data, pdfOptions, options);
    }

    if (Array.isArray(data)) {
      return this.createFromArray(data, pdfOptions, options);
    }

    if (typeof data === 'object' && !Buffer.isBuffer(data)) {
      return this.createFromObject(data, pdfOptions, options);
    }

    if (Buffer.isBuffer(data)) {
      // Try to determine if it's text or binary
      const text = data.toString('utf-8');
      if (this.isValidText(text)) {
        return this.createFromText(text, pdfOptions, options);
      }
      // Binary data - try to create PDF with embedded binary
      return this.createFromBinary(data, pdfOptions, options);
    }

    throw new ConvertFileError(ErrorCode.INVALID_INPUT, 'Unable to convert input data to PDF');
  }

  private isValidText(text: string): boolean {
    // Check if the string is valid UTF-8 text

    const invalidChars = text.match(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g);
    return !invalidChars || invalidChars.length < text.length * 0.1;
  }

  private async createFromText(
    text: string,
    pdfOptions: PDFOptions,
    _options: ConvertFileOptions
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const pageSize = getPageSize(pdfOptions.pageSize || 'A4');
        const margins = mergeMargins(pdfOptions.margins);
        const font = mergeFont(pdfOptions.font);
        const isLandscape = pdfOptions.orientation === 'landscape';

        const doc = new PDFDocument({
          size: isLandscape ? [pageSize.height, pageSize.width] : [pageSize.width, pageSize.height],
          margins: {
            top: margins.top,
            bottom: margins.bottom,
            left: margins.left,
            right: margins.right,
          },
          info: {
            Title: pdfOptions.metadata?.title || 'Document',
            Author: pdfOptions.metadata?.author || '',
            Subject: pdfOptions.metadata?.subject || '',
            Keywords: pdfOptions.metadata?.keywords?.join(', ') || '',
            Creator: pdfOptions.metadata?.creator || 'Convertit',
            Producer: pdfOptions.metadata?.producer || 'Convertit',
          },
        });

        const chunks: Buffer[] = [];

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Set font
        doc.font(this.mapFont(font.family));
        doc.fontSize(font.size);

        if (font.color) {
          const color = parseColor(font.color);
          doc.fillColor([color.r, color.g, color.b]);
        }

        // Add header if configured
        if (pdfOptions.header?.enabled && pdfOptions.header.content) {
          this.addHeader(doc, pdfOptions.header.content, pageSize, margins);
        }

        // Add text content
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.trim() === '') {
            doc.moveDown(0.5);
          } else {
            doc.text(line, {
              align: 'left',
              lineGap: 2,
            });
          }
        }

        // Add footer if configured
        if (pdfOptions.footer?.enabled && pdfOptions.footer.content) {
          this.addFooter(doc, pdfOptions.footer.content, pageSize, margins);
        }

        // Add page numbers if configured
        if (pdfOptions.pageNumbers?.enabled) {
          this.addPageNumbers(doc, pdfOptions.pageNumbers);
        }

        doc.end();
      } catch (error) {
        reject(
          new ConvertFileError(
            ErrorCode.CONVERSION_FAILED,
            `PDF creation failed: ${(error as Error).message}`,
            {
              cause: error as Error,
            }
          )
        );
      }
    });
  }

  private async createFromArray(
    data: any[],
    pdfOptions: PDFOptions,
    options: ConvertFileOptions
  ): Promise<Buffer> {
    // Convert array to formatted text or table
    if (data.length === 0) {
      return this.createFromText('Empty data', pdfOptions, options);
    }

    // Check if it's an array of objects (table data)
    if (typeof data[0] === 'object') {
      return this.createFromTableData(data, pdfOptions, options);
    }

    // Simple array - convert to text
    const text = data.map((item, index) => `${index + 1}. ${String(item)}`).join('\n');
    return this.createFromText(text, pdfOptions, options);
  }

  private async createFromObject(
    data: object,
    pdfOptions: PDFOptions,
    options: ConvertFileOptions
  ): Promise<Buffer> {
    // Convert object to formatted JSON text
    const text = JSON.stringify(data, null, 2);
    return this.createFromText(text, pdfOptions, options);
  }

  private async createFromTableData(
    data: any[],
    pdfOptions: PDFOptions,
    _options: ConvertFileOptions
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const pageSize = getPageSize(pdfOptions.pageSize || 'A4');
        const margins = mergeMargins(pdfOptions.margins);
        const font = mergeFont(pdfOptions.font);
        const isLandscape = pdfOptions.orientation === 'landscape';

        const doc = new PDFDocument({
          size: isLandscape ? [pageSize.height, pageSize.width] : [pageSize.width, pageSize.height],
          margins: {
            top: margins.top,
            bottom: margins.bottom,
            left: margins.left,
            right: margins.right,
          },
        });

        const chunks: Buffer[] = [];

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        doc.font(this.mapFont(font.family));
        doc.fontSize(font.size);

        // Extract headers from first object
        const headers = Object.keys(data[0]);
        const tableData = data.map(row => headers.map(h => String(row[h] ?? '')));

        // Draw table
        this.drawTable(doc, headers, tableData, margins, pageSize);

        doc.end();
      } catch (error) {
        reject(
          new ConvertFileError(
            ErrorCode.CONVERSION_FAILED,
            `PDF table creation failed: ${(error as Error).message}`
          )
        );
      }
    });
  }

  private async createFromBinary(
    data: Buffer,
    pdfOptions: PDFOptions,
    options: ConvertFileOptions
  ): Promise<Buffer> {
    // For binary data, create a simple PDF with info about the data
    const text = `Binary data (${data.length} bytes)`;
    return this.createFromText(text, pdfOptions, options);
  }

  private drawTable(
    doc: PDFKit.PDFDocument,
    headers: string[],
    data: string[][],
    margins: PageMargins,
    pageSize: PageSize
  ): void {
    const tableWidth = pageSize.width - margins.left - margins.right;
    const columnWidth = tableWidth / headers.length;
    const cellPadding = 5;
    const rowHeight = 25;

    let y = doc.y;

    // Draw header row
    doc.font('Helvetica-Bold');
    headers.forEach((header, i) => {
      const x = margins.left + i * columnWidth;
      doc.rect(x, y, columnWidth, rowHeight).stroke();
      doc.text(header, x + cellPadding, y + cellPadding, {
        width: columnWidth - cellPadding * 2,
        height: rowHeight - cellPadding * 2,
      });
    });

    y += rowHeight;
    doc.font('Helvetica');

    // Draw data rows
    for (const row of data) {
      // Check if we need a new page
      if (y + rowHeight > pageSize.height - margins.bottom) {
        doc.addPage();
        y = margins.top;
      }

      row.forEach((cell, i) => {
        const x = margins.left + i * columnWidth;
        doc.rect(x, y, columnWidth, rowHeight).stroke();
        doc.text(cell, x + cellPadding, y + cellPadding, {
          width: columnWidth - cellPadding * 2,
          height: rowHeight - cellPadding * 2,
        });
      });

      y += rowHeight;
    }

    doc.y = y;
  }

  private addHeader(
    doc: PDFKit.PDFDocument,
    content: string,
    pageSize: PageSize,
    margins: PageMargins
  ): void {
    const originalY = doc.y;
    doc.y = margins.top / 2;
    doc.fontSize(10);
    doc.text(content, margins.left, doc.y, {
      width: pageSize.width - margins.left - margins.right,
      align: 'center',
    });
    doc.y = originalY;
    doc.fontSize(12);
  }

  private addFooter(
    doc: PDFKit.PDFDocument,
    content: string,
    pageSize: PageSize,
    margins: PageMargins
  ): void {
    const originalY = doc.y;
    doc.y = pageSize.height - margins.bottom / 2;
    doc.fontSize(10);
    doc.text(content, margins.left, doc.y, {
      width: pageSize.width - margins.left - margins.right,
      align: 'center',
    });
    doc.y = originalY;
    doc.fontSize(12);
  }

  private addPageNumbers(doc: PDFKit.PDFDocument, config: PageNumberConfig): void {
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      const pageNum = (config.startFrom || 1) + i;
      const format = config.format || 'Page {page}';
      const text = format
        .replace('{page}', String(pageNum))
        .replace('{total}', String(pages.count));

      doc.fontSize(10);
      doc.text(text, 0, doc.page.height - 50, {
        align: 'center',
        width: doc.page.width,
      });
    }
  }

  private mapFont(family: string): string {
    const fontMap: Record<string, string> = {
      Helvetica: 'Helvetica',
      Times: 'Times-Roman',
      'Times-Roman': 'Times-Roman',
      'Times New Roman': 'Times-Roman',
      Courier: 'Courier',
      Arial: 'Helvetica',
      Georgia: 'Times-Roman',
      Verdana: 'Helvetica',
    };

    return fontMap[family] || 'Helvetica';
  }
}

/**
 * PDF Manipulator - for merge, split, watermark operations
 */
export class PDFManipulator {
  /**
   * Merge multiple PDF files
   */
  static async merge(files: Buffer[]): Promise<Buffer> {
    const mergedPdf = await PDFLib.create();

    for (const file of files) {
      try {
        const pdf = await PDFLib.load(file);
        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        pages.forEach((page: PDFPage) => mergedPdf.addPage(page));
      } catch (error) {
        throw new ConvertFileError(
          ErrorCode.MERGE_FAILED,
          `Failed to merge PDF: ${(error as Error).message}`
        );
      }
    }

    return Buffer.from(await mergedPdf.save());
  }

  /**
   * Split PDF by pages
   */
  static async split(file: Buffer, pages: number[]): Promise<Buffer[]> {
    const results: Buffer[] = [];

    try {
      const sourcePdf = await PDFLib.load(file);
      const totalPages = sourcePdf.getPageCount();

      for (const pageNum of pages) {
        if (pageNum < 1 || pageNum > totalPages) {
          throw new Error(`Invalid page number: ${pageNum}`);
        }

        const newPdf = await PDFLib.create();
        const [copiedPage] = await newPdf.copyPages(sourcePdf, [pageNum - 1]);
        newPdf.addPage(copiedPage);
        results.push(Buffer.from(await newPdf.save()));
      }
    } catch (error) {
      throw new ConvertFileError(
        ErrorCode.SPLIT_FAILED,
        `Failed to split PDF: ${(error as Error).message}`
      );
    }

    return results;
  }

  /**
   * Split PDF by page ranges
   */
  static async splitByRanges(
    file: Buffer,
    ranges: Array<{ start: number; end: number }>
  ): Promise<Buffer[]> {
    const results: Buffer[] = [];

    try {
      const sourcePdf = await PDFLib.load(file);
      const totalPages = sourcePdf.getPageCount();

      for (const range of ranges) {
        if (range.start < 1 || range.end > totalPages || range.start > range.end) {
          throw new Error(`Invalid page range: ${range.start}-${range.end}`);
        }

        const newPdf = await PDFLib.create();
        const pageIndices = Array.from(
          { length: range.end - range.start + 1 },
          (_, i) => range.start - 1 + i
        );
        const copiedPages = await newPdf.copyPages(sourcePdf, pageIndices);
        copiedPages.forEach((page: PDFPage) => newPdf.addPage(page));
        results.push(Buffer.from(await newPdf.save()));
      }
    } catch (error) {
      throw new ConvertFileError(
        ErrorCode.SPLIT_FAILED,
        `Failed to split PDF by ranges: ${(error as Error).message}`
      );
    }

    return results;
  }

  /**
   * Add text watermark to PDF
   */
  static async addTextWatermark(
    file: Buffer,
    text: string,
    options: {
      opacity?: number;
      rotation?: number;
      fontSize?: number;
      color?: { r: number; g: number; b: number };
    } = {}
  ): Promise<Buffer> {
    try {
      const pdfDoc = await PDFLib.load(file);
      const pages = pdfDoc.getPages();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      const {
        opacity = 0.3,
        rotation = -45,
        fontSize = 50,
        color = { r: 0.5, g: 0.5, b: 0.5 },
      } = options;

      for (const page of pages) {
        const { width, height } = page.getSize();

        page.drawText(text, {
          x: width / 4,
          y: height / 2,
          size: fontSize,
          font,
          color: rgb(color.r, color.g, color.b),
          opacity,
          rotate: degrees(rotation),
        });
      }

      return Buffer.from(await pdfDoc.save());
    } catch (error) {
      throw new ConvertFileError(
        ErrorCode.WATERMARK_FAILED,
        `Failed to add watermark: ${(error as Error).message}`
      );
    }
  }

  /**
   * Rotate PDF pages
   */
  static async rotatePages(
    file: Buffer,
    angle: 90 | 180 | 270,
    pageNumbers?: number[]
  ): Promise<Buffer> {
    try {
      const pdfDoc = await PDFLib.load(file);
      const pages = pdfDoc.getPages();

      const pagesToRotate = pageNumbers
        ? pages.filter((_: PDFPage, i: number) => pageNumbers.includes(i + 1))
        : pages;

      for (const page of pagesToRotate) {
        page.setRotation(degrees(page.getRotation().angle + angle));
      }

      return Buffer.from(await pdfDoc.save());
    } catch (error) {
      throw new ConvertFileError(
        ErrorCode.CONVERSION_FAILED,
        `Failed to rotate PDF: ${(error as Error).message}`
      );
    }
  }

  /**
   * Get PDF page count
   */
  static async getPageCount(file: Buffer): Promise<number> {
    const pdfDoc = await PDFLib.load(file);
    return pdfDoc.getPageCount();
  }

  /**
   * Extract specific pages from PDF
   */
  static async extractPages(file: Buffer, pageNumbers: number[]): Promise<Buffer> {
    try {
      const sourcePdf = await PDFLib.load(file);
      const newPdf = await PDFLib.create();

      const pageIndices = pageNumbers.map(p => p - 1);
      const copiedPages = await newPdf.copyPages(sourcePdf, pageIndices);
      copiedPages.forEach((page: PDFPage) => newPdf.addPage(page));

      return Buffer.from(await newPdf.save());
    } catch (error) {
      throw new ConvertFileError(
        ErrorCode.CONVERSION_FAILED,
        `Failed to extract pages: ${(error as Error).message}`
      );
    }
  }
}

export default PDFConverter;
