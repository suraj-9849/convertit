/**
 * Image converter for format conversion, resizing, and transformations.
 */

import sharp from 'sharp';
import { BaseConverter } from './base.js';
import type { InputDataType, ConvertFileOptions, FileFormat, ImageOptions } from '../core/types.js';
import { ConvertFileError, ErrorCode } from '../core/errors.js';

export class ImageConverter extends BaseConverter {
  private targetFormat: FileFormat;

  constructor(format: FileFormat = 'png') {
    super(format);
    this.targetFormat = format;
  }

  getSupportedInputFormats(): FileFormat[] {
    return ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tiff', 'svg'];
  }

  async convert(data: InputDataType, options: ConvertFileOptions): Promise<Buffer> {
    const imageOptions = options.image || {};
    const targetFormat = imageOptions.format || this.targetFormat;

    // Get input buffer
    let inputBuffer: Buffer;

    if (Buffer.isBuffer(data)) {
      inputBuffer = data;
    } else if (typeof data === 'string') {
      // Could be base64, file path, or SVG string
      if (data.startsWith('data:image')) {
        // Base64 data URL
        const base64Data = data.split(',')[1] || '';
        inputBuffer = Buffer.from(base64Data, 'base64');
      } else if (data.startsWith('<svg') || data.startsWith('<?xml')) {
        // SVG string
        inputBuffer = Buffer.from(data, 'utf-8');
      } else {
        // Assume base64
        inputBuffer = Buffer.from(data, 'base64');
      }
    } else if (data instanceof ArrayBuffer) {
      inputBuffer = Buffer.from(new Uint8Array(data));
    } else if (data instanceof Uint8Array) {
      inputBuffer = Buffer.from(data);
    } else {
      throw new ConvertFileError(ErrorCode.INVALID_INPUT, 'Unable to convert input data to image');
    }

    return this.processImage(inputBuffer, targetFormat, imageOptions);
  }

  private async processImage(
    input: Buffer,
    format: string,
    options: ImageOptions
  ): Promise<Buffer> {
    try {
      let image = sharp(input);

      // Resize if dimensions specified
      if (options.width || options.height) {
        image = image.resize({
          width: options.width,
          height: options.height,
          fit: options.fit || 'contain',
          background: options.background ? this.parseBackground(options.background) : undefined,
        });
      }

      // Apply transformations
      if (options.rotate) {
        image = image.rotate(options.rotate);
      }

      if (options.flip) {
        if (options.flip === 'horizontal' || options.flip === 'both') {
          image = image.flop();
        }
        if (options.flip === 'vertical' || options.flip === 'both') {
          image = image.flip();
        }
      }

      if (options.grayscale) {
        image = image.grayscale();
      }

      if (options.blur && options.blur > 0) {
        image = image.blur(options.blur);
      }

      if (options.sharpen) {
        image = image.sharpen();
      }

      // Color adjustments
      if (options.brightness !== undefined || options.saturation !== undefined) {
        image = image.modulate({
          brightness: options.brightness,
          saturation: options.saturation,
        });
      }

      // Convert to target format
      switch (format) {
        case 'png':
          image = image.png({
            compressionLevel: options.compression === 'none' ? 0 : 9,
            progressive: options.progressive,
          });
          break;

        case 'jpg':
        case 'jpeg':
          image = image.jpeg({
            quality: options.quality || 80,
            progressive: options.progressive,
          });
          break;

        case 'webp':
          image = image.webp({
            quality: options.quality || 80,
            lossless: options.compression === 'none',
          });
          break;

        case 'gif':
          image = image.gif();
          break;

        case 'tiff':
          image = image.tiff({
            compression: options.compression === 'lzw' ? 'lzw' : 'deflate',
            quality: options.quality || 80,
          });
          break;

        case 'bmp':
          // Sharp doesn't directly support BMP output, use PNG as intermediate
          image = image.png();
          break;

        default:
          image = image.png();
      }

      return await image.toBuffer();
    } catch (error) {
      throw new ConvertFileError(
        ErrorCode.CONVERSION_FAILED,
        `Image conversion failed: ${(error as Error).message}`,
        { cause: error as Error }
      );
    }
  }

