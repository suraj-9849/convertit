/**
 * Image Extractor
 * Extract metadata, EXIF, IPTC, colors, and text (OCR) from images
 */

import sharp from 'sharp';
import { BaseExtractor } from './base.js';
import type {
  FileFormat,
  InputDataType,
  ExtractionResult,
  ImageExtractionOptions,
  ImageExtractionResult,
  ExtractedText,
  DocumentMetadata,
  ImageMetadata,
  ExifData,
  DominantColor,
  TextStatistics,
} from '../core/types.js';
import { ConvertFileError, ErrorCode } from '../core/errors.js';

/**
 * Default image extraction options
 */
const DEFAULT_IMAGE_OPTIONS: ImageExtractionOptions = {
  extractMetadata: true,
  extractExif: true,
  extractIptc: true,
  extractXmp: true,
  extractColors: true,
  extractText: false,
  colorCount: 5,
  analyzeFaces: false,
  analyzeObjects: false,
};

export class ImageExtractor extends BaseExtractor {
  constructor() {
    super('png');
  }

  getSupportedFormats(): FileFormat[] {
    return ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tiff', 'svg'];
  }

  async extract<T>(
    data: InputDataType,
    options: Record<string, unknown>
  ): Promise<ExtractionResult<T>> {
    const opts: ImageExtractionOptions = { ...DEFAULT_IMAGE_OPTIONS, ...options };
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);

