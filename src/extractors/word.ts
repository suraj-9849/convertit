/**
 * Word Document Extractor
 * Extract text, images, tables, styles, comments, and metadata from DOCX files
 */

import JSZip from 'jszip';
import { BaseExtractor, ExtractorUtils } from './base.js';
import type {
  FileFormat,
  InputDataType,
  ExtractionResult,
  WordExtractionOptions,
  WordExtractionResult,
  ExtractedText,
  ExtractedImage,
  ExtractedTable,
  ExtractedStyle,
  ExtractedComment,
  ExtractedHeaderFooter,
  ExtractedNote,
  ExtractedBookmark,
  DocumentMetadata,
  TextStatistics,
  TextBlock,
  TableRow as ExtractedTableRow,
  TableCell as ExtractedTableCell,
  DocumentSection,
  PageSize,
  PageMargins,
} from '../core/types.js';
import { ConvertFileError, ErrorCode } from '../core/errors.js';
import { generateId } from '../utils/helpers.js';

/**
 * Default Word extraction options
 */
const DEFAULT_WORD_OPTIONS: WordExtractionOptions = {
  extractText: true,
  extractImages: true,
  extractTables: true,
  extractStyles: true,
  extractComments: true,
  extractHeaders: true,
  extractFooters: true,
  extractFootnotes: true,
  extractEndnotes: true,
  extractBookmarks: true,
  extractMetadata: true,
  preserveFormatting: true,
  includeTrackedChanges: false,
};

/**
 * XML Namespaces used in DOCX
 */
const _NS = {
  w: 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
  r: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
  a: 'http://schemas.openxmlformats.org/drawingml/2006/main',
  wp: 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing',
  pic: 'http://schemas.openxmlformats.org/drawingml/2006/picture',
  cp: 'http://schemas.openxmlformats.org/package/2006/metadata/core-properties',
  dc: 'http://purl.org/dc/elements/1.1/',
  dcterms: 'http://purl.org/dc/terms/',
};

export class WordExtractor extends BaseExtractor {
  private zip: JSZip | null = null;
  private relationships: Map<string, { target: string; type: string }> = new Map();

  constructor() {
    super('docx');
  }

  getSupportedFormats(): FileFormat[] {
    return ['word', 'docx'];
  }

  async extract<T>(
    data: InputDataType,
    options: Record<string, unknown>
  ): Promise<ExtractionResult<T>> {
    const opts: WordExtractionOptions = { ...DEFAULT_WORD_OPTIONS, ...options };
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);

