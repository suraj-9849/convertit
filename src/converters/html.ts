/**
 * HTML converter with tables, styling, and markdown support.
 */

import { BaseConverter } from './base.js';
import type { InputDataType, ConvertFileOptions, FileFormat, HTMLOptions } from '../core/types.js';
import { ConvertFileError, ErrorCode } from '../core/errors.js';
import { escapeHtml } from '../utils/helpers.js';

export class HTMLConverter extends BaseConverter {
  constructor() {
    super('html');
  }

  getSupportedInputFormats(): FileFormat[] {
    return ['json', 'csv', 'txt', 'markdown', 'md', 'xml'];
  }

  async convert(data: InputDataType, options: ConvertFileOptions): Promise<Buffer> {
    const htmlOptions = options.html || {};

    // Handle different input types
    if (typeof data === 'string') {
      return this.createFromString(data, htmlOptions);
    }

    if (Array.isArray(data)) {
      return this.createFromArray(data, htmlOptions);
    }

    if (typeof data === 'object' && !Buffer.isBuffer(data)) {
      return this.createFromObject(data as Record<string, any>, htmlOptions);
    }

    if (Buffer.isBuffer(data)) {
      const text = data.toString('utf-8');
      return this.createFromString(text, htmlOptions);
    }

    throw new ConvertFileError(ErrorCode.INVALID_INPUT, 'Unable to convert input data to HTML');
  }

  private async createFromString(text: string, htmlOptions: HTMLOptions): Promise<Buffer> {
    // Check if it's markdown
    if (this.isMarkdown(text)) {
      return this.createFromMarkdown(text, htmlOptions);
    }

    // Plain text
    const escapedText = escapeHtml(text);
    const paragraphs = escapedText
      .split('\n\n')
      .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
      .join('\n');

    const html = this.wrapInTemplate(paragraphs, htmlOptions);
    const encoding: BufferEncoding = htmlOptions.encoding || 'utf-8';
    return Buffer.from(htmlOptions.minify ? this.minifyHtml(html) : html, encoding);
  }