    try {
      const image = sharp(buffer);
      const sharpMetadata = await image.metadata();
      const stats = await image.stats();

      const result: ImageExtractionResult['data'] = {
        dimensions: {
          width: sharpMetadata.width || 0,
          height: sharpMetadata.height || 0,
        },
        format: sharpMetadata.format || 'unknown',
        colorSpace: sharpMetadata.space || 'unknown',
        bitDepth: typeof sharpMetadata.depth === 'number' ? sharpMetadata.depth : 8,
        hasAlpha: sharpMetadata.hasAlpha || false,
        isAnimated: (sharpMetadata.pages || 1) > 1,
        frameCount: typeof sharpMetadata.pages === 'number' ? sharpMetadata.pages : undefined,
      };

      const warnings: string[] = [];

      // Extract metadata
      if (opts.extractMetadata) {
        try {
          result.metadata = await this.extractImageMetadata(buffer, sharpMetadata, opts);
        } catch (error) {
          warnings.push(`Metadata extraction failed: ${(error as Error).message}`);
        }
      }

      // Extract dominant colors
      if (opts.extractColors) {
        try {
          result.dominantColors = await this.extractDominantColors(
            image,
            stats,
            opts.colorCount || 5
          );
        } catch (error) {
          warnings.push(`Color extraction failed: ${(error as Error).message}`);
        }
      }

      // Extract text (OCR) - placeholder for external OCR integration
      if (opts.extractText) {
        try {
          result.text = await this.extractTextFromImage(buffer, opts);
        } catch (error) {
          warnings.push(`Text extraction failed: ${(error as Error).message}`);
        }
      }

      // Document metadata
      const metadata: DocumentMetadata = {
        fileSize: buffer.length,
        customProperties: {
          width: sharpMetadata.width,
          height: sharpMetadata.height,
          format: sharpMetadata.format,
          colorSpace: sharpMetadata.space,
          density: sharpMetadata.density,
          chromaSubsampling: sharpMetadata.chromaSubsampling,
          isProgressive: sharpMetadata.isProgressive,
          hasProfile: sharpMetadata.hasProfile,
        },
      };

      if (result.metadata?.exif?.dateTime) {
        metadata.creationDate = result.metadata.exif.dateTime;
      }

      return this.createResult(result as T, metadata, {
        warnings: warnings.length > 0 ? warnings : undefined,
      });
    } catch (error) {
      throw new ConvertFileError(
        ErrorCode.EXTRACTION_FAILED,
        `Image extraction failed: ${(error as Error).message}`,
        { cause: error as Error }
      );
    }
  }

  /**
   * Extract image metadata including EXIF, IPTC, XMP
   */
  private async extractImageMetadata(
    buffer: Buffer,
    sharpMetadata: sharp.Metadata,
    opts: ImageExtractionOptions
  ): Promise<ImageMetadata> {
    const metadata: ImageMetadata = {};

    // Extract EXIF data
    if (opts.extractExif && sharpMetadata.exif) {
      metadata.exif = this.parseExifData(sharpMetadata.exif);
    }

    // Extract IPTC data
    if (opts.extractIptc && sharpMetadata.iptc) {
      metadata.iptc = this.parseIptcData(sharpMetadata.iptc);
    }

    // Extract XMP data
    if (opts.extractXmp && sharpMetadata.xmp) {
      metadata.xmp = this.parseXmpData(sharpMetadata.xmp);
    }

    // Extract ICC profile info
    if (sharpMetadata.icc) {
      metadata.icc = this.parseIccProfile(sharpMetadata.icc);
    }

    return metadata;
  }

  /**
   * Parse EXIF data from buffer
   */
  private parseExifData(exifBuffer: Buffer): ExifData {
    const exif: ExifData = {};

    try {
      // Basic EXIF parsing - for full support, consider using exif-parser or similar
      const data = exifBuffer.toString('binary');

      // Try to extract common EXIF fields
      // This is a simplified implementation

      // Look for Make
      const makeMatch = this.findExifValue(data, 0x010f);
      if (makeMatch) exif.make = makeMatch;

      // Look for Model
      const modelMatch = this.findExifValue(data, 0x0110);
      if (modelMatch) exif.model = modelMatch;

      // Look for Software
      const softwareMatch = this.findExifValue(data, 0x0131);
      if (softwareMatch) exif.software = softwareMatch;

      // Look for DateTime
      const dateMatch = this.findExifValue(data, 0x0132);
      if (dateMatch) {
        try {
          exif.dateTime = new Date(dateMatch.replace(/:/g, '-').replace(' ', 'T'));
        } catch {
          // Ignore date parsing errors
        }
      }

      // Look for Orientation
      const orientMatch = this.findExifNumericValue(data, 0x0112);
      if (orientMatch) exif.orientation = orientMatch;
    } catch {
      // Return empty exif on parse error
    }

    return exif;
  }

  /**
   * Find EXIF string value by tag
   */
  private findExifValue(_data: string, _tag: number): string | undefined {
    // Simplified EXIF tag search
    // Full implementation would properly parse TIFF/EXIF structure
    return undefined;
  }

  /**
   * Find EXIF numeric value by tag
   */
  private findExifNumericValue(_data: string, _tag: number): number | undefined {
    return undefined;
  }

  /**
   * Parse IPTC data from buffer
   */
  private parseIptcData(iptcBuffer: Buffer): Record<string, unknown> {
    const iptc: Record<string, unknown> = {};

    try {
      // IPTC data is stored in a specific format
      // This is a simplified implementation
      let offset = 0;

      while (offset < iptcBuffer.length - 5) {
        // IPTC marker: 0x1C
        if (iptcBuffer[offset] === 0x1c) {
          const record = iptcBuffer[offset + 1];
          const dataset = iptcBuffer[offset + 2];
          const length = iptcBuffer.readUInt16BE(offset + 3);

          if (length > 0 && offset + 5 + length <= iptcBuffer.length) {
            const value = iptcBuffer.toString('utf8', offset + 5, offset + 5 + length);

            // Map common IPTC fields
            const key = this.getIptcFieldName(record!, dataset!);
            if (key) {
              iptc[key] = value;
            }
          }

          offset += 5 + length;
        } else {
          offset++;
        }
      }
    } catch {
      // Return empty on parse error
    }

    return iptc;
  }

  /**
   * Get IPTC field name from record and dataset numbers
   */
  private getIptcFieldName(record: number, dataset: number): string | undefined {
    // Record 2 (Application Record) fields
    if (record === 2) {
      const fields: Record<number, string> = {
        5: 'title',
        25: 'keywords',
        80: 'creator',
        90: 'city',
        100: 'country',
        116: 'copyright',
        120: 'description',
      };
      return fields[dataset];
    }
    return undefined;
  }

  /**
   * Parse XMP data from buffer
   */
  private parseXmpData(xmpBuffer: Buffer): Record<string, unknown> {
    const xmp: Record<string, unknown> = {};

    try {
      const content = xmpBuffer.toString('utf8');

      // Extract common XMP fields using regex
      // Full implementation would use XML parser

      const titleMatch = content.match(/<dc:title[^>]*>[\s\S]*?<rdf:li[^>]*>([^<]+)<\/rdf:li>/i);
      if (titleMatch) xmp.title = titleMatch[1];

      const descMatch = content.match(
        /<dc:description[^>]*>[\s\S]*?<rdf:li[^>]*>([^<]+)<\/rdf:li>/i
      );
      if (descMatch) xmp.description = descMatch[1];

      const creatorMatch = content.match(
        /<dc:creator[^>]*>[\s\S]*?<rdf:li[^>]*>([^<]+)<\/rdf:li>/i
      );
      if (creatorMatch) xmp.creator = creatorMatch[1];

      const rightsMatch = content.match(/<dc:rights[^>]*>[\s\S]*?<rdf:li[^>]*>([^<]+)<\/rdf:li>/i);
      if (rightsMatch) xmp.copyright = rightsMatch[1];
    } catch {
      // Return empty on parse error
    }

    return xmp;
  }

  /**
   * Parse ICC profile data
   */
  private parseIccProfile(iccBuffer: Buffer): { description?: string; colorSpace?: string } {
    const icc: { description?: string; colorSpace?: string } = {};

    try {
      if (iccBuffer.length >= 128) {
        // Profile header size is 128 bytes
        // Color space at offset 16 (4 bytes)
        const colorSpace = iccBuffer.toString('ascii', 16, 20).trim();
        icc.colorSpace = colorSpace;

        // Try to find description tag
        const tagCount = iccBuffer.readUInt32BE(128);
        let offset = 132;

        for (let i = 0; i < tagCount && offset + 12 <= iccBuffer.length; i++) {
          const signature = iccBuffer.toString('ascii', offset, offset + 4);
          const tagOffset = iccBuffer.readUInt32BE(offset + 4);
          const tagSize = iccBuffer.readUInt32BE(offset + 8);

          if (signature === 'desc' && tagOffset + tagSize <= iccBuffer.length) {
            // Try to extract description
            const descData = iccBuffer.slice(tagOffset, tagOffset + tagSize);
            if (descData.length > 12) {
              const descType = descData.toString('ascii', 0, 4);
              if (descType === 'desc') {
                const strLen = descData.readUInt32BE(8);
                if (strLen > 0 && strLen + 12 <= descData.length) {
                  icc.description = descData.toString('ascii', 12, 12 + strLen - 1);
                }
              }
            }
            break;
          }

          offset += 12;
        }
      }
    } catch {
      // Return empty on parse error
    }

    return icc;
  }

  /**
   * Extract dominant colors from image
   */
  private async extractDominantColors(
    image: sharp.Sharp,
    stats: sharp.Stats,
    colorCount: number
  ): Promise<DominantColor[]> {
    const colors: DominantColor[] = [];

    // Use image statistics to get dominant color
    if (stats.channels && stats.channels.length >= 3) {
      const r = Math.round(stats.channels[0]?.mean || 0);
      const g = Math.round(stats.channels[1]?.mean || 0);
      const b = Math.round(stats.channels[2]?.mean || 0);

      const dominantColor = { r, g, b };
      colors.push({
        color: `rgb(${r}, ${g}, ${b})`,
        hex: this.rgbToHex(r, g, b),
        rgb: dominantColor,
        percentage: 100,
        name: this.getColorName(dominantColor),
      });
    }

    // For more accurate color extraction, we'd use k-means clustering
    // This is a simplified implementation using image resize and sampling
    try {
      // Resize to small image for color sampling
      const { data, info } = await image
        .resize(50, 50, { fit: 'cover' })
        .raw()
        .toBuffer({ resolveWithObject: true });

      const colorMap = new Map<string, { count: number; r: number; g: number; b: number }>();

      // Sample pixels (quantize colors for grouping)
      for (let i = 0; i < data.length; i += info.channels) {
        const r = Math.round((data[i] || 0) / 32) * 32;
        const g = Math.round((data[i + 1] || 0) / 32) * 32;
        const b = Math.round((data[i + 2] || 0) / 32) * 32;

        const key = `${r},${g},${b}`;
        const existing = colorMap.get(key);

        if (existing) {
          existing.count++;
        } else {
          colorMap.set(key, { count: 1, r, g, b });
        }
      }

      // Sort by frequency and take top colors
      const sortedColors = Array.from(colorMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, colorCount);

      const totalPixels = info.width * info.height;
      colors.length = 0; // Clear previous

      for (const color of sortedColors) {
        const percentage = (color.count / totalPixels) * 100;
        colors.push({
          color: `rgb(${color.r}, ${color.g}, ${color.b})`,
          hex: this.rgbToHex(color.r, color.g, color.b),
          rgb: { r: color.r, g: color.g, b: color.b },
          percentage: Math.round(percentage * 10) / 10,
          name: this.getColorName(color),
        });
      }
    } catch {
      // Return basic color on error
    }

    return colors;
  }

  /**
   * Convert RGB to hex color
   */
  private rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Get approximate color name from RGB
   */
  private getColorName(color: { r: number; g: number; b: number }): string {
    const { r, g, b } = color;

    // Basic color name detection
    const colors: Array<{ name: string; r: number; g: number; b: number }> = [
      { name: 'Black', r: 0, g: 0, b: 0 },
      { name: 'White', r: 255, g: 255, b: 255 },
      { name: 'Red', r: 255, g: 0, b: 0 },
      { name: 'Green', r: 0, g: 255, b: 0 },
      { name: 'Blue', r: 0, g: 0, b: 255 },
      { name: 'Yellow', r: 255, g: 255, b: 0 },
      { name: 'Cyan', r: 0, g: 255, b: 255 },
      { name: 'Magenta', r: 255, g: 0, b: 255 },
      { name: 'Orange', r: 255, g: 165, b: 0 },
      { name: 'Purple', r: 128, g: 0, b: 128 },
      { name: 'Pink', r: 255, g: 192, b: 203 },
      { name: 'Brown', r: 139, g: 69, b: 19 },
      { name: 'Gray', r: 128, g: 128, b: 128 },
    ];

    let minDistance = Infinity;
    let closestColor = 'Unknown';

    for (const c of colors) {
      const distance = Math.sqrt(
        Math.pow(r - c.r, 2) + Math.pow(g - c.g, 2) + Math.pow(b - c.b, 2)
      );

      if (distance < minDistance) {
        minDistance = distance;
        closestColor = c.name;
      }
    }

    return closestColor;
  }

  /**
   * Extract text from image using OCR
   * Note: This is a placeholder - real OCR would require Tesseract.js or similar
   */
  private async extractTextFromImage(
    _buffer: Buffer,
    _opts: ImageExtractionOptions
  ): Promise<ExtractedText> {
    // Placeholder for OCR integration
    // In production, this would integrate with Tesseract.js or cloud OCR services

    const emptyStats: TextStatistics = {
      totalCharacters: 0,
      totalWords: 0,
      totalSentences: 0,
      totalParagraphs: 0,
      totalPages: 1,
      averageWordsPerSentence: 0,
      averageCharactersPerWord: 0,
      readingTimeMinutes: 0,
      speakingTimeMinutes: 0,
    };

    return {
      content: '',
      statistics: emptyStats,
    };
  }
}

