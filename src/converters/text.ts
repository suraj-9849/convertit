/**
 * Text, JSON, and XML converters.
 */

import { BaseConverter } from './base.js';
import type { InputDataType, ConvertFileOptions, FileFormat } from '../core/types.js';

export class TextConverter extends BaseConverter {
  constructor() {
    super('txt');
  }

  getSupportedInputFormats(): FileFormat[] {
    return ['json', 'csv', 'html', 'xml', 'markdown', 'md'];
  }

  async convert(data: InputDataType, _options: ConvertFileOptions): Promise<Buffer> {
    let text: string;

    if (typeof data === 'string') {
      text = data;
    } else if (Buffer.isBuffer(data)) {
      text = data.toString('utf-8');
    } else if (Array.isArray(data)) {
      text = this.arrayToText(data);
    } else if (typeof data === 'object') {
      text = this.objectToText(data as Record<string, any>);
    } else {
      text = String(data);
    }

    // Strip HTML tags if present
    text = text.replace(/<[^>]*>/g, '');

    // Normalize line endings
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    return Buffer.from(text, 'utf-8');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private arrayToText(data: any[], indent: number = 0): string {
    const prefix = '  '.repeat(indent);
    return data
      .map((item, index) => {
        if (typeof item === 'object' && item !== null) {
          if (Array.isArray(item)) {
            return `${prefix}${index + 1}.\n${this.arrayToText(item, indent + 1)}`;
          }
          return `${prefix}${index + 1}.\n${this.objectToText(item, indent + 1)}`;
        }
        return `${prefix}${index + 1}. ${String(item)}`;
      })
      .join('\n');
  }

  private objectToText(data: Record<string, any>, indent: number = 0): string {
    const prefix = '  '.repeat(indent);
    return Object.entries(data)
      .map(([key, value]) => {
        if (value === null || value === undefined) {
          return `${prefix}${key}: null`;
        }
        if (typeof value === 'object') {
          if (Array.isArray(value)) {
            return `${prefix}${key}:\n${this.arrayToText(value, indent + 1)}`;
          }
          return `${prefix}${key}:\n${this.objectToText(value, indent + 1)}`;
        }
        return `${prefix}${key}: ${String(value)}`;
      })
      .join('\n');
  }
}

export class JSONConverter extends BaseConverter {
  constructor() {
    super('json');
  }

  getSupportedInputFormats(): FileFormat[] {
    return ['csv', 'xml', 'txt', 'excel', 'xlsx'];
  }

  async convert(data: InputDataType, _options: ConvertFileOptions): Promise<Buffer> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let jsonData: any;

    if (typeof data === 'string') {
      try {
        jsonData = JSON.parse(data);
      } catch {
        // If not valid JSON, treat as text
        jsonData = { text: data };
      }
    } else if (Buffer.isBuffer(data)) {
      const text = data.toString('utf-8');
      try {
        jsonData = JSON.parse(text);
      } catch {
        jsonData = { text };
      }
    } else {
      jsonData = data;
    }

    const formatted = JSON.stringify(jsonData, null, 2);
    return Buffer.from(formatted, 'utf-8');
  }
}

export class XMLConverter extends BaseConverter {
  constructor() {
    super('xml');
  }

  getSupportedInputFormats(): FileFormat[] {
    return ['json', 'csv', 'txt'];
  }

  async convert(data: InputDataType, _options: ConvertFileOptions): Promise<Buffer> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let obj: any;

    if (typeof data === 'string') {
      try {
        obj = JSON.parse(data);
      } catch {
        obj = { content: data };
      }
    } else if (Buffer.isBuffer(data)) {
      const text = data.toString('utf-8');
      try {
        obj = JSON.parse(text);
      } catch {
        obj = { content: text };
      }
    } else if (Array.isArray(data)) {
      obj = { items: { item: data } };
    } else {
      obj = data;
    }

    const xml = this.objectToXml(obj, 'root');
    const formatted = `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`;
    return Buffer.from(formatted, 'utf-8');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private objectToXml(obj: any, rootName: string, indent: number = 0): string {
    const prefix = '  '.repeat(indent);

    if (obj === null || obj === undefined) {
      return `${prefix}<${rootName}/>\n`;
    }

    if (typeof obj !== 'object') {
      return `${prefix}<${rootName}>${this.escapeXml(String(obj))}</${rootName}>\n`;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.objectToXml(item, rootName, indent)).join('');
    }

    let xml = `${prefix}<${rootName}>\n`;

    for (const [key, value] of Object.entries(obj)) {
      const tagName = this.sanitizeTagName(key);
      xml += this.objectToXml(value, tagName, indent + 1);
    }

