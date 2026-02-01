/**
 * Word document (DOCX) converter with tables, headers, and styling.
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  Header,
  Footer,
  PageNumber,
  HeadingLevel,
  ShadingType,
  convertInchesToTwip,
  PageOrientation,
} from 'docx';
import { BaseConverter } from './base.js';
import type {
  InputDataType,
  ConvertFileOptions,
  FileFormat,
  WordOptions,
  FontConfig,
  HeaderFooterConfig,
} from '../core/types.js';
import { ConvertFileError, ErrorCode } from '../core/errors.js';
import { mergeMargins, mergeFont, getPageSize } from '../utils/helpers.js';

export class WordConverter extends BaseConverter {
  constructor() {
    super('docx');
  }

  getSupportedInputFormats(): FileFormat[] {
    return ['txt', 'html', 'markdown', 'md', 'json', 'csv', 'xml'];
  }

  async convert(data: InputDataType, options: ConvertFileOptions): Promise<Buffer> {
    const wordOptions = options.word || {};

    // Handle different input types
    if (typeof data === 'string') {
      return this.createFromText(data, wordOptions);
    }

    if (Array.isArray(data)) {
      return this.createFromArray(data, wordOptions);
    }

    if (typeof data === 'object' && !Buffer.isBuffer(data)) {
      return this.createFromObject(data as Record<string, any>, wordOptions);
    }

    if (Buffer.isBuffer(data)) {
      const text = data.toString('utf-8');
      return this.createFromText(text, wordOptions);
    }

    throw new ConvertFileError(
      ErrorCode.INVALID_INPUT,
      'Unable to convert input data to Word document'
    );
  }

  private async createFromText(text: string, wordOptions: WordOptions): Promise<Buffer> {
    const font = mergeFont(wordOptions.font);
    const margins = mergeMargins(wordOptions.margins);
    const pageSize = getPageSize(wordOptions.pageSize || 'A4');

    const paragraphs: Paragraph[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      if (line.trim() === '') {
        paragraphs.push(new Paragraph({ spacing: { after: 200 } }));
      } else {
        // Check for markdown-like headers
        if (line.startsWith('# ')) {
          paragraphs.push(this.createHeading(line.slice(2), HeadingLevel.HEADING_1, font));
        } else if (line.startsWith('## ')) {
          paragraphs.push(this.createHeading(line.slice(3), HeadingLevel.HEADING_2, font));
        } else if (line.startsWith('### ')) {
          paragraphs.push(this.createHeading(line.slice(4), HeadingLevel.HEADING_3, font));
        } else if (line.startsWith('- ') || line.startsWith('* ')) {
          paragraphs.push(this.createBulletPoint(line.slice(2), font));
        } else if (/^\d+\.\s/.test(line)) {
          paragraphs.push(this.createNumberedItem(line.replace(/^\d+\.\s/, ''), font));
        } else {
          paragraphs.push(this.createParagraph(line, font));
        }
      }
    }

    const sections = [
      {
        properties: {
          page: {
            size: {
              width: pageSize.width,
              height: pageSize.height,
              orientation:
                wordOptions.orientation === 'landscape'
                  ? PageOrientation.LANDSCAPE
                  : PageOrientation.PORTRAIT,
            },
            margin: {
              top: margins.top,
              right: margins.right,
              bottom: margins.bottom,
              left: margins.left,
            },
          },
        },
        headers: wordOptions.header?.enabled
          ? { default: this.createHeader(wordOptions.header) }
          : undefined,
        footers: wordOptions.footer?.enabled
          ? { default: this.createFooter(wordOptions.footer) }
          : undefined,
        children: paragraphs,
      },
    ];

    const doc = new Document({
      creator: wordOptions.metadata?.author || 'Convertit',
      title: wordOptions.metadata?.title || 'Document',
      description: wordOptions.metadata?.description || '',
      subject: wordOptions.metadata?.subject || '',
      keywords: wordOptions.metadata?.keywords?.join(', ') || '',
      sections,
    });

    return await Packer.toBuffer(doc);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async createFromArray(data: any[], wordOptions: WordOptions): Promise<Buffer> {
    if (data.length === 0) {
      return this.createFromText('Empty data', wordOptions);
    }

    // Check if it's an array of objects (table data)
    if (typeof data[0] === 'object' && data[0] !== null) {
      return this.createFromTableData(data, wordOptions);
    }

    // Simple array - convert to list
    const text = data.map((item, index) => `${index + 1}. ${String(item)}`).join('\n');
    return this.createFromText(text, wordOptions);
  }

  private async createFromObject(
    data: Record<string, any>,
    wordOptions: WordOptions
  ): Promise<Buffer> {
    const font = mergeFont(wordOptions.font);
    const paragraphs: Paragraph[] = [];

    // Create a structured representation of the object
    this.objectToParagraphs(data, paragraphs, font, 0);

    const doc = new Document({
      sections: [
        {
          children: paragraphs,
        },
      ],
    });

    return await Packer.toBuffer(doc);
  }

  private objectToParagraphs(
    obj: Record<string, any>,
    paragraphs: Paragraph[],
    font: FontConfig,
    indent: number
  ): void {
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) {
        paragraphs.push(
          new Paragraph({
            indent: { left: convertInchesToTwip(indent * 0.25) },
            children: [
              new TextRun({ text: `${key}: `, bold: true, font: font.family, size: font.size * 2 }),
              new TextRun({ text: 'null', font: font.family, size: font.size * 2, italics: true }),
            ],
          })
        );
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        paragraphs.push(
          new Paragraph({
            indent: { left: convertInchesToTwip(indent * 0.25) },
            children: [
              new TextRun({ text: `${key}:`, bold: true, font: font.family, size: font.size * 2 }),
            ],
          })
        );
        this.objectToParagraphs(value, paragraphs, font, indent + 1);
      } else if (Array.isArray(value)) {
        paragraphs.push(
          new Paragraph({
            indent: { left: convertInchesToTwip(indent * 0.25) },
            children: [
              new TextRun({ text: `${key}:`, bold: true, font: font.family, size: font.size * 2 }),
            ],
          })
        );
        value.forEach((item, index) => {
          if (typeof item === 'object') {
            paragraphs.push(
              new Paragraph({
                indent: { left: convertInchesToTwip((indent + 1) * 0.25) },
                children: [
                  new TextRun({ text: `[${index}]:`, font: font.family, size: font.size * 2 }),
                ],
              })
            );
            this.objectToParagraphs(item, paragraphs, font, indent + 2);
          } else {
            paragraphs.push(
              new Paragraph({
                indent: { left: convertInchesToTwip((indent + 1) * 0.25) },
                children: [
                  new TextRun({
                    text: `- ${String(item)}`,
                    font: font.family,
                    size: font.size * 2,
                  }),
                ],
              })
            );
          }
        });
      } else {
        paragraphs.push(
          new Paragraph({
            indent: { left: convertInchesToTwip(indent * 0.25) },
            children: [
              new TextRun({ text: `${key}: `, bold: true, font: font.family, size: font.size * 2 }),
              new TextRun({ text: String(value), font: font.family, size: font.size * 2 }),
            ],
          })
        );
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async createFromTableData(data: any[], wordOptions: WordOptions): Promise<Buffer> {
    const font = mergeFont(wordOptions.font);
    const headers = Object.keys(data[0]);

    // Create header row
    const headerRow = new TableRow({
      children: headers.map(
        header =>
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: header,
                    bold: true,
                    font: font.family,
                    size: font.size * 2,
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            shading: {
              type: ShadingType.SOLID,
              color: '4472C4',
              fill: '4472C4',
            },
          })
      ),
      tableHeader: true,
    });

    // Create data rows
    const dataRows = data.map(
      (row, index) =>
        new TableRow({
          children: headers.map(
            header =>
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: String(row[header] ?? ''),
                        font: font.family,
                        size: font.size * 2,
                      }),
                    ],
                  }),
                ],
                shading:
                  index % 2 === 1
                    ? {
                        type: ShadingType.SOLID,
                        color: 'F2F2F2',
                        fill: 'F2F2F2',
                      }
                    : undefined,
              })
          ),
        })
    );

    const table = new Table({
      rows: [headerRow, ...dataRows],
      width: {
        size: 100,
        type: WidthType.PERCENTAGE,
      },
    });

    const doc = new Document({
      sections: [
        {
          children: [table],
        },
      ],
    });

    return await Packer.toBuffer(doc);
  }

  private createParagraph(text: string, font: FontConfig): Paragraph {
    return new Paragraph({
      children: [
        new TextRun({
          text,
          font: font.family,
          size: font.size * 2, // docx uses half-points
          bold: font.bold,
          italics: font.italic,
          underline: font.underline ? {} : undefined,
          color: font.color?.replace('#', ''),
        }),
      ],
      spacing: { after: 120 },
    });
  }

  private createHeading(
    text: string,
    level: (typeof HeadingLevel)[keyof typeof HeadingLevel],
    font: FontConfig
  ): Paragraph {
    const sizeMap: Partial<Record<(typeof HeadingLevel)[keyof typeof HeadingLevel], number>> = {
      [HeadingLevel.HEADING_1]: 32,
      [HeadingLevel.HEADING_2]: 26,
      [HeadingLevel.HEADING_3]: 22,
      [HeadingLevel.HEADING_4]: 18,
      [HeadingLevel.HEADING_5]: 16,
      [HeadingLevel.HEADING_6]: 14,
      [HeadingLevel.TITLE]: 36,
    };

    return new Paragraph({
      heading: level,
      children: [
        new TextRun({
          text,
          font: font.family,
          size: (sizeMap[level] || 24) * 2,
          bold: true,
          color: font.color?.replace('#', ''),
        }),
      ],
      spacing: { before: 240, after: 120 },
    });
  }

  private createBulletPoint(text: string, font: FontConfig): Paragraph {
    return new Paragraph({
      bullet: { level: 0 },
      children: [
        new TextRun({
          text,
          font: font.family,
          size: font.size * 2,
        }),
      ],
    });
  }

  private createNumberedItem(text: string, font: FontConfig): Paragraph {
    return new Paragraph({
      numbering: { reference: 'default-numbering', level: 0 },
      children: [
        new TextRun({
          text,
          font: font.family,
          size: font.size * 2,
        }),
      ],
    });
  }

  private createHeader(config: HeaderFooterConfig): Header {
    return new Header({
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: config.content || '',
              size: (config.font?.size || 10) * 2,
            }),
          ],
          alignment: this.mapAlignment(config.alignment),
        }),
      ],
    });
  }

  private createFooter(config: HeaderFooterConfig): Footer {
    const children: TextRun[] = [];

    if (config.content) {
      children.push(new TextRun({ text: config.content, size: (config.font?.size || 10) * 2 }));
    }

    if (config.includePageNumber) {
      if (children.length > 0) {
        children.push(new TextRun({ text: ' - ' }));
      }
      children.push(new TextRun({ text: 'Page ' }));
      children.push(
        new TextRun({
          children: [PageNumber.CURRENT],
        })
      );
      children.push(new TextRun({ text: ' of ' }));
      children.push(
        new TextRun({
          children: [PageNumber.TOTAL_PAGES],
        })
      );
    }

    return new Footer({
      children: [
        new Paragraph({
          children,
          alignment: this.mapAlignment(config.alignment),
        }),
      ],
    });
  }

  private mapAlignment(
    alignment?: 'left' | 'center' | 'right'
  ): (typeof AlignmentType)[keyof typeof AlignmentType] {
    switch (alignment) {
      case 'left':
        return AlignmentType.LEFT;
      case 'right':
        return AlignmentType.RIGHT;
      case 'center':
      default:
        return AlignmentType.CENTER;
    }
  }
}

export default WordConverter;