/**
 * Image extraction utilities
 */
export class ImageExtractorUtils {
  /**
   * Get image format from buffer magic bytes
   */
  static getImageFormat(buffer: Buffer): string | null {
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
      return 'png';
    }
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return 'jpeg';
    }
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
      return 'gif';
    }
    if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
      if (buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
        return 'webp';
      }
    }
    if (buffer[0] === 0x42 && buffer[1] === 0x4d) {
      return 'bmp';
    }
    if ((buffer[0] === 0x49 && buffer[1] === 0x49) || (buffer[0] === 0x4d && buffer[1] === 0x4d)) {
      return 'tiff';
    }
    return null;
  }

  /**
   * Calculate aspect ratio
   */
  static getAspectRatio(width: number, height: number): { ratio: number; formatted: string } {
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const divisor = gcd(width, height);

    return {
      ratio: width / height,
      formatted: `${width / divisor}:${height / divisor}`,
    };
  }

  /**
   * Calculate megapixels
   */
  static getMegapixels(width: number, height: number): number {
    return Math.round(((width * height) / 1000000) * 10) / 10;
  }

  /**
   * Get image quality category based on dimensions
   */
  static getQualityCategory(width: number, height: number): 'low' | 'medium' | 'high' | 'ultra' {
    const pixels = width * height;

    if (pixels < 300000) return 'low'; // < 0.3 MP (e.g., 640x480)
    if (pixels < 2000000) return 'medium'; // < 2 MP (e.g., 1600x1200)
    if (pixels < 8000000) return 'high'; // < 8 MP (e.g., 3264x2448)
    return 'ultra'; // >= 8 MP
  }

  /**
   * Calculate print size at given DPI
   */
  static getPrintSize(
    width: number,
    height: number,
    dpi: number = 300
  ): { width: number; height: number; unit: string } {
    return {
      width: Math.round((width / dpi) * 100) / 100,
      height: Math.round((height / dpi) * 100) / 100,
      unit: 'inches',
    };
  }
}

export { ImageExtractor as default };
