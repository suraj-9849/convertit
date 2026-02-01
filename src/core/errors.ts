/**
 * Error types and error handling utilities.
 */

export enum ErrorCode {
  INVALID_INPUT = 'INVALID_INPUT',
  INVALID_FORMAT = 'INVALID_FORMAT',
  INVALID_OPTIONS = 'INVALID_OPTIONS',
  UNSUPPORTED_FORMAT = 'UNSUPPORTED_FORMAT',
  EMPTY_DATA = 'EMPTY_DATA',

  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_READ_ERROR = 'FILE_READ_ERROR',
  FILE_WRITE_ERROR = 'FILE_WRITE_ERROR',
  FILE_ACCESS_DENIED = 'FILE_ACCESS_DENIED',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',

  CONVERSION_FAILED = 'CONVERSION_FAILED',
  CONVERSION_TIMEOUT = 'CONVERSION_TIMEOUT',
  CONVERSION_CANCELLED = 'CONVERSION_CANCELLED',

  MERGE_FAILED = 'MERGE_FAILED',
  SPLIT_FAILED = 'SPLIT_FAILED',
  COMPRESSION_FAILED = 'COMPRESSION_FAILED',
  ENCRYPTION_FAILED = 'ENCRYPTION_FAILED',
  WATERMARK_FAILED = 'WATERMARK_FAILED',
  OCR_FAILED = 'OCR_FAILED',

  MEMORY_EXCEEDED = 'MEMORY_EXCEEDED',
  DEPENDENCY_MISSING = 'DEPENDENCY_MISSING',
  PLUGIN_ERROR = 'PLUGIN_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',

  NETWORK_ERROR = 'NETWORK_ERROR',
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  DOWNLOAD_FAILED = 'DOWNLOAD_FAILED',
}

export class ConvertFileError extends Error {
  public readonly code: ErrorCode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public readonly details?: any;
  public readonly recoverable: boolean;
  public readonly timestamp: Date;
  public readonly file?: string;

  constructor(
    code: ErrorCode,
    message: string,
    options?: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      details?: any;
      recoverable?: boolean;
      file?: string;
      cause?: Error;
    }
  ) {
    super(message);
    this.name = 'ConvertFileError';
    this.code = code;
    this.details = options?.details;
    this.recoverable = options?.recoverable ?? false;
    this.file = options?.file;
    this.timestamp = new Date();

    if (options?.cause) {
      this.cause = options.cause;
    }

    Error.captureStackTrace(this, ConvertFileError);
  }

  toJSON(): object {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      recoverable: this.recoverable,
      file: this.file,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    };
  }

  static fromError(error: Error, code: ErrorCode = ErrorCode.INTERNAL_ERROR): ConvertFileError {
    return new ConvertFileError(code, error.message, {
      cause: error,
      details: { originalError: error.name },
    });
  }
}

export class ValidationError extends ConvertFileError {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(message: string, details?: any) {
    super(ErrorCode.INVALID_INPUT, message, { details, recoverable: true });
    this.name = 'ValidationError';
  }
}

export class FormatError extends ConvertFileError {
  constructor(format: string, message?: string) {
    super(ErrorCode.UNSUPPORTED_FORMAT, message || `Unsupported format: ${format}`, {
      details: { format },
      recoverable: false,
    });
    this.name = 'FormatError';
  }
}

export class FileError extends ConvertFileError {
  constructor(code: ErrorCode, filePath: string, message?: string) {
    super(code, message || `File operation failed: ${filePath}`, {
      file: filePath,
      recoverable: code === ErrorCode.FILE_NOT_FOUND,
    });
    this.name = 'FileError';
  }
}

export class ConversionFailedError extends ConvertFileError {
  constructor(format: string, message?: string, cause?: Error) {
    super(ErrorCode.CONVERSION_FAILED, message || `Failed to convert to ${format}`, {
      details: { format },
      recoverable: false,
      cause,
    });
    this.name = 'ConversionFailedError';
  }
}

export class TimeoutError extends ConvertFileError {
  constructor(timeout: number, message?: string) {
    super(ErrorCode.CONVERSION_TIMEOUT, message || `Operation timed out after ${timeout}ms`, {
      details: { timeout },
      recoverable: true,
    });
    this.name = 'TimeoutError';
  }
}

export function isConvertFileError(error: unknown): error is ConvertFileError {
  return error instanceof ConvertFileError;
}

export function handleError(error: unknown): ConvertFileError {
  if (isConvertFileError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return ConvertFileError.fromError(error);
  }

  return new ConvertFileError(
    ErrorCode.INTERNAL_ERROR,
    typeof error === 'string' ? error : 'An unknown error occurred',
    { details: error }
  );
}
