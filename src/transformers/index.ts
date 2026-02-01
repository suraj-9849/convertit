/**
 * convertit - Transformers
 * Post-processing operations for converted files
 */

import type {
  CompressionConfig,
  WatermarkConfig,
  EncryptionConfig,
  MergeConfig,
  SplitConfig,
  RotateConfig,
} from '../core/types.js';
import { ConvertFileError, ErrorCode } from '../core/errors.js';
import { PDFManipulator } from '../converters/pdf.js';
import { ExcelUtils } from '../converters/excel.js';
import { CSVUtils } from '../converters/csv.js';
import { ImageUtils } from '../converters/image.js';
import sharp from 'sharp';

/**
 * Compression Transformer
 * Reduces file size while maintaining quality
 */
export class CompressionTransformer {
  static async compress(data: Buffer, format: string, config: CompressionConfig): Promise<Buffer> {
    const qualityMap = {
      low: 90,
      medium: 75,
      high: 50,
      maximum: 30,
    };

    const quality = config.quality ?? qualityMap[config.level || 'medium'];

    switch (format) {
      case 'pdf':
        // PDF compression is limited without external tools
        // Return original for now
        return data;

      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'webp':
        return ImageUtils.compress(data, quality, format as any);

      case 'xlsx':
      case 'excel':
        // Excel files are already compressed (ZIP-based)
        return data;

      default:
        return data;
    }
  }

  /**
   * Estimate compression ratio
   */
  static estimateCompression(originalSize: number, level: CompressionConfig['level']): number {
    const ratios = {
      low: 0.9,
      medium: 0.7,
      high: 0.5,
      maximum: 0.3,
    };
    return Math.round(originalSize * ratios[level || 'medium']);
  }
}

/**
 * Merge Transformer
 * Combines multiple files into one
 */
export class MergeTransformer {
  static async merge(files: Buffer[], format: string, _config?: MergeConfig): Promise<Buffer> {
    if (files.length === 0) {
      throw new ConvertFileError(ErrorCode.INVALID_INPUT, 'No files to merge');
    }

    if (files.length === 1) {
      return files[0]!;
    }

    switch (format) {
      case 'pdf':
        return PDFManipulator.merge(files);

      case 'xlsx':
      case 'excel':
        return ExcelUtils.merge(files);

      case 'csv': {
        const merged = CSVUtils.merge(files.map(f => f.toString('utf-8')));
        return Buffer.from(merged, 'utf-8');
      }

      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'webp':
        return ImageUtils.merge(files);

      case 'txt':
      case 'json':
      case 'md':
      case 'markdown':
        // Text files - concatenate with separators
        return Buffer.from(files.map(f => f.toString('utf-8')).join('\n\n---\n\n'), 'utf-8');

      default:
        throw new ConvertFileError(
          ErrorCode.UNSUPPORTED_FORMAT,
          `Merge not supported for format: ${format}`
        );
    }
  }
}

/**
 * Split Transformer
 * Divides files into multiple parts
 */
export class SplitTransformer {
  static async split(data: Buffer, format: string, config: SplitConfig): Promise<Buffer[]> {
    switch (format) {
      case 'pdf':
        if (config.mode === 'pages' && config.pages) {
          return PDFManipulator.split(data, config.pages);
        }
        if (config.mode === 'ranges' && config.ranges) {
          return PDFManipulator.splitByRanges(data, config.ranges);
        }
        throw new ConvertFileError(ErrorCode.INVALID_OPTIONS, 'Invalid split configuration');

      case 'txt':
      case 'csv':
      case 'json':
        return this.splitTextBySize(data, config);

      default:
        throw new ConvertFileError(
          ErrorCode.UNSUPPORTED_FORMAT,
          `Split not supported for format: ${format}`
        );
    }
  }

  private static splitTextBySize(data: Buffer, config: SplitConfig): Buffer[] {
    if (config.mode !== 'size' || !config.maxSize) {
      throw new ConvertFileError(ErrorCode.INVALID_OPTIONS, 'Size split requires maxSize');
    }

    const text = data.toString('utf-8');
    const lines = text.split('\n');
    const results: Buffer[] = [];
    let currentChunk: string[] = [];
    let currentSize = 0;

    for (const line of lines) {
      const lineSize = Buffer.byteLength(line + '\n', 'utf-8');

      if (currentSize + lineSize > config.maxSize && currentChunk.length > 0) {
        results.push(Buffer.from(currentChunk.join('\n'), 'utf-8'));
        currentChunk = [];
        currentSize = 0;
      }

      currentChunk.push(line);
      currentSize += lineSize;
    }

    if (currentChunk.length > 0) {
      results.push(Buffer.from(currentChunk.join('\n'), 'utf-8'));
    }

    return results;
  }
}

