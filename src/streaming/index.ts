/**
 * Streaming Module
 * Memory-efficient streaming processing for large documents
 */

import { EventEmitter } from 'events';
import type { FileFormat, InputDataType, StreamProcessingOptions } from '../core/types.js';
import { generateId, toBuffer } from '../utils/helpers.js';
import { ExtractorRegistry, initializeExtractors } from '../extractors/index.js';

/**
 * Stream chunk
 */
export interface StreamChunk {
  /** Chunk unique identifier */
  id: string;
  /** Sequence number */
  sequence: number;
  /** Chunk type */
  type: 'data' | 'metadata' | 'progress' | 'error' | 'end';
  data?: unknown;
  size?: number;
  timestamp: Date;
}

export interface StreamState {
  id: string;
  status: 'idle' | 'streaming' | 'paused' | 'completed' | 'error';
  bytesProcessed: number;
  chunksEmitted: number;
  startTime?: Date;
  endTime?: Date;
  error?: Error;
}

export interface StreamEvents {
  data: (chunk: StreamChunk) => void;
  metadata: (metadata: Record<string, unknown>) => void;
  progress: (progress: StreamProgress) => void;
  error: (error: Error) => void;
  end: () => void;
}

export interface StreamProgress {
  streamId: string;
  bytesProcessed: number;
  totalBytes?: number;
  percentage?: number;
  rate: number;
  estimatedTimeRemaining?: number;
}

const DEFAULT_STREAM_OPTIONS: StreamProcessingOptions = {
  chunkSize: 64 * 1024, // 64KB
  highWaterMark: 16 * 1024, // 16KB
  encoding: 'utf-8',
  pauseOnBackpressure: true,
  emitProgress: true,
  progressInterval: 100,
};

export class StreamProcessor extends EventEmitter {
  private options: StreamProcessingOptions;
  private state: StreamState;
  private extractorRegistry: ExtractorRegistry;
  private progressTimer?: ReturnType<typeof setInterval>;

  constructor(options: Partial<StreamProcessingOptions> = {}) {
    super();
    this.options = { ...DEFAULT_STREAM_OPTIONS, ...options };
    this.state = {
      id: generateId(),
      status: 'idle',
      bytesProcessed: 0,
      chunksEmitted: 0,
    };
    this.extractorRegistry = initializeExtractors();
  }

  getState(): StreamState {
    return { ...this.state };
  }

