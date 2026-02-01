/**
 * PDF Extractor
 * Extract text, images, tables, links, annotations, forms, and metadata from PDF files
 */

import { PDFDocument, PDFName, PDFDict, PDFArray, PDFStream, PDFRef } from 'pdf-lib';
import { BaseExtractor, ExtractorUtils } from './base.js';
import type {
  FileFormat,
  InputDataType,
  ExtractionResult,
  PDFExtractionOptions,
  PDFExtractionResult,
  ExtractedText,
  ExtractedImage,
  ExtractedTable,
  ExtractedLink,
  ExtractedAnnotation,
  ExtractedFormField,
  ExtractedBookmark,
  ExtractedAttachment,
  DocumentMetadata,
  TextStatistics,
  PageText,
  TextBlock,
  BoundingBox,
} from '../core/types.js';
import { ConvertFileError, ErrorCode } from '../core/errors.js';
import { generateId } from '../utils/helpers.js';

/**
 * Default PDF extraction options
 */
const DEFAULT_PDF_OPTIONS: PDFExtractionOptions = {
  extractText: true,
  extractImages: true,
  extractTables: true,
  extractLinks: true,
  extractAnnotations: true,
  extractForms: true,
  extractBookmarks: true,
  extractAttachments: true,
  extractMetadata: true,
  pages: 'all',
  preserveLayout: false,
  ocrIfNeeded: false,
  imageFormat: 'png',
  imageQuality: 90,
  minImageSize: 100,
};

export class PDFExtractor extends BaseExtractor {
  constructor() {
    super('pdf');
  }

  getSupportedFormats(): FileFormat[] {
    return ['pdf'];
  }

  async extract<T>(
    data: InputDataType,
    options: Record<string, unknown>
  ): Promise<ExtractionResult<T>> {
    const opts: PDFExtractionOptions = { ...DEFAULT_PDF_OPTIONS, ...options };
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);