/**
 * Watermark Transformer
 * Adds watermarks to documents and images
 */
export class WatermarkTransformer {
  static async addWatermark(
    data: Buffer,
    format: string,
    config: WatermarkConfig
  ): Promise<Buffer> {
    switch (format) {
      case 'pdf':
        if (config.text) {
          return PDFManipulator.addTextWatermark(data, config.text, {
            opacity: config.opacity,
            rotation: config.rotation,
            fontSize: config.font?.size,
          });
        }
        throw new ConvertFileError(ErrorCode.INVALID_OPTIONS, 'PDF watermark requires text');

      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'webp':
        if (config.image) {
          const watermarkBuffer =
            typeof config.image === 'string' ? Buffer.from(config.image, 'base64') : config.image;
          return ImageUtils.addWatermark(data, watermarkBuffer, {
            position: config.position as any,
            opacity: config.opacity,
          });
        }
        // Create text watermark image
        if (config.text) {
          const watermarkImage = await this.createTextWatermarkImage(config);
          return ImageUtils.addWatermark(data, watermarkImage, {
            position: config.position as any,
            opacity: config.opacity,
          });
        }
        throw new ConvertFileError(ErrorCode.INVALID_OPTIONS, 'Watermark requires text or image');

      default:
        throw new ConvertFileError(
          ErrorCode.UNSUPPORTED_FORMAT,
          `Watermark not supported for format: ${format}`
        );
    }
  }

  private static async createTextWatermarkImage(config: WatermarkConfig): Promise<Buffer> {
    const text = config.text || 'Watermark';
    const fontSize = config.font?.size || 24;
    const width = text.length * fontSize;
    const height = fontSize * 2;

    // Create SVG text
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <text 
          x="50%" 
          y="50%" 
          font-family="${config.font?.family || 'Arial'}"
          font-size="${fontSize}"
          fill="${config.font?.color || '#000000'}"
          text-anchor="middle"
          dominant-baseline="middle"
        >${text}</text>
      </svg>
    `;

    return sharp(Buffer.from(svg)).png().toBuffer();
  }
}

/**
 * Rotation Transformer
 * Rotates pages in documents
 */
export class RotationTransformer {
  static async rotate(data: Buffer, format: string, config: RotateConfig): Promise<Buffer> {
    switch (format) {
      case 'pdf': {
        const pages =
          config.pages === 'all'
            ? undefined
            : config.pages === 'odd'
              ? Array.from({ length: 100 }, (_, i) => i * 2 + 1)
              : config.pages === 'even'
                ? Array.from({ length: 100 }, (_, i) => (i + 1) * 2)
                : config.pages;
        return PDFManipulator.rotatePages(data, config.angle, pages);
      }

      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'webp':
        return ImageUtils.rotate(data, config.angle);

      default:
        throw new ConvertFileError(
          ErrorCode.UNSUPPORTED_FORMAT,
          `Rotation not supported for format: ${format}`
        );
    }
  }
}

/**
 * Encryption Transformer
 * Password protects files
 */
export class EncryptionTransformer {
  static async encrypt(data: Buffer, format: string, _config: EncryptionConfig): Promise<Buffer> {
    // Note: Full encryption requires additional libraries
    // This is a placeholder for the encryption functionality
    switch (format) {
      case 'pdf':
        // PDF encryption would require pdf-lib encryption features
        // or external tools like qpdf
        console.warn('PDF encryption is not fully implemented');
        return data;

      case 'xlsx':
      case 'excel':
        // Excel protection is handled in the converter
        console.warn('Excel encryption should be set during creation');
        return data;

      default:
        throw new ConvertFileError(
          ErrorCode.UNSUPPORTED_FORMAT,
          `Encryption not supported for format: ${format}`
        );
    }
  }
}

/**
 * Page Number Transformer
 * Adds page numbers to documents
 */
export class PageNumberTransformer {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static async addPageNumbers(data: Buffer, format: string, _config: any): Promise<Buffer> {
    switch (format) {
      case 'pdf':
        // Page numbering should be handled during PDF creation
        // Post-processing would require re-rendering
        console.warn('PDF page numbering should be set during creation');
        return data;

      default:
        throw new ConvertFileError(
          ErrorCode.UNSUPPORTED_FORMAT,
          `Page numbers not supported for format: ${format}`
        );
    }
  }
}