  private async createFromMarkdown(text: string, htmlOptions: HTMLOptions): Promise<Buffer> {
    let html = text;

    // Headers
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Bold and italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
    html = html.replace(/_(.+?)_/g, '<em>$1</em>');

    // Code blocks
    html = html.replace(
      /```(\w*)\n([\s\S]*?)```/g,
      '<pre><code class="language-$1">$2</code></pre>'
    );
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    // Images
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');

    // Unordered lists
    html = html.replace(/^[*-] (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

    // Ordered lists
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

    // Blockquotes
    html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

    // Horizontal rules
    html = html.replace(/^---$/gm, '<hr>');
    html = html.replace(/^\*\*\*$/gm, '<hr>');

    // Paragraphs
    html = html.replace(/^(?!<[a-z]|$)(.+)$/gm, '<p>$1</p>');

    // Clean up
    html = html.replace(/<\/blockquote>\n<blockquote>/g, '\n');
    html = html.replace(/<\/ul>\n<ul>/g, '\n');

    const finalHtml = this.wrapInTemplate(html, htmlOptions);
    const encoding: BufferEncoding = htmlOptions.encoding || 'utf-8';
    return Buffer.from(htmlOptions.minify ? this.minifyHtml(finalHtml) : finalHtml, encoding);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async createFromArray(data: any[], htmlOptions: HTMLOptions): Promise<Buffer> {
    const encoding: BufferEncoding = htmlOptions.encoding || 'utf-8';
    if (data.length === 0) {
      const html = this.wrapInTemplate('<p>No data</p>', htmlOptions);
      return Buffer.from(html, encoding);
    }

    // Check if array of objects (table data)
    if (typeof data[0] === 'object' && data[0] !== null) {
      return this.createTable(data, htmlOptions);
    }

    // Simple array - create list
    const listItems = data.map(item => `<li>${escapeHtml(String(item))}</li>`).join('\n');
    const html = this.wrapInTemplate(`<ul>\n${listItems}\n</ul>`, htmlOptions);
    return Buffer.from(htmlOptions.minify ? this.minifyHtml(html) : html, encoding);
  }

  private async createFromObject(
    data: Record<string, any>,
    htmlOptions: HTMLOptions
  ): Promise<Buffer> {
    const content = this.objectToHtml(data, 0);
    const html = this.wrapInTemplate(content, htmlOptions);
    const encoding: BufferEncoding = htmlOptions.encoding || 'utf-8';
    return Buffer.from(htmlOptions.minify ? this.minifyHtml(html) : html, encoding);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private createTable(data: any[], htmlOptions: HTMLOptions): Buffer {
    const headers = Object.keys(data[0]);

    const headerRow = headers.map(h => `<th>${escapeHtml(h)}</th>`).join('');
    const dataRows = data
      .map(row => {
        const cells = headers
          .map(h => {
            const value = row[h];
            const displayValue =
              value === null || value === undefined
                ? ''
                : typeof value === 'object'
                  ? escapeHtml(JSON.stringify(value))
                  : escapeHtml(String(value));
            return `<td>${displayValue}</td>`;
          })
          .join('');
        return `<tr>${cells}</tr>`;
      })
      .join('\n');

    const tableHtml = `
<table class="data-table">
  <thead>
    <tr>${headerRow}</tr>
  </thead>
  <tbody>
    ${dataRows}
  </tbody>
</table>`;

    const defaultCss = `
.data-table {
  width: 100%;
  border-collapse: collapse;
  margin: 20px 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.data-table th, .data-table td {
  border: 1px solid #ddd;
  padding: 12px;
  text-align: left;
}
.data-table th {
  background-color: #4472C4;
  color: white;
  font-weight: 600;
}
.data-table tr:nth-child(even) {
  background-color: #f8f9fa;
}
.data-table tr:hover {
  background-color: #e9ecef;
}`;

    const html = this.wrapInTemplate(tableHtml, {
      ...htmlOptions,
      css: (htmlOptions.css || '') + defaultCss,
    });

    const encoding: BufferEncoding = htmlOptions.encoding || 'utf-8';
    return Buffer.from(htmlOptions.minify ? this.minifyHtml(html) : html, encoding);
  }

  private objectToHtml(obj: Record<string, any>, depth: number): string {
    const indent = '  '.repeat(depth);
    let html = '<dl class="object-view">\n';

    for (const [key, value] of Object.entries(obj)) {
      html += `${indent}  <dt>${escapeHtml(key)}</dt>\n`;

      if (value === null || value === undefined) {
        html += `${indent}  <dd class="null">null</dd>\n`;
      } else if (Array.isArray(value)) {
        if (value.length === 0) {
          html += `${indent}  <dd class="empty-array">[]</dd>\n`;
        } else if (typeof value[0] === 'object') {
          html += `${indent}  <dd>\n`;
          html += `${indent}    <ol class="object-array">\n`;
          for (const item of value) {
            html += `${indent}      <li>${this.objectToHtml(item, depth + 3)}</li>\n`;
          }
          html += `${indent}    </ol>\n`;
          html += `${indent}  </dd>\n`;
        } else {
          html += `${indent}  <dd>\n`;
          html += `${indent}    <ul class="value-array">\n`;
          for (const item of value) {
            html += `${indent}      <li>${escapeHtml(String(item))}</li>\n`;
          }
          html += `${indent}    </ul>\n`;
          html += `${indent}  </dd>\n`;
        }
      } else if (typeof value === 'object') {
        html += `${indent}  <dd>\n${this.objectToHtml(value, depth + 2)}${indent}  </dd>\n`;
      } else {
        html += `${indent}  <dd>${escapeHtml(String(value))}</dd>\n`;
      }
    }

    html += `${indent}</dl>\n`;
    return html;
  }

  private wrapInTemplate(content: string, options: HTMLOptions): string {
    if (options.template) {
      return options.template.replace('{{content}}', content);
    }

    const title = options.title || 'Document';
    const meta = options.meta || {};
    const stylesheets = options.stylesheets || [];
    const scripts = options.scripts || [];

    const metaTags = Object.entries(meta)
      .map(
        ([name, content]) => `<meta name="${escapeHtml(name)}" content="${escapeHtml(content)}">`
      )
      .join('\n    ');

    const styleLinks = stylesheets
      .map(href => `<link rel="stylesheet" href="${escapeHtml(href)}">`)
      .join('\n    ');

    const scriptTags = scripts
      .map(src => `<script src="${escapeHtml(src)}"></script>`)
      .join('\n    ');

    const inlineStyles = options.css ? `<style>\n${options.css}\n</style>` : '';

    const defaultStyles =
      options.inlineStyles !== false
        ? `
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.6;
    color: #333;
    max-width: ${options.responsive !== false ? '1200px' : 'none'};
    margin: 0 auto;
    padding: 20px;
  }
  h1, h2, h3, h4, h5, h6 { margin-top: 1.5em; margin-bottom: 0.5em; }
  p { margin: 1em 0; }
  code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
  pre { background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; }
  pre code { background: none; padding: 0; }
  blockquote { border-left: 4px solid #ddd; margin: 1em 0; padding-left: 1em; color: #666; }
  img { max-width: 100%; height: auto; }
  a { color: #0066cc; }
  .object-view { margin: 0; }
  .object-view dt { font-weight: bold; color: #555; }
  .object-view dd { margin-left: 20px; margin-bottom: 10px; }
  .null { color: #999; font-style: italic; }
</style>`
        : '';

    const doctype = options.includeDoctype !== false ? '<!DOCTYPE html>\n' : '';

    return `${doctype}<html lang="en">
<head>
    <meta charset="${options.encoding || 'UTF-8'}">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    ${metaTags}
    <title>${escapeHtml(title)}</title>
    ${styleLinks}
    ${defaultStyles}
    ${inlineStyles}
</head>
<body>
${content}
    ${scriptTags}
</body>
</html>`;
  }

  private isMarkdown(text: string): boolean {
    const markdownPatterns = [
      /^#{1,6}\s/m, // Headers
      /\*\*[^*]+\*\*/, // Bold
      /\[[^\]]+\]\([^)]+\)/, // Links
      /^[-*]\s/m, // Unordered lists
      /^\d+\.\s/m, // Ordered lists
      /^```/m, // Code blocks
      /^>/m, // Blockquotes
    ];

    return markdownPatterns.some(pattern => pattern.test(text));
  }

  private minifyHtml(html: string): string {
    return html
      .replace(/\s+/g, ' ')
      .replace(/>\s+</g, '><')
      .replace(/\s+>/g, '>')
      .replace(/<\s+/g, '<')
      .trim();
  }
}

export default HTMLConverter;