    try {
      const pdfDoc = await PDFDocument.load(buffer, {
        ignoreEncryption: false,
        updateMetadata: false,
      });

      const result: PDFExtractionResult['data'] = {};
      const warnings: string[] = [];

      // Extract metadata
      const metadata = await this.extractMetadata(pdfDoc);

      // Get page range
      const pageCount = pdfDoc.getPageCount();
      const pagesToProcess = this.getPageRange(opts.pages, pageCount);

      // Extract text
      if (opts.extractText) {
        try {
          result.text = await this.extractText(pdfDoc, pagesToProcess, opts);
        } catch (error) {
          warnings.push(`Text extraction failed: ${(error as Error).message}`);
        }
      }

      // Extract images
      if (opts.extractImages) {
        try {
          result.images = await this.extractImages(pdfDoc, pagesToProcess, opts);
        } catch (error) {
          warnings.push(`Image extraction failed: ${(error as Error).message}`);
        }
      }

      // Extract tables
      if (opts.extractTables) {
        try {
          result.tables = await this.extractTables(pdfDoc, pagesToProcess);
        } catch (error) {
          warnings.push(`Table extraction failed: ${(error as Error).message}`);
        }
      }

      // Extract links
      if (opts.extractLinks) {
        try {
          result.links = await this.extractLinks(pdfDoc, pagesToProcess);
        } catch (error) {
          warnings.push(`Link extraction failed: ${(error as Error).message}`);
        }
      }

      // Extract annotations
      if (opts.extractAnnotations) {
        try {
          result.annotations = await this.extractAnnotations(pdfDoc, pagesToProcess);
        } catch (error) {
          warnings.push(`Annotation extraction failed: ${(error as Error).message}`);
        }
      }

      // Extract form fields
      if (opts.extractForms) {
        try {
          result.formFields = await this.extractFormFields(pdfDoc);
        } catch (error) {
          warnings.push(`Form field extraction failed: ${(error as Error).message}`);
        }
      }

      // Extract bookmarks
      if (opts.extractBookmarks) {
        try {
          result.bookmarks = await this.extractBookmarks(pdfDoc);
        } catch (error) {
          warnings.push(`Bookmark extraction failed: ${(error as Error).message}`);
        }
      }

      // Extract attachments
      if (opts.extractAttachments) {
        try {
          result.attachments = await this.extractAttachments(pdfDoc);
        } catch (error) {
          warnings.push(`Attachment extraction failed: ${(error as Error).message}`);
        }
      }

      return this.createResult(result as T, metadata, {
        warnings: warnings.length > 0 ? warnings : undefined,
      });
    } catch (error) {
      throw new ConvertFileError(
        ErrorCode.EXTRACTION_FAILED,
        `PDF extraction failed: ${(error as Error).message}`,
        { cause: error as Error }
      );
    }
  }

  /**
   * Extract document metadata
   */
  private async extractMetadata(pdfDoc: PDFDocument): Promise<DocumentMetadata> {
    const pageCount = pdfDoc.getPageCount();

    return {
      title: pdfDoc.getTitle() || undefined,
      author: pdfDoc.getAuthor() || undefined,
      subject: pdfDoc.getSubject() || undefined,
      keywords:
        pdfDoc
          .getKeywords()
          ?.split(',')
          .map(k => k.trim()) || undefined,
      creator: pdfDoc.getCreator() || undefined,
      producer: pdfDoc.getProducer() || undefined,
      creationDate: pdfDoc.getCreationDate() || undefined,
      modificationDate: pdfDoc.getModificationDate() || undefined,
      pageCount,
      version: `PDF ${typeof pdfDoc.getForm === 'function' ? '1.7' : '1.4'}`,
    };
  }

  /**
   * Extract text content from PDF
   */
  private async extractText(
    pdfDoc: PDFDocument,
    pages: number[],
    _options: PDFExtractionOptions
  ): Promise<ExtractedText> {
    const pageTexts: PageText[] = [];
    let fullText = '';

    for (const pageNum of pages) {
      const page = pdfDoc.getPage(pageNum - 1);
      const { width, height } = page.getSize();

      // Extract text using pdf-lib's content streams
      const pageText = await this.extractPageText(page, pageNum);

      pageTexts.push({
        pageNumber: pageNum,
        content: pageText,
        paragraphs: this.splitIntoParagraphs(pageText, pageNum),
        lines: this.splitIntoLines(pageText, pageNum),
        boundingBox: { x: 0, y: 0, width, height, pageNumber: pageNum },
      });

      fullText += pageText + '\n';
    }

    const stats = ExtractorUtils.calculateTextStatistics(fullText);
    const words = fullText.split(/\s+/).filter(w => w.length > 0);
    const syllables = words.reduce((sum, word) => sum + ExtractorUtils.countSyllables(word), 0);

    const statistics: TextStatistics = {
      totalCharacters: stats.characters,
      totalWords: stats.words,
      totalSentences: stats.sentences,
      totalParagraphs: stats.paragraphs,
      totalPages: pages.length,
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
      pages: pageTexts,
      paragraphs: pageTexts.flatMap(p => p.paragraphs),
      lines: pageTexts.flatMap(p => p.lines),
      statistics,
    };
  }

  /**
   * Extract text from a single page
   */
  private async extractPageText(page: any, _pageNum: number): Promise<string> {
    // pdf-lib doesn't provide direct text extraction, so we'll work with the content stream
    // For full text extraction, we need to parse the content streams
    // This is a simplified implementation

    try {
      const node = page.node;
      const contents = node.get(PDFName.of('Contents'));

      if (!contents) {
        return '';
      }

      let text = '';

      // Handle single or array of content streams
      const streams = contents instanceof PDFArray ? contents.asArray() : [contents];

      for (const streamRef of streams) {
        if (streamRef instanceof PDFRef) {
          const stream = page.doc.context.lookup(streamRef);
          if (stream instanceof PDFStream) {
            const content = await this.decodeContentStream(stream);
            text += this.extractTextFromContent(content);
          }
        }
      }

      return text.trim();
    } catch (_error) {
      // Return empty string if text extraction fails
      return '';
    }
  }

  /**
   * Decode content stream
   */
  private async decodeContentStream(stream: PDFStream): Promise<string> {
    try {
      const encoded = stream.getContents();
      // Simple implementation - actual PDF text extraction requires full content stream parsing
      return encoded.toString();
    } catch {
      return '';
    }
  }

  /**
   * Extract text from content stream
   */
  private extractTextFromContent(content: string): string {
    const textMatches: string[] = [];

    // Match text showing operators: Tj, TJ, ', "
    // This is a simplified regex - full implementation would need proper PDF parsing
    const tjRegex = /\(([^)]*)\)\s*Tj/g;
    const tjArrayRegex = /\[([^\]]*)\]\s*TJ/g;

    let match;

    while ((match = tjRegex.exec(content)) !== null) {
      textMatches.push(this.decodePdfString(match[1] || ''));
    }

    while ((match = tjArrayRegex.exec(content)) !== null) {
      const arrayContent = match[1] || '';
      const stringMatches = arrayContent.match(/\(([^)]*)\)/g);
      if (stringMatches) {
        for (const str of stringMatches) {
          textMatches.push(this.decodePdfString(str.slice(1, -1)));
        }
      }
    }

    return textMatches.join(' ');
  }

  /**
   * Decode PDF string escape sequences
   */
  private decodePdfString(str: string): string {
    return str
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\b/g, '\b')
      .replace(/\\f/g, '\f')
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      .replace(/\\\\/g, '\\');
  }

  /**
   * Split text into paragraphs
   */
  private splitIntoParagraphs(text: string, _pageNumber: number): TextBlock[] {
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
    return paragraphs.map((content, _index) => ({
      id: generateId(),
      content: content.trim(),
      type: 'paragraph' as const,
      pageNumber: _pageNumber,
    }));
  }

  /**
   * Split text into lines
   */
  private splitIntoLines(
    text: string,
    _pageNumber: number
  ): { content: string; lineNumber: number }[] {
    return text.split('\n').map((content, index) => ({
      content,
      lineNumber: index + 1,
    }));
  }

  /**
   * Extract images from PDF
   */
  private async extractImages(
    pdfDoc: PDFDocument,
    pages: number[],
    options: PDFExtractionOptions
  ): Promise<ExtractedImage[]> {
    const images: ExtractedImage[] = [];

    for (const pageNum of pages) {
      const page = pdfDoc.getPage(pageNum - 1);
      const node = page.node;

      // Get resources
      const resources = node.get(PDFName.of('Resources'));
      if (!(resources instanceof PDFDict)) continue;

      // Get XObject dictionary
      const xObjects = resources.get(PDFName.of('XObject'));
      if (!(xObjects instanceof PDFDict)) continue;

      // Iterate through XObjects looking for images
      const entries = xObjects.entries();
      for (const [_name, ref] of entries) {
        if (!(ref instanceof PDFRef)) continue;

        try {
          const xObject = pdfDoc.context.lookup(ref);
          if (!(xObject instanceof PDFStream)) continue;

          const subtype = xObject.dict.get(PDFName.of('Subtype'));
          if (subtype?.toString() !== '/Image') continue;

          const width = xObject.dict.get(PDFName.of('Width'));
          const height = xObject.dict.get(PDFName.of('Height'));

          if (!width || !height) continue;

          const imgWidth = parseInt(width.toString());
          const imgHeight = parseInt(height.toString());

          // Skip small images
          if (
            options.minImageSize &&
            (imgWidth < options.minImageSize || imgHeight < options.minImageSize)
          ) {
            continue;
          }

          // Extract image data
          const imageData = xObject.getContents();

          images.push({
            id: generateId(),
            data: Buffer.from(imageData),
            format: options.imageFormat || 'png',
            width: imgWidth,
            height: imgHeight,
            pageNumber: pageNum,
          });
        } catch (_error) {
          // Skip problematic images
          continue;
        }
      }
    }

    return images;
  }

  /**
   * Extract tables from PDF
   */
  private async extractTables(_pdfDoc: PDFDocument, pages: number[]): Promise<ExtractedTable[]> {
    const tables: ExtractedTable[] = [];

    // Table extraction from PDFs is complex and typically requires
    // specialized libraries or heuristics based on line detection
    // This is a placeholder implementation

    for (const _pageNum of pages) {
      // Basic table detection would analyze:
      // 1. Line patterns (horizontal/vertical lines)
      // 2. Text positioning patterns
      // 3. Cell boundaries
      // For now, return empty array - full implementation would use
      // libraries like tabula-js or implement line detection
    }

    return tables;
  }

  /**
   * Extract links from PDF
   */
  private async extractLinks(pdfDoc: PDFDocument, pages: number[]): Promise<ExtractedLink[]> {
    const links: ExtractedLink[] = [];

    for (const pageNum of pages) {
      const page = pdfDoc.getPage(pageNum - 1);
      const node = page.node;

      // Get annotations
      const annots = node.get(PDFName.of('Annots'));
      if (!(annots instanceof PDFArray)) continue;

      for (const annotRef of annots.asArray()) {
        if (!(annotRef instanceof PDFRef)) continue;

        try {
          const annot = pdfDoc.context.lookup(annotRef);
          if (!(annot instanceof PDFDict)) continue;

          const subtype = annot.get(PDFName.of('Subtype'));
          if (subtype?.toString() !== '/Link') continue;

          // Get action
          const action = annot.get(PDFName.of('A'));
          if (!(action instanceof PDFDict)) continue;

          const actionType = action.get(PDFName.of('S'));

          if (actionType?.toString() === '/URI') {
            const uri = action.get(PDFName.of('URI'));
            if (uri) {
              const url = uri.toString().replace(/^\(|\)$/g, '');
              links.push({
                id: generateId(),
                text: url,
                url,
                type: this.getLinkType(url),
                pageNumber: pageNum,
              });
            }
          }
        } catch (_error) {
          continue;
        }
      }
    }

    return links;
  }

  /**
   * Determine link type from URL
   */
  private getLinkType(url: string): 'external' | 'internal' | 'email' | 'phone' | 'anchor' {
    if (url.startsWith('mailto:')) return 'email';
    if (url.startsWith('tel:')) return 'phone';
    if (url.startsWith('#')) return 'anchor';
    if (url.startsWith('http://') || url.startsWith('https://')) return 'external';
    return 'internal';
  }

  /**
   * Extract annotations from PDF
   */
  private async extractAnnotations(
    pdfDoc: PDFDocument,
    pages: number[]
  ): Promise<ExtractedAnnotation[]> {
    const annotations: ExtractedAnnotation[] = [];

    const annotTypeMap: Record<string, ExtractedAnnotation['type']> = {
      '/Highlight': 'highlight',
      '/Underline': 'underline',
      '/StrikeOut': 'strikeout',
      '/Text': 'note',
      '/FreeText': 'freeText',
      '/Stamp': 'stamp',
      '/Ink': 'drawing',
    };

    for (const pageNum of pages) {
      const page = pdfDoc.getPage(pageNum - 1);
      const node = page.node;

      const annots = node.get(PDFName.of('Annots'));
      if (!(annots instanceof PDFArray)) continue;

      for (const annotRef of annots.asArray()) {
        if (!(annotRef instanceof PDFRef)) continue;

        try {
          const annot = pdfDoc.context.lookup(annotRef);
          if (!(annot instanceof PDFDict)) continue;

          const subtype = annot.get(PDFName.of('Subtype'))?.toString();
          if (!subtype || subtype === '/Link') continue;

          const type = annotTypeMap[subtype];
          if (!type) continue;

          const contents = annot.get(PDFName.of('Contents'));
          const author = annot.get(PDFName.of('T'));
          const _modDate = annot.get(PDFName.of('M'));
          const rect = annot.get(PDFName.of('Rect'));

          let boundingBox: BoundingBox | undefined;
          if (rect instanceof PDFArray && rect.size() === 4) {
            const coords = rect.asArray().map(n => parseFloat(n.toString()));
            boundingBox = {
              x: coords[0] || 0,
              y: coords[1] || 0,
              width: (coords[2] || 0) - (coords[0] || 0),
              height: (coords[3] || 0) - (coords[1] || 0),
              pageNumber: pageNum,
            };
          }

          annotations.push({
            id: generateId(),
            type,
            content: contents?.toString().replace(/^\(|\)$/g, ''),
            author: author?.toString().replace(/^\(|\)$/g, ''),
            pageNumber: pageNum,
            boundingBox,
          });
        } catch (_error) {
          continue;
        }
      }
    }

    return annotations;
  }

  /**
   * Extract form fields from PDF
   */
  private async extractFormFields(pdfDoc: PDFDocument): Promise<ExtractedFormField[]> {
    const fields: ExtractedFormField[] = [];

    try {
      const form = pdfDoc.getForm();
      const pdfFields = form.getFields();

      for (const field of pdfFields) {
        const name = field.getName();
        const fieldType = field.constructor.name;

        let type: ExtractedFormField['type'] = 'text';
        let value: unknown;
        let options: string[] | undefined;

        switch (fieldType) {
          case 'PDFTextField':
            type = 'text';
            value = (field as any).getText?.();
            break;
          case 'PDFCheckBox':
            type = 'checkbox';
            value = (field as any).isChecked?.();
            break;
          case 'PDFRadioGroup':
            type = 'radio';
            value = (field as any).getSelected?.();
            options = (field as any).getOptions?.();
            break;
          case 'PDFDropdown':
            type = 'select';
            value = (field as any).getSelected?.();
            options = (field as any).getOptions?.();
            break;
          case 'PDFButton':
            type = 'button';
            break;
          case 'PDFSignature':
            type = 'signature';
            break;
        }

        fields.push({
          id: generateId(),
          name,
          type,
          value,
          options,
          readOnly: field.isReadOnly(),
        });
      }
    } catch (_error) {
      // Form extraction failed - return empty array
    }

    return fields;
  }

  /**
   * Extract bookmarks/outline from PDF
   */
  private async extractBookmarks(pdfDoc: PDFDocument): Promise<ExtractedBookmark[]> {
    const bookmarks: ExtractedBookmark[] = [];

    try {
      const catalog = pdfDoc.catalog;
      const outlines = catalog.get(PDFName.of('Outlines'));

      if (outlines instanceof PDFRef) {
        const outlinesDict = pdfDoc.context.lookup(outlines);
        if (outlinesDict instanceof PDFDict) {
          await this.extractBookmarkNode(pdfDoc, outlinesDict, bookmarks, 0);
        }
      }
    } catch (_error) {
      // Bookmark extraction failed
    }

    return bookmarks;
  }

  /**
   * Recursively extract bookmark nodes
   */
  private async extractBookmarkNode(
    pdfDoc: PDFDocument,
    node: PDFDict,
    bookmarks: ExtractedBookmark[],
    level: number
  ): Promise<void> {
    const first = node.get(PDFName.of('First'));

    if (first instanceof PDFRef) {
      let current: PDFRef | null = first;

      while (current) {
        const currentDictValue: unknown = pdfDoc.context.lookup(current);
        const currentDict: PDFDict | null =
          currentDictValue instanceof PDFDict ? currentDictValue : null;
        if (!currentDict) break;

        const title = currentDict.get(PDFName.of('Title'));

        if (title) {
          const bookmark: ExtractedBookmark = {
            id: generateId(),
            title: title.toString().replace(/^\(|\)$/g, ''),
            level,
            children: [],
          };

          // Get destination page if available
          const dest = currentDict.get(PDFName.of('Dest'));
          if (dest instanceof PDFArray && dest.size() > 0) {
            const pageRef = dest.get(0);
            if (pageRef instanceof PDFRef) {
              const pages = pdfDoc.getPages();
              const pageIndex = pages.findIndex(p => p.ref === pageRef);
              if (pageIndex >= 0) {
                bookmark.pageNumber = pageIndex + 1;
              }
            }
          }

          // Recursively extract children
          await this.extractBookmarkNode(pdfDoc, currentDict, bookmark.children!, level + 1);

          bookmarks.push(bookmark);
        }

        // Move to next sibling
        const nextValue: unknown = currentDict.get(PDFName.of('Next'));
        const next: PDFRef | null = nextValue instanceof PDFRef ? nextValue : null;
        current = next;
      }
    }
  }

  /**
   * Extract embedded attachments from PDF
   */
  private async extractAttachments(pdfDoc: PDFDocument): Promise<ExtractedAttachment[]> {
    const attachments: ExtractedAttachment[] = [];

    try {
      const catalog = pdfDoc.catalog;
      const names = catalog.get(PDFName.of('Names'));

      if (!(names instanceof PDFDict)) return attachments;

      const embeddedFiles = names.get(PDFName.of('EmbeddedFiles'));
      if (!(embeddedFiles instanceof PDFDict)) return attachments;

      // Extract from Names array
      const namesArray = embeddedFiles.get(PDFName.of('Names'));
      if (namesArray instanceof PDFArray) {
        const arr = namesArray.asArray();

        for (let i = 0; i < arr.length; i += 2) {
          const filename = arr[i];
          const fileRef = arr[i + 1];

          if (!(fileRef instanceof PDFRef)) continue;

          const fileDict = pdfDoc.context.lookup(fileRef);
          if (!(fileDict instanceof PDFDict)) continue;

          const ef = fileDict.get(PDFName.of('EF'));
          if (!(ef instanceof PDFDict)) continue;

          const f = ef.get(PDFName.of('F'));
          if (!(f instanceof PDFRef)) continue;

          const stream = pdfDoc.context.lookup(f);
          if (!(stream instanceof PDFStream)) continue;

          const data = stream.getContents();
          const name = filename?.toString().replace(/^\(|\)$/g, '') || 'attachment';

          attachments.push({
            id: generateId(),
            filename: name,
            data: Buffer.from(data),
            mimeType: this.guessMimeType(name),
            size: data.length,
          });
        }
      }
    } catch (_error) {
      // Attachment extraction failed
    }

    return attachments;
  }

  /**
   * Guess MIME type from filename
   */
  private guessMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      txt: 'text/plain',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      zip: 'application/zip',
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
  }

  /**
   * Get page range from options
   */
  private getPageRange(pages: number[] | 'all' | undefined, totalPages: number): number[] {
    if (!pages || pages === 'all') {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    return pages.filter(p => p >= 1 && p <= totalPages);
  }
}

export { PDFExtractor as default };
