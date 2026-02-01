/**
 * Base converter class and converter registry.
 */

import type {
  InputDataType,
  ConvertFileOptions,
  ConversionResult,
  FileFormat,
  ProgressInfo,
} from '../core/types.js';
import { ConvertFileError, ErrorCode } from '../core/errors.js';
import { getMimeType, generateFilename, getFileSize, measureDuration } from '../utils/helpers.js';

export abstract class BaseConverter {
  protected readonly format: FileFormat;

  constructor(format: FileFormat) {
    this.format = format;
  }

  abstract convert(data: InputDataType, options: ConvertFileOptions): Promise<Buffer>;

  abstract getSupportedInputFormats(): FileFormat[];

  canConvert(inputFormat?: FileFormat): boolean {
    if (!inputFormat) return true;
    return this.getSupportedInputFormats().includes(inputFormat);
  }

  async execute(data: InputDataType, options: ConvertFileOptions): Promise<ConversionResult> {
    const startTime = Date.now();
    const warnings: string[] = [];

    try {
      this.emitProgress(options, {
        stage: 'preparing',
        progress: 0,
        message: 'Preparing conversion...',
      });

      this.emitProgress(options, {
        stage: 'converting',
        progress: 25,
        message: 'Converting data...',
      });

      const buffer = await this.convert(data, options);

      this.emitProgress(options, {
        stage: 'processing',
        progress: 75,
        message: 'Processing output...',
      });

      const result: ConversionResult = {
        success: true,
        data: buffer,
        format: this.format,
        size: getFileSize(buffer),
        filename: generateFilename(this.format),
        mimeType: getMimeType(this.format),
        duration: measureDuration(startTime),
        warnings: warnings.length > 0 ? warnings : undefined,
      };

      this.emitProgress(options, {
        stage: 'finalizing',
        progress: 100,
        message: 'Conversion complete',
      });

      // Apply post-conversion hook if provided
      if (options.hooks?.afterConvert) {
        return await options.hooks.afterConvert(result);
      }

      return result;
    } catch (error) {
      const conversionError =
        error instanceof ConvertFileError
          ? error
          : new ConvertFileError(
              ErrorCode.CONVERSION_FAILED,
              `Failed to convert to ${this.format}: ${(error as Error).message}`,
              { cause: error as Error }
            );

      options.hooks?.onError?.(conversionError);
      throw conversionError;
    }
  }

  protected emitProgress(options: ConvertFileOptions, progress: ProgressInfo): void {
    options.hooks?.onProgress?.(progress);
  }

  getDefaultOptions(): Partial<ConvertFileOptions> {
    return {
      type: this.format,
    };
  }
}

export class ConverterRegistry {
  private static instance: ConverterRegistry;
  private converters: Map<FileFormat, BaseConverter> = new Map();

  private constructor() {}

  static getInstance(): ConverterRegistry {
    if (!ConverterRegistry.instance) {
      ConverterRegistry.instance = new ConverterRegistry();
    }
    return ConverterRegistry.instance;
  }

  register(format: FileFormat, converter: BaseConverter): void {
    this.converters.set(format, converter);
  }

  get(format: FileFormat): BaseConverter | undefined {
    return this.converters.get(format);
  }

  has(format: FileFormat): boolean {
    return this.converters.has(format);
  }

  getFormats(): FileFormat[] {
    return Array.from(this.converters.keys());
  }

  unregister(format: FileFormat): boolean {
    return this.converters.delete(format);
  }

  clear(): void {
    this.converters.clear();
  }
}