  async processStream(
    data: InputDataType,
    format: FileFormat,
    options: Record<string, unknown> = {}
  ): Promise<void> {
    this.state.status = 'streaming';
    this.state.startTime = new Date();
    this.state.bytesProcessed = 0;
    this.state.chunksEmitted = 0;

    try {
      const buffer = await toBuffer(data);
      const totalBytes = buffer.length;

      // Start progress reporting
      if (this.options.emitProgress) {
        this.startProgressReporting(totalBytes);
      }

      // Get extractor
      const extractor = this.extractorRegistry.get(format);
      if (!extractor) {
        throw new Error(`No extractor available for format: ${format}`);
      }

      // Emit metadata first
      const metadataChunk: StreamChunk = {
        id: generateId(),
        sequence: this.state.chunksEmitted++,
        type: 'metadata',
        data: {
          format,
          totalBytes,
          options,
        },
        timestamp: new Date(),
      };
      this.emit('data', metadataChunk);
      this.emit('metadata', metadataChunk.data);

      // Process in chunks
      const chunkSize = this.options.chunkSize || 64 * 1024;
      let offset = 0;

      while (offset < buffer.length) {
        if ((this.state.status as string) === 'paused') {
          await this.waitForResume();
        }

        if ((this.state.status as string) === 'error') {
          break;
        }

        const chunk = buffer.subarray(offset, Math.min(offset + chunkSize, buffer.length));
        offset += chunk.length;
        this.state.bytesProcessed = offset;

        // Process chunk
        const processedChunk = await this.processChunk(chunk, format, offset === buffer.length);

        // Emit data chunk
        const dataChunk: StreamChunk = {
          id: generateId(),
          sequence: this.state.chunksEmitted++,
          type: 'data',
          data: processedChunk,
          size: chunk.length,
          timestamp: new Date(),
        };

        this.emit('data', dataChunk);

        // Check backpressure
        if (this.options.pauseOnBackpressure && this.listenerCount('data') === 0) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      // If it's a full extraction, do the complete extraction at the end
      if (format !== 'txt' && format !== 'csv') {
        const fullResult = await extractor.execute(buffer, options);

        const resultChunk: StreamChunk = {
          id: generateId(),
          sequence: this.state.chunksEmitted++,
          type: 'data',
          data: fullResult,
          timestamp: new Date(),
        };
        this.emit('data', resultChunk);
      }

      // Complete
      this.state.status = 'completed';
      this.state.endTime = new Date();

      const endChunk: StreamChunk = {
        id: generateId(),
        sequence: this.state.chunksEmitted++,
        type: 'end',
        timestamp: new Date(),
      };
      this.emit('data', endChunk);
      this.emit('end');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.state.status = 'error';
      this.state.error = err;
      this.state.endTime = new Date();

      const errorChunk: StreamChunk = {
        id: generateId(),
        sequence: this.state.chunksEmitted++,
        type: 'error',
        data: err.message,
        timestamp: new Date(),
      };
      this.emit('data', errorChunk);
      this.emit('error', err);

      throw err;
    } finally {
      this.stopProgressReporting();
    }
  }

  pause(): void {
    if (this.state.status === 'streaming') {
      this.state.status = 'paused';
    }
  }

  resume(): void {
    if (this.state.status === 'paused') {
      this.state.status = 'streaming';
    }
  }

  abort(): void {
    this.state.status = 'error';
    this.state.error = new Error('Stream aborted');
    this.state.endTime = new Date();
    this.stopProgressReporting();
    this.emit('error', this.state.error);
  }

  private async processChunk(
    chunk: Uint8Array,
    format: FileFormat,
    isLast: boolean
  ): Promise<unknown> {
    // For text-based formats, decode and return
    if (format === 'txt' || format === 'csv') {
      const decoder = new TextDecoder(this.options.encoding || 'utf-8');
      return decoder.decode(chunk, { stream: !isLast });
    }

    // For binary formats, return chunk info
    return {
      size: chunk.length,
      isLast,
      preview:
        chunk.length > 50
          ? `<${chunk.length} bytes>`
          : Array.from(chunk.slice(0, 50))
              .map(b => b.toString(16).padStart(2, '0'))
              .join(' '),
    };
  }

  private waitForResume(): Promise<void> {
    return new Promise(resolve => {
      const check = () => {
        if (this.state.status !== 'paused') {
          resolve();
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    });
  }

  private startProgressReporting(totalBytes: number): void {
    const startTime = Date.now();

    this.progressTimer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const rate = this.state.bytesProcessed / (elapsed / 1000);
      const remaining = totalBytes - this.state.bytesProcessed;

      const progress: StreamProgress = {
        streamId: this.state.id,
        bytesProcessed: this.state.bytesProcessed,
        totalBytes,
        percentage: Math.round((this.state.bytesProcessed / totalBytes) * 100),
        rate,
        estimatedTimeRemaining: rate > 0 ? (remaining / rate) * 1000 : undefined,
      };

      this.emit('progress', progress);
    }, this.options.progressInterval || 100);
  }

  private stopProgressReporting(): void {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = undefined;
    }
  }
}

export class DocumentTransformStream {
  private processor: StreamProcessor;
  private format: FileFormat;
  private options: Record<string, unknown>;
  private chunks: Uint8Array[] = [];

  constructor(
    format: FileFormat,
    options: Partial<StreamProcessingOptions> & Record<string, unknown> = {}
  ) {
    this.processor = new StreamProcessor(options);
    this.format = format;
    this.options = options;
  }

  async write(chunk: Uint8Array | Buffer | string): Promise<void> {
    if (typeof chunk === 'string') {
      chunk = new TextEncoder().encode(chunk);
    }
    this.chunks.push(new Uint8Array(chunk));
  }