    xml += `${prefix}</${rootName}>\n`;
    return xml;
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private sanitizeTagName(name: string): string {
    // Remove invalid characters and ensure valid XML tag name
    let sanitized = name.replace(/[^a-zA-Z0-9_-]/g, '_');

    // Ensure it doesn't start with a number or special char
    if (/^[^a-zA-Z_]/.test(sanitized)) {
      sanitized = '_' + sanitized;
    }

    return sanitized;
  }
}

export class MarkdownConverter extends BaseConverter {
  constructor() {
    super('md');
  }

  getSupportedInputFormats(): FileFormat[] {
    return ['json', 'csv', 'txt', 'html'];
  }

  async convert(data: InputDataType, _options: ConvertFileOptions): Promise<Buffer> {
    let markdown: string;

    if (typeof data === 'string') {
      markdown = this.convertToMarkdown(data);
    } else if (Buffer.isBuffer(data)) {
      markdown = this.convertToMarkdown(data.toString('utf-8'));
    } else if (Array.isArray(data)) {
      markdown = this.arrayToMarkdown(data);
    } else if (typeof data === 'object') {
      markdown = this.objectToMarkdown(data as Record<string, any>);
    } else {
      markdown = String(data);
    }

    return Buffer.from(markdown, 'utf-8');
  }

  private convertToMarkdown(text: string): string {
    // Check if it looks like HTML
    if (/<[^>]+>/.test(text)) {
      return this.htmlToMarkdown(text);
    }
    return text;
  }

  private htmlToMarkdown(html: string): string {
    let md = html;

    // Headers
    md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
    md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
    md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
    md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n');
    md = md.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n');
    md = md.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n');

    // Bold and italic
    md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
    md = md.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
    md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
    md = md.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');

    // Links
    md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');

    // Images
    md = md.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)');
    md = md.replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, '![]($1)');

    // Code
    md = md.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
    md = md.replace(/<pre[^>]*>(.*?)<\/pre>/gis, '```\n$1\n```\n\n');

    // Lists
    md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
    md = md.replace(/<\/?[ou]l[^>]*>/gi, '\n');

    // Paragraphs
    md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
    md = md.replace(/<br\s*\/?>/gi, '\n');

    // Blockquotes
    md = md.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, (_, content) => {
      return (
        content
          .split('\n')
          .map((line: string) => `> ${line.trim()}`)
          .join('\n') + '\n\n'
      );
    });

    // Horizontal rule
    md = md.replace(/<hr\s*\/?>/gi, '\n---\n\n');

    // Remove remaining tags
    md = md.replace(/<[^>]*>/g, '');

    // Clean up whitespace
    md = md.replace(/\n{3,}/g, '\n\n');
    md = md.trim();

    // Decode HTML entities
    md = md.replace(/&amp;/g, '&');
    md = md.replace(/&lt;/g, '<');
    md = md.replace(/&gt;/g, '>');
    md = md.replace(/&quot;/g, '"');
    md = md.replace(/&#39;/g, "'");

    return md;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private arrayToMarkdown(data: any[]): string {
    if (data.length === 0) return '';

    // Check if array of objects (table)
    if (typeof data[0] === 'object' && data[0] !== null) {
      return this.createMarkdownTable(data);
    }

    // Simple list
    return data.map(item => `- ${String(item)}`).join('\n');
  }

  private createMarkdownTable(data: Record<string, any>[]): string {
    if (!data[0]) return '';
    const headers = Object.keys(data[0]);

    let table = '| ' + headers.join(' | ') + ' |\n';
    table += '| ' + headers.map(() => '---').join(' | ') + ' |\n';

    for (const row of data) {
      const cells = headers.map(h => {
        const value = row[h];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
      });
      table += '| ' + cells.join(' | ') + ' |\n';
    }

    return table;
  }

  private objectToMarkdown(data: Record<string, any>, level: number = 1): string {
    let md = '';
    const headingPrefix = '#'.repeat(Math.min(level, 6));

    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined) {
        md += `**${key}:** _null_\n\n`;
      } else if (Array.isArray(value)) {
        md += `${headingPrefix} ${key}\n\n`;
        if (value.length > 0 && typeof value[0] === 'object') {
          md += this.createMarkdownTable(value) + '\n\n';
        } else {
          md += value.map(item => `- ${String(item)}`).join('\n') + '\n\n';
        }
      } else if (typeof value === 'object') {
        md += `${headingPrefix} ${key}\n\n`;
        md += this.objectToMarkdown(value, level + 1);
      } else {
        md += `**${key}:** ${String(value)}\n\n`;
      }
    }

    return md;
  }
}