    try {
      // Load the DOCX file (which is a ZIP archive)
      this.zip = await JSZip.loadAsync(buffer);

      // Load relationships
      await this.loadRelationships();

      const result: WordExtractionResult['data'] = {};
      const warnings: string[] = [];

      // Extract metadata
      const metadata = await this.extractMetadata();

      // Extract text
      if (opts.extractText) {
        try {
          result.text = await this.extractText(opts);
          metadata.wordCount = result.text.statistics.totalWords;
          metadata.characterCount = result.text.statistics.totalCharacters;
        } catch (error) {
          warnings.push(`Text extraction failed: ${(error as Error).message}`);
        }
      }

      // Extract images
      if (opts.extractImages) {
        try {
          result.images = await this.extractImages();
        } catch (error) {
          warnings.push(`Image extraction failed: ${(error as Error).message}`);
        }
      }

      // Extract tables
      if (opts.extractTables) {
        try {
          result.tables = await this.extractTables();
        } catch (error) {
          warnings.push(`Table extraction failed: ${(error as Error).message}`);
        }
      }

      // Extract styles
      if (opts.extractStyles) {
        try {
          result.styles = await this.extractStyles();
        } catch (error) {
          warnings.push(`Style extraction failed: ${(error as Error).message}`);
        }
      }

      // Extract comments
      if (opts.extractComments) {
        try {
          result.comments = await this.extractComments();
        } catch (error) {
          warnings.push(`Comment extraction failed: ${(error as Error).message}`);
        }
      }

      // Extract headers
      if (opts.extractHeaders) {
        try {
          result.headers = await this.extractHeadersFooters('header');
        } catch (error) {
          warnings.push(`Header extraction failed: ${(error as Error).message}`);
        }
      }

      // Extract footers
      if (opts.extractFooters) {
        try {
          result.footers = await this.extractHeadersFooters('footer');
        } catch (error) {
          warnings.push(`Footer extraction failed: ${(error as Error).message}`);
        }
      }

      // Extract footnotes
      if (opts.extractFootnotes) {
        try {
          result.footnotes = await this.extractNotes('footnote');
        } catch (error) {
          warnings.push(`Footnote extraction failed: ${(error as Error).message}`);
        }
      }

      // Extract endnotes
      if (opts.extractEndnotes) {
        try {
          result.endnotes = await this.extractNotes('endnote');
        } catch (error) {
          warnings.push(`Endnote extraction failed: ${(error as Error).message}`);
        }
      }

      // Extract bookmarks
      if (opts.extractBookmarks) {
        try {
          result.bookmarks = await this.extractBookmarks();
        } catch (error) {
          warnings.push(`Bookmark extraction failed: ${(error as Error).message}`);
        }
      }

      // Extract sections
      try {
        result.sections = await this.extractSections();
      } catch (error) {
        warnings.push(`Section extraction failed: ${(error as Error).message}`);
      }

      return this.createResult(result as T, metadata, {
        warnings: warnings.length > 0 ? warnings : undefined,
      });
    } catch (error) {
      throw new ConvertFileError(
        ErrorCode.EXTRACTION_FAILED,
        `Word extraction failed: ${(error as Error).message}`,
        { cause: error as Error }
      );
    } finally {
      this.zip = null;
      this.relationships.clear();
    }
  }

  /**
   * Load document relationships
   */
  private async loadRelationships(): Promise<void> {
    const relsFile = this.zip?.file('word/_rels/document.xml.rels');
    if (!relsFile) return;

    const content = await relsFile.async('text');
    const matches = content.matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"[^>]*Type="([^"]+)"/g);

    for (const match of matches) {
      this.relationships.set(match[1]!, {
        target: match[2]!,
        type: match[3]!,
      });
    }
  }

  /**
   * Extract document metadata
   */
  private async extractMetadata(): Promise<DocumentMetadata> {
    const metadata: DocumentMetadata = {};

    // Extract core properties
    const coreFile = this.zip?.file('docProps/core.xml');
    if (coreFile) {
      const content = await coreFile.async('text');

      metadata.title = this.extractXmlValue(content, 'dc:title');
      metadata.author = this.extractXmlValue(content, 'dc:creator');
      metadata.subject = this.extractXmlValue(content, 'dc:subject');

      const keywords = this.extractXmlValue(content, 'cp:keywords');
      if (keywords) {
        metadata.keywords = keywords.split(',').map(k => k.trim());
      }

      const created = this.extractXmlValue(content, 'dcterms:created');
      if (created) {
        metadata.creationDate = new Date(created);
      }

      const modified = this.extractXmlValue(content, 'dcterms:modified');
      if (modified) {
        metadata.modificationDate = new Date(modified);
      }
    }

    // Extract app properties
    const appFile = this.zip?.file('docProps/app.xml');
    if (appFile) {
      const content = await appFile.async('text');

      const pages = this.extractXmlValue(content, 'Pages');
      if (pages) {
        metadata.pageCount = parseInt(pages);
      }

      const words = this.extractXmlValue(content, 'Words');
      if (words) {
        metadata.wordCount = parseInt(words);
      }

      const chars = this.extractXmlValue(content, 'Characters');
      if (chars) {
        metadata.characterCount = parseInt(chars);
      }

      metadata.creator = this.extractXmlValue(content, 'Application');
    }

    return metadata;
  }

  /**
   * Extract text content from document
   */
  private async extractText(options: WordExtractionOptions): Promise<ExtractedText> {
    const documentFile = this.zip?.file('word/document.xml');
    if (!documentFile) {
      throw new Error('Document.xml not found');
    }

    const content = await documentFile.async('text');
    const paragraphs: TextBlock[] = [];
    let fullText = '';

    // Extract paragraphs
    const paragraphMatches = content.matchAll(/<w:p[^>]*>([\s\S]*?)<\/w:p>/g);
    let _paragraphIndex = 0;

    for (const match of paragraphMatches) {
      const paragraphContent = match[1] || '';
      const text = this.extractTextFromParagraph(paragraphContent, options);

      if (text.trim()) {
        const style = this.extractParagraphStyle(paragraphContent);

        paragraphs.push({
          id: generateId(),
          content: text,
          type: style.isHeading ? 'heading' : 'paragraph',
          level: style.headingLevel,
          style: {
            fontFamily: style.fontFamily,
            fontSize: style.fontSize,
            fontWeight: style.bold ? 'bold' : 'normal',
            fontStyle: style.italic ? 'italic' : 'normal',
            alignment: style.alignment,
          },
        });

        fullText += text + '\n';
        _paragraphIndex++;
      }
    }

    const stats = ExtractorUtils.calculateTextStatistics(fullText);
    const words = fullText.split(/\s+/).filter(w => w.length > 0);
    const syllables = words.reduce((sum, word) => sum + ExtractorUtils.countSyllables(word), 0);

    const statistics: TextStatistics = {
      totalCharacters: stats.characters,
      totalWords: stats.words,
      totalSentences: stats.sentences,
      totalParagraphs: paragraphs.length,
      totalPages: 1, // Would need to calculate based on content
      averageWordsPerSentence: stats.sentences > 0 ? stats.words / stats.sentences : 0,
      averageCharactersPerWord: stats.words > 0 ? stats.characters / stats.words : 0,
      readingTimeMinutes: ExtractorUtils.calculateReadingTime(stats.words),
      speakingTimeMinutes: ExtractorUtils.calculateSpeakingTime(stats.words),
      readabilityScores: {
        fleschKincaidGrade: ExtractorUtils.calculateFleschKincaidGrade(
          stats.words,
          stats.sentences,
          syllables
        ),
        fleschReadingEase: ExtractorUtils.calculateFleschReadingEase(
          stats.words,
          stats.sentences,
          syllables
        ),
      },
    };

    return {
      content: fullText.trim(),
      paragraphs,
      lines: fullText.split('\n').map((content, i) => ({
        content,
        lineNumber: i + 1,
      })),
      statistics,
    };
  }

  /**
   * Extract text from a paragraph element
   */
  private extractTextFromParagraph(paragraphXml: string, _options: WordExtractionOptions): string {
    const textParts: string[] = [];

    // Extract text runs
    const runMatches = paragraphXml.matchAll(/<w:r[^>]*>([\s\S]*?)<\/w:r>/g);

    for (const match of runMatches) {
      const runContent = match[1] || '';

      // Extract text elements
      const textMatches = runContent.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g);
      for (const textMatch of textMatches) {
        textParts.push(textMatch[1] || '');
      }

      // Handle tabs
      if (runContent.includes('<w:tab/>')) {
        textParts.push('\t');
      }

      // Handle breaks
      if (runContent.includes('<w:br/>')) {
        textParts.push('\n');
      }
    }

    return textParts.join('');
  }

  /**
   * Extract paragraph style information
   */
  private extractParagraphStyle(paragraphXml: string): {
    isHeading: boolean;
    headingLevel?: number;
    fontFamily?: string;
    fontSize?: number;
    bold?: boolean;
    italic?: boolean;
    alignment?: 'left' | 'center' | 'right' | 'justify';
  } {
    const style: ReturnType<typeof this.extractParagraphStyle> = { isHeading: false };

    // Check for heading style
    const styleMatch = paragraphXml.match(/<w:pStyle\s+w:val="([^"]+)"/);
    if (styleMatch) {
      const styleName = styleMatch[1] || '';
      if (styleName.match(/Heading(\d)/i)) {
        style.isHeading = true;
        const level = styleName.match(/\d/);
        style.headingLevel = level ? parseInt(level[0]) : 1;
      }
    }

    // Check for bold
    if (paragraphXml.includes('<w:b/>') || paragraphXml.includes('<w:b ')) {
      style.bold = true;
    }

    // Check for italic
    if (paragraphXml.includes('<w:i/>') || paragraphXml.includes('<w:i ')) {
      style.italic = true;
    }

    // Check alignment
    const alignMatch = paragraphXml.match(/<w:jc\s+w:val="([^"]+)"/);
    if (alignMatch) {
      const align = alignMatch[1];
      if (align === 'left' || align === 'center' || align === 'right' || align === 'both') {
        style.alignment = align === 'both' ? 'justify' : align;
      }
    }

    // Extract font info
    const fontMatch = paragraphXml.match(/<w:rFonts[^>]*w:ascii="([^"]+)"/);
    if (fontMatch) {
      style.fontFamily = fontMatch[1];
    }

    const sizeMatch = paragraphXml.match(/<w:sz\s+w:val="(\d+)"/);
    if (sizeMatch) {
      style.fontSize = parseInt(sizeMatch[1]!) / 2; // Half-points to points
    }

    return style;
  }

  /**
   * Extract images from document
   */
  private async extractImages(): Promise<ExtractedImage[]> {
    const images: ExtractedImage[] = [];
    const mediaFolder = this.zip?.folder('word/media');

    if (!mediaFolder) return images;

    const files = Object.keys(this.zip?.files || {}).filter(f => f.startsWith('word/media/'));

    for (const filePath of files) {
      const file = this.zip?.file(filePath);
      if (!file) continue;

      const data = await file.async('nodebuffer');
      const filename = filePath.split('/').pop() || '';
      const ext = filename.split('.').pop()?.toLowerCase() || 'png';

      // Detect image dimensions (basic implementation)
      const dimensions = this.getImageDimensions(data, ext);

      images.push({
        id: generateId(),
        data,
        format: ext as ExtractedImage['format'],
        width: dimensions.width,
        height: dimensions.height,
      });
    }

    return images;
  }

  /**
   * Get image dimensions from buffer
   */
  private getImageDimensions(buffer: Buffer, format: string): { width: number; height: number } {
    try {
      if (format === 'png' && buffer.length > 24) {
        return {
          width: buffer.readUInt32BE(16),
          height: buffer.readUInt32BE(20),
        };
      }

      if ((format === 'jpg' || format === 'jpeg') && buffer.length > 2) {
        // JPEG dimension extraction is more complex
        // This is a simplified version
        let offset = 2;
        while (offset < buffer.length) {
          if (buffer[offset] !== 0xff) break;
          const marker = buffer[offset + 1];

          if (marker === 0xc0 || marker === 0xc2) {
            return {
              height: buffer.readUInt16BE(offset + 5),
              width: buffer.readUInt16BE(offset + 7),
            };
          }

          const length = buffer.readUInt16BE(offset + 2);
          offset += length + 2;
        }
      }
    } catch {
      // Ignore errors
    }

    return { width: 0, height: 0 };
  }

  /**
   * Extract tables from document
   */
  private async extractTables(): Promise<ExtractedTable[]> {
    const tables: ExtractedTable[] = [];
    const documentFile = this.zip?.file('word/document.xml');

    if (!documentFile) return tables;

    const content = await documentFile.async('text');
    const tableMatches = content.matchAll(/<w:tbl[^>]*>([\s\S]*?)<\/w:tbl>/g);

    for (const match of tableMatches) {
      const tableContent = match[1] || '';
      const rows: ExtractedTableRow[] = [];
      let maxColumns = 0;

      const rowMatches = tableContent.matchAll(/<w:tr[^>]*>([\s\S]*?)<\/w:tr>/g);
      let rowIndex = 0;

      for (const rowMatch of rowMatches) {
        const rowContent = rowMatch[1] || '';
        const cells: ExtractedTableCell[] = [];

        const cellMatches = rowContent.matchAll(/<w:tc[^>]*>([\s\S]*?)<\/w:tc>/g);
        let colIndex = 0;

        for (const cellMatch of cellMatches) {
          const cellContent = cellMatch[1] || '';
          const text = this.extractTextFromCell(cellContent);

          cells.push({
            content: text,
            columnIndex: colIndex,
            dataType: this.detectDataType(text),
          });

          colIndex++;
        }

        maxColumns = Math.max(maxColumns, cells.length);
        rows.push({
          cells,
          rowIndex,
          isHeader: rowIndex === 0,
        });

        rowIndex++;
      }

      if (rows.length > 0) {
        tables.push({
          id: generateId(),
          headers: rows[0]?.cells.map(c => c.content),
          rows,
          columnCount: maxColumns,
          rowCount: rows.length,
        });
      }
    }

    return tables;
  }

  /**
   * Extract text from table cell
   */
  private extractTextFromCell(cellXml: string): string {
    const textParts: string[] = [];
    const textMatches = cellXml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g);

    for (const match of textMatches) {
      textParts.push(match[1] || '');
    }

    return textParts.join(' ').trim();
  }

  /**
   * Detect data type of cell content
   */
  private detectDataType(content: string): ExtractedTableCell['dataType'] {
    if (!content.trim()) return 'empty';
    if (!isNaN(Number(content))) return 'number';
    if (!isNaN(Date.parse(content))) return 'date';
    if (content.toLowerCase() === 'true' || content.toLowerCase() === 'false') return 'boolean';
    return 'string';
  }

  /**
   * Extract styles from document
   */
  private async extractStyles(): Promise<ExtractedStyle[]> {
    const styles: ExtractedStyle[] = [];
    const stylesFile = this.zip?.file('word/styles.xml');

    if (!stylesFile) return styles;

    const content = await stylesFile.async('text');
    const styleMatches = content.matchAll(/<w:style\s+([^>]*)>([\s\S]*?)<\/w:style>/g);

    for (const match of styleMatches) {
      const attrs = match[1] || '';
      const styleContent = match[2] || '';

      const typeMatch = attrs.match(/w:type="([^"]+)"/);
      const idMatch = attrs.match(/w:styleId="([^"]+)"/);

      if (!typeMatch || !idMatch) continue;

      const nameMatch = styleContent.match(/<w:name\s+w:val="([^"]+)"/);
      const basedOnMatch = styleContent.match(/<w:basedOn\s+w:val="([^"]+)"/);

      styles.push({
        id: idMatch[1]!,
        name: nameMatch?.[1] || idMatch[1]!,
        type: typeMatch[1] as ExtractedStyle['type'],
        basedOn: basedOnMatch?.[1],
      });
    }

    return styles;
  }

  /**
   * Extract comments from document
   */
  private async extractComments(): Promise<ExtractedComment[]> {
    const comments: ExtractedComment[] = [];
    const commentsFile = this.zip?.file('word/comments.xml');

    if (!commentsFile) return comments;

    const content = await commentsFile.async('text');
    const commentMatches = content.matchAll(/<w:comment\s+([^>]*)>([\s\S]*?)<\/w:comment>/g);

    for (const match of commentMatches) {
      const attrs = match[1] || '';
      const commentContent = match[2] || '';

      const idMatch = attrs.match(/w:id="([^"]+)"/);
      const authorMatch = attrs.match(/w:author="([^"]+)"/);
      const dateMatch = attrs.match(/w:date="([^"]+)"/);

      // Extract text from comment
      const textMatches = commentContent.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g);
      const text = Array.from(textMatches)
        .map(m => m[1])
        .join(' ');

      comments.push({
        id: idMatch?.[1] || generateId(),
        author: authorMatch?.[1] || 'Unknown',
        content: text.trim(),
        createdAt: dateMatch?.[1] ? new Date(dateMatch[1]) : undefined,
      });
    }

    return comments;
  }

  /**
   * Extract headers or footers
   */
  private async extractHeadersFooters(type: 'header' | 'footer'): Promise<ExtractedHeaderFooter[]> {
    const results: ExtractedHeaderFooter[] = [];
    const prefix = type === 'header' ? 'header' : 'footer';

    for (let i = 1; i <= 3; i++) {
      const file = this.zip?.file(`word/${prefix}${i}.xml`);
      if (!file) continue;

      const content = await file.async('text');
      const textMatches = content.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g);
      const text = Array.from(textMatches)
        .map(m => m[1])
        .join(' ');

      results.push({
        type,
        section: i === 1 ? 'default' : i === 2 ? 'first' : 'odd',
        content: text.trim(),
      });
    }

    return results;
  }

  /**
   * Extract footnotes or endnotes
   */
  private async extractNotes(type: 'footnote' | 'endnote'): Promise<ExtractedNote[]> {
    const notes: ExtractedNote[] = [];
    const filename = type === 'footnote' ? 'footnotes.xml' : 'endnotes.xml';
    const file = this.zip?.file(`word/${filename}`);

    if (!file) return notes;

    const content = await file.async('text');
    const noteTag = type === 'footnote' ? 'w:footnote' : 'w:endnote';
    const noteMatches = content.matchAll(
      new RegExp(`<${noteTag}\\s+([^>]*)>([\\s\\S]*?)<\\/${noteTag}>`, 'g')
    );

    for (const match of noteMatches) {
      const attrs = match[1] || '';
      const noteContent = match[2] || '';

      const idMatch = attrs.match(/w:id="([^"]+)"/);
      const id = idMatch?.[1];

      // Skip separator notes
      if (id === '-1' || id === '0') continue;

      const textMatches = noteContent.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g);
      const text = Array.from(textMatches)
        .map(m => m[1])
        .join(' ');

      notes.push({
        id: id || generateId(),
        type,
        referenceNumber: parseInt(id || '0'),
        content: text.trim(),
      });
    }

    return notes;
  }

  /**
   * Extract bookmarks from document
   */
  private async extractBookmarks(): Promise<ExtractedBookmark[]> {
    const bookmarks: ExtractedBookmark[] = [];
    const documentFile = this.zip?.file('word/document.xml');

    if (!documentFile) return bookmarks;

    const content = await documentFile.async('text');
    const bookmarkMatches = content.matchAll(/<w:bookmarkStart\s+([^>]*)\/>/g);

    for (const match of bookmarkMatches) {
      const attrs = match[1] || '';
      const idMatch = attrs.match(/w:id="([^"]+)"/);
      const nameMatch = attrs.match(/w:name="([^"]+)"/);

      if (nameMatch) {
        bookmarks.push({
          id: idMatch?.[1] || generateId(),
          title: nameMatch[1]!,
          level: 0,
        });
      }
    }

    return bookmarks;
  }

  /**
   * Extract document sections
   */
  private async extractSections(): Promise<DocumentSection[]> {
    const sections: DocumentSection[] = [];
    const documentFile = this.zip?.file('word/document.xml');

    if (!documentFile) return sections;

    const content = await documentFile.async('text');
    const sectionMatches = content.matchAll(/<w:sectPr[^>]*>([\s\S]*?)<\/w:sectPr>/g);

    let sectionIndex = 0;
    for (const match of sectionMatches) {
      const sectionContent = match[1] || '';

      // Extract page size
      const pgSzMatch = sectionContent.match(/<w:pgSz\s+([^/]*)\/>/);
      const pgMarsMatch = sectionContent.match(/<w:pgMar\s+([^/]*)\/>/);

      let pageSize: PageSize = { width: 595.28, height: 841.89 }; // A4 default
      let orientation: 'portrait' | 'landscape' = 'portrait';
      let margins: PageMargins = { top: 72, right: 72, bottom: 72, left: 72 };

      if (pgSzMatch) {
        const widthMatch = pgSzMatch[1]!.match(/w:w="(\d+)"/);
        const heightMatch = pgSzMatch[1]!.match(/w:h="(\d+)"/);
        const orientMatch = pgSzMatch[1]!.match(/w:orient="([^"]+)"/);

        if (widthMatch && heightMatch) {
          // Convert twips to points (1 point = 20 twips)
          pageSize = {
            width: parseInt(widthMatch[1]!) / 20,
            height: parseInt(heightMatch[1]!) / 20,
          };
        }

        if (orientMatch) {
          orientation = orientMatch[1] === 'landscape' ? 'landscape' : 'portrait';
        }
      }

      if (pgMarsMatch) {
        const topMatch = pgMarsMatch[1]!.match(/w:top="(\d+)"/);
        const rightMatch = pgMarsMatch[1]!.match(/w:right="(\d+)"/);
        const bottomMatch = pgMarsMatch[1]!.match(/w:bottom="(\d+)"/);
        const leftMatch = pgMarsMatch[1]!.match(/w:left="(\d+)"/);

        margins = {
          top: topMatch ? parseInt(topMatch[1]!) / 20 : 72,
          right: rightMatch ? parseInt(rightMatch[1]!) / 20 : 72,
          bottom: bottomMatch ? parseInt(bottomMatch[1]!) / 20 : 72,
          left: leftMatch ? parseInt(leftMatch[1]!) / 20 : 72,
        };
      }

      // Extract columns
      const colsMatch = sectionContent.match(/<w:cols\s+w:num="(\d+)"/);
      const columns = colsMatch ? parseInt(colsMatch[1]!) : 1;

      sections.push({
        id: generateId(),
        startPage: sectionIndex + 1,
        endPage: sectionIndex + 1, // Would need more analysis for actual page count
        orientation,
        pageSize,
        margins,
        columns,
      });

      sectionIndex++;
    }

    return sections;
  }

  /**
   * Extract value from XML element
   */
  private extractXmlValue(xml: string, tagName: string): string | undefined {
    const regex = new RegExp(`<${tagName}[^>]*>([^<]*)</${tagName}>`);
    const match = xml.match(regex);
    return match?.[1]?.trim() || undefined;
  }
}

export { WordExtractor as default };