  async end(): Promise<AsyncGenerator<StreamChunk>> {
    const totalLength = this.chunks.reduce((sum, c) => sum + c.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;

    for (const chunk of this.chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    return this.createAsyncGenerator(combined);
  }

  private async *createAsyncGenerator(data: Uint8Array): AsyncGenerator<StreamChunk> {
    const chunks: StreamChunk[] = [];
    let ended = false;

    this.processor.on('data', chunk => {
      chunks.push(chunk);
    });

    this.processor.on('end', () => {
      ended = true;
    });

    this.processor.on('error', () => {
      ended = true;
    });

    // Start processing in background
    const processPromise = this.processor.processStream(
      Buffer.from(data),
      this.format,
      this.options
    );

    // Yield chunks as they become available
    while (!ended || chunks.length > 0) {
      if (chunks.length > 0) {
        yield chunks.shift()!;
      } else {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    await processPromise;
  }

  getProcessor(): StreamProcessor {
    return this.processor;
  }
}

export class StreamPipelineBuilder {
  private stages: Array<{
    name: string;
    handler: (chunk: StreamChunk) => Promise<StreamChunk | null>;
  }> = [];

  transform(name: string, handler: (chunk: StreamChunk) => Promise<StreamChunk | null>): this {
    this.stages.push({ name, handler });
    return this;
  }

  filter(name: string, predicate: (chunk: StreamChunk) => boolean): this {
    this.stages.push({
      name,
      handler: async chunk => (predicate(chunk) ? chunk : null),
    });
    return this;
  }

  map<T>(name: string, mapper: (data: unknown) => T): this {
    this.stages.push({
      name,
      handler: async chunk => ({
        ...chunk,
        data: mapper(chunk.data),
      }),
    });
    return this;
  }

  tap(name: string, action: (chunk: StreamChunk) => void): this {
    this.stages.push({
      name,
      handler: async chunk => {
        action(chunk);
        return chunk;
      },
    });
    return this;
  }

  async execute(processor: StreamProcessor): Promise<StreamChunk[]> {
    const results: StreamChunk[] = [];

    processor.on('data', async chunk => {
      let currentChunk: StreamChunk | null = chunk;

      for (const stage of this.stages) {
        if (!currentChunk) break;
        currentChunk = await stage.handler(currentChunk);
      }

      if (currentChunk) {
        results.push(currentChunk);
      }
    });

    return new Promise((resolve, reject) => {
      processor.on('end', () => resolve(results));
      processor.on('error', reject);
    });
  }

  build(): (processor: StreamProcessor) => Promise<StreamChunk[]> {
    return processor => this.execute(processor);
  }
}

export const StreamUtils = {
  async collectChunks(processor: StreamProcessor): Promise<StreamChunk[]> {
    const chunks: StreamChunk[] = [];

    return new Promise((resolve, reject) => {
      processor.on('data', chunk => chunks.push(chunk));
      processor.on('end', () => resolve(chunks));
      processor.on('error', reject);
    });
  },

  async collectData<T = unknown>(processor: StreamProcessor): Promise<T[]> {
    const chunks = await this.collectChunks(processor);
    return chunks.filter(c => c.type === 'data').map(c => c.data as T);
  },

  async collectText(processor: StreamProcessor): Promise<string> {
    const data = await this.collectData<string | Record<string, unknown>>(processor);
    return data.filter(d => typeof d === 'string').join('');
  },

  calculateStats(state: StreamState): {
    duration: number;
    throughput: number;
    averageChunkRate: number;
  } {
    const duration =
      state.endTime && state.startTime ? state.endTime.getTime() - state.startTime.getTime() : 0;

    return {
      duration,
      throughput: duration > 0 ? state.bytesProcessed / (duration / 1000) : 0,
      averageChunkRate: duration > 0 ? state.chunksEmitted / (duration / 1000) : 0,
    };
  },

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${(ms / 60000).toFixed(2)}m`;
  },
};

export { StreamProcessor as default };