  private parseBackground(color: string): { r: number; g: number; b: number; alpha: number } {
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        alpha: hex.length > 6 ? parseInt(hex.slice(6, 8), 16) / 255 : 1,
      };
    }

    if (color.startsWith('rgb')) {
      const match = color.match(/\d+/g);
      if (match && match.length >= 3) {
        return {
          r: parseInt(match[0] || '0'),
          g: parseInt(match[1] || '0'),
          b: parseInt(match[2] || '0'),
          alpha: match[3] ? parseFloat(match[3]) : 1,
        };
      }
    }

    // Default to white
    return { r: 255, g: 255, b: 255, alpha: 1 };
  }
}

/**
 * Image Utilities
 */
export class ImageUtils {
  /**
   * Get image metadata
   */
  static async getMetadata(input: Buffer): Promise<{
    width?: number;
    height?: number;
    format?: string;
    size: number;
    hasAlpha?: boolean;
    channels?: number;
    density?: number;
  }> {
    const metadata = await sharp(input).metadata();
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: input.length,
      hasAlpha: metadata.hasAlpha,
      channels: metadata.channels,
      density: metadata.density,
    };
  }

  /**
   * Resize image
   */
  static async resize(
    input: Buffer,
    width?: number,
    height?: number,
    options?: {
      fit?: 'contain' | 'cover' | 'fill' | 'inside' | 'outside';
      background?: string;
    }
  ): Promise<Buffer> {
    return sharp(input)
      .resize({
        width,
        height,
        fit: options?.fit || 'contain',
      })
      .toBuffer();
  }

  /**
   * Crop image
   */
  static async crop(
    input: Buffer,
    options: {
      left: number;
      top: number;
      width: number;
      height: number;
    }
  ): Promise<Buffer> {
    return sharp(input).extract(options).toBuffer();
  }

  /**
   * Rotate image
   */
  static async rotate(input: Buffer, angle: number): Promise<Buffer> {
    return sharp(input).rotate(angle).toBuffer();
  }

  /**
   * Flip image
   */
  static async flip(input: Buffer, direction: 'horizontal' | 'vertical' | 'both'): Promise<Buffer> {
    let image = sharp(input);

    if (direction === 'horizontal' || direction === 'both') {
      image = image.flop();
    }
    if (direction === 'vertical' || direction === 'both') {
      image = image.flip();
    }

    return image.toBuffer();
  }

  /**
   * Add watermark to image
   */
  static async addWatermark(
    input: Buffer,
    watermark: Buffer,
    options?: {
      position?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
      opacity?: number;
      margin?: number;
    }
  ): Promise<Buffer> {
    const baseMetadata = await sharp(input).metadata();
    const watermarkMetadata = await sharp(watermark).metadata();

    if (
      !baseMetadata.width ||
      !baseMetadata.height ||
      !watermarkMetadata.width ||
      !watermarkMetadata.height
    ) {
      throw new ConvertFileError(ErrorCode.CONVERSION_FAILED, 'Unable to get image dimensions');
    }

    const margin = options?.margin || 10;
    let left = 0;
    let top = 0;

    switch (options?.position || 'bottom-right') {
      case 'center':
        left = Math.floor((baseMetadata.width - watermarkMetadata.width) / 2);
        top = Math.floor((baseMetadata.height - watermarkMetadata.height) / 2);
        break;
      case 'top-left':
        left = margin;
        top = margin;
        break;
      case 'top-right':
        left = baseMetadata.width - watermarkMetadata.width - margin;
        top = margin;
        break;
      case 'bottom-left':
        left = margin;
        top = baseMetadata.height - watermarkMetadata.height - margin;
        break;
      case 'bottom-right':
      default:
        left = baseMetadata.width - watermarkMetadata.width - margin;
        top = baseMetadata.height - watermarkMetadata.height - margin;
        break;
    }

    // Apply opacity to watermark if specified
    let processedWatermark = watermark;
    if (options?.opacity !== undefined && options.opacity < 1) {
      processedWatermark = await sharp(watermark).ensureAlpha(options.opacity).toBuffer();
    }

    return sharp(input)
      .composite([
        {
          input: processedWatermark,
          left: Math.max(0, left),
          top: Math.max(0, top),
        },
      ])
      .toBuffer();
  }

  /**
   * Compress image
   */
  static async compress(
    input: Buffer,
    quality: number = 80,
    format?: 'jpg' | 'jpeg' | 'png' | 'webp'
  ): Promise<Buffer> {
    let image = sharp(input);

    switch (format) {
      case 'jpg':
      case 'jpeg':
        image = image.jpeg({ quality });
        break;
      case 'png':
        image = image.png({ compressionLevel: Math.floor((100 - quality) / 10) });
        break;
      case 'webp':
        image = image.webp({ quality });
        break;
      default: {
        // Auto-detect format
        const metadata = await sharp(input).metadata();
        if (metadata.format === 'jpeg' || metadata.format === 'jpg') {
          image = image.jpeg({ quality });
        } else if (metadata.format === 'png') {
          image = image.png({ compressionLevel: Math.floor((100 - quality) / 10) });
        } else {
          image = image.webp({ quality });
        }
      }
    }

    return image.toBuffer();
  }

  /**
   * Convert image to base64
   */
  static async toBase64(input: Buffer, format?: string): Promise<string> {
    const metadata = await sharp(input).metadata();
    const mimeType = `image/${format || metadata.format || 'png'}`;
    return `data:${mimeType};base64,${input.toString('base64')}`;
  }

  /**
   * Create thumbnail
   */
  static async createThumbnail(
    input: Buffer,
    width: number = 150,
    height: number = 150
  ): Promise<Buffer> {
    return sharp(input).resize(width, height, { fit: 'cover' }).toBuffer();
  }

  /**
   * Merge images horizontally or vertically
   */
  static async merge(
    images: Buffer[],
    direction: 'horizontal' | 'vertical' = 'horizontal'
  ): Promise<Buffer> {
    if (images.length === 0) {
      throw new ConvertFileError(ErrorCode.INVALID_INPUT, 'No images to merge');
    }

    if (images.length === 1) {
      return images[0]!;
    }

    // Get dimensions of all images
    const metadataList = await Promise.all(images.map(img => sharp(img).metadata()));

    let totalWidth = 0;
    let totalHeight = 0;
    let maxWidth = 0;
    let maxHeight = 0;

    for (const metadata of metadataList) {
      const width = metadata?.width || 0;
      const height = metadata?.height || 0;
      if (width && height) {
        maxWidth = Math.max(maxWidth, width);
        maxHeight = Math.max(maxHeight, height);
        if (direction === 'horizontal') {
          totalWidth += width;
          totalHeight = Math.max(totalHeight, height);
        } else {
          totalWidth = Math.max(totalWidth, width);
          totalHeight += height;
        }
      }
    }

    // Create composite
    const composite: sharp.OverlayOptions[] = [];
    let currentPosition = 0;

    for (let i = 0; i < images.length; i++) {
      const metadata = metadataList[i];
      const width = metadata?.width || 0;
      const height = metadata?.height || 0;
      if (width && height) {
        composite.push({
          input: images[i],
          left: direction === 'horizontal' ? currentPosition : 0,
          top: direction === 'vertical' ? currentPosition : 0,
        });

        currentPosition += direction === 'horizontal' ? width : height;
      }
    }

    return sharp({
      create: {
        width: totalWidth,
        height: totalHeight,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 0 },
      },
    })
      .composite(composite)
      .png()
      .toBuffer();
  }
}

export default ImageConverter;
