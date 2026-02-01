/**
 * Batch Processing Module
 * Queue-based batch processing for large-scale document operations
 */

import type {
  FileFormat,
  InputDataType,
  BatchJobConfig,
  BatchJobResult,
  BatchJobStatus,
  AnalysisOptions,
  ConvertFileOptions,
} from '../core/types.js';
import { generateId, toBuffer } from '../utils/helpers.js';
import { ExtractorRegistry, initializeExtractors } from '../extractors/index.js';
import { ConverterRegistry, initializeConverters } from '../converters/index.js';

/**
 * Job item in the batch queue
 */
export interface BatchJobItem {
  /** Unique identifier */
  id: string;
  /** Input data */
  data: InputDataType;
  /** Input format */
  inputFormat: FileFormat;
  outputFormat?: FileFormat;
  options?: Record<string, unknown>;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  result?: unknown;
  error?: Error;
  startTime?: Date;
  endTime?: Date;
  retryCount: number;
}

export interface BatchJob {
  id: string;
  name: string;
  type: 'conversion' | 'extraction' | 'analysis';
  config: BatchJobConfig;
  items: BatchJobItem[];
  status: BatchJobStatus;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  onProgress?: (progress: BatchJobProgress) => void;
  onItemComplete?: (item: BatchJobItem) => void;
  onError?: (error: Error, item: BatchJobItem) => void;
}

export interface BatchJobProgress {
  jobId: string;
  total: number;
  completed: number;
  failed: number;
  percentage: number;
  estimatedTimeRemaining?: number;
  processingRate?: number;
}

export interface BatchProcessorConfig {
  maxConcurrentJobs: number;
  maxConcurrentItems: number;
  defaultTimeout: number;
  maxRetries: number;
  retryDelay: number;
  memoryLimit?: number;
  enableProgress: boolean;
}

const DEFAULT_PROCESSOR_CONFIG: BatchProcessorConfig = {
  maxConcurrentJobs: 3,
  maxConcurrentItems: 5,
  defaultTimeout: 60000,
  maxRetries: 3,
  retryDelay: 1000,
  enableProgress: true,
};

export class BatchProcessor {
  private config: BatchProcessorConfig;
  private jobs: Map<string, BatchJob>;
  private activeJobs: Set<string>;
  private extractorRegistry: ExtractorRegistry;
  private converterRegistry: ConverterRegistry;

  constructor(config: Partial<BatchProcessorConfig> = {}) {
    this.config = { ...DEFAULT_PROCESSOR_CONFIG, ...config };
    this.jobs = new Map();
    this.activeJobs = new Set();
    this.extractorRegistry = initializeExtractors();
    this.converterRegistry = initializeConverters();
  }

  createJob(name: string, type: BatchJob['type'], config: Partial<BatchJobConfig>): BatchJob {
    const job: BatchJob = {
      id: generateId(),
      name,
      type,
      config: {
        concurrency: this.config.maxConcurrentItems,
        continueOnError: true,
        timeout: this.config.defaultTimeout,
        retryAttempts: this.config.maxRetries,
        ...config,
      } as BatchJobConfig,
      items: [],
      status: 'pending',
      createdAt: new Date(),
    };

    this.jobs.set(job.id, job);
    return job;
  }

  addItems(
    jobId: string,
    items: Array<{
      data: InputDataType;
      inputFormat: FileFormat;
      outputFormat?: FileFormat;
      options?: Record<string, unknown>;
    }>
  ): BatchJobItem[] {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    if (job.status !== 'pending') {
      throw new Error(`Cannot add items to job with status: ${job.status}`);
    }

    const newItems: BatchJobItem[] = items.map(item => ({
      id: generateId(),
      data: item.data,
      inputFormat: item.inputFormat,
      outputFormat: item.outputFormat,
      options: item.options,
      status: 'pending' as const,
      retryCount: 0,
    }));

    job.items.push(...newItems);
    return newItems;
  }

  onProgress(jobId: string, callback: (progress: BatchJobProgress) => void): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.onProgress = callback;
    }
  }

  onItemComplete(jobId: string, callback: (item: BatchJobItem) => void): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.onItemComplete = callback;
    }
  }

  onError(jobId: string, callback: (error: Error, item: BatchJobItem) => void): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.onError = callback;
    }
  }

  async startJob(jobId: string): Promise<BatchJobResult> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    if (this.activeJobs.size >= this.config.maxConcurrentJobs) {
      throw new Error('Maximum concurrent jobs reached');
    }

    job.status = 'processing';
    job.startedAt = new Date();
    this.activeJobs.add(jobId);

    try {
      const results = await this.processJob(job);
      job.status = 'completed';
      job.completedAt = new Date();
      return results;
    } catch (error) {
      job.status = 'failed';
      job.completedAt = new Date();
      throw error;
    } finally {
      this.activeJobs.delete(jobId);
    }
  }

  pauseJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'processing') {
      job.status = 'paused';
    }
  }

  async resumeJob(jobId: string): Promise<BatchJobResult> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    if (job.status !== 'paused') {
      throw new Error(`Job is not paused: ${job.status}`);
    }

    return this.startJob(jobId);
  }

  cancelJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = 'cancelled';
      // Mark all pending items as cancelled
      for (const item of job.items) {
        if (item.status === 'pending' || item.status === 'processing') {
          item.status = 'cancelled';
        }
      }
    }
  }

  getJobStatus(jobId: string): BatchJob | undefined {
    return this.jobs.get(jobId);
  }

  getAllJobs(): BatchJob[] {
    return Array.from(this.jobs.values());
  }

  deleteJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (
      job &&
      (job.status === 'completed' || job.status === 'cancelled' || job.status === 'failed')
    ) {
      this.jobs.delete(jobId);
      return true;
    }
    return false;
  }

  private async processJob(job: BatchJob): Promise<BatchJobResult> {
    const startTime = Date.now();
    const concurrency = job.config.concurrency || this.config.maxConcurrentItems;
    const pendingItems = job.items.filter(i => i.status === 'pending');

    let completedCount = 0;
    let failedCount = 0;
    const successfulItems: BatchJobItem[] = [];
    const failedItems: BatchJobItem[] = [];

    // Process items in batches
    for (let i = 0; i < pendingItems.length; i += concurrency) {
      if (job.status === 'paused' || job.status === 'cancelled') {
        break;
      }

      const batch = pendingItems.slice(i, i + concurrency);
      const results = await Promise.allSettled(batch.map(item => this.processItem(job, item)));

      for (let j = 0; j < results.length; j++) {
        const result = results[j]!;
        const item = batch[j]!;

        if (result.status === 'fulfilled') {
          completedCount++;
          successfulItems.push(item);
        } else {
          failedCount++;
          failedItems.push(item);

          if (!job.config.continueOnError) {
            throw result.reason;
          }
        }
      }

      // Report progress
      if (job.onProgress) {
        const elapsed = Date.now() - startTime;
        const total = job.items.length;
        const completed = completedCount + failedCount;
        const rate = completed / (elapsed / 1000);
        const remaining = total - completed;

        job.onProgress({
          jobId: job.id,
          total,
          completed,
          failed: failedCount,
          percentage: Math.round((completed / total) * 100),
          estimatedTimeRemaining: remaining > 0 ? (remaining / rate) * 1000 : 0,
          processingRate: rate,
        });
      }
    }

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    return {
      jobId: job.id,
      status: failedCount === 0 ? 'completed' : completedCount > 0 ? 'partial' : 'failed',
      totalItems: job.items.length,
      successfulItems: completedCount,
      failedItems: failedCount,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      totalDuration: totalTime,
      averageItemDuration: totalTime / (completedCount + failedCount),
      results: successfulItems.map(i => i.result),
      errors: failedItems.map(i => ({
        itemId: i.id,
        error: i.error?.message || 'Unknown error',
      })),
    };
  }

  private async processItem(job: BatchJob, item: BatchJobItem): Promise<void> {
    item.status = 'processing';
    item.startTime = new Date();

    try {
      const buffer = await toBuffer(item.data);

      // Create timeout promise
      const timeout = job.config.timeout || this.config.defaultTimeout;
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Processing timeout')), timeout);
      });

      // Process based on job type
      let result: unknown;

      switch (job.type) {
        case 'extraction':
          result = await Promise.race([this.extractItem(buffer, item, job.config), timeoutPromise]);
          break;

        case 'conversion':
          result = await Promise.race([this.convertItem(buffer, item, job.config), timeoutPromise]);
          break;

        case 'analysis':
          result = await Promise.race([this.analyzeItem(buffer, item, job.config), timeoutPromise]);
          break;
      }

      item.status = 'completed';
      item.result = result;
      item.endTime = new Date();

      if (job.onItemComplete) {
        job.onItemComplete(item);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      // Retry logic
      if (item.retryCount < (job.config.retryAttempts || this.config.maxRetries)) {
        item.retryCount++;
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
        return this.processItem(job, item);
      }

      item.status = 'failed';
      item.error = err;
      item.endTime = new Date();

      if (job.onError) {
        job.onError(err, item);
      }

      throw err;
    }
  }

  private async extractItem(
    buffer: Buffer,
    item: BatchJobItem,
    config: BatchJobConfig
  ): Promise<unknown> {
    const extractor = this.extractorRegistry.get(item.inputFormat);
    if (!extractor) {
      throw new Error(`No extractor available for format: ${item.inputFormat}`);
    }

    const options = {
      ...((config.defaultOptions || {}) as Record<string, unknown>),
      ...(item.options || {}),
    };

    return extractor.execute(buffer, options);
  }

  private async convertItem(
    buffer: Buffer,
    item: BatchJobItem,
    _config: BatchJobConfig
  ): Promise<unknown> {
    if (!item.outputFormat) {
      throw new Error('Output format is required for conversion');
    }

    const converter = this.converterRegistry.get(item.inputFormat);
    if (!converter) {
      throw new Error(`No converter available for ${item.inputFormat}`);
    }

    // Options would be set on the converter instance via builder pattern
    // converter.setOptions(item.options || {});

    const options: ConvertFileOptions = {
      type: item.inputFormat,
      ...(item.options as any),
    };
    return converter.execute(buffer, options);
  }

  private async analyzeItem(
    buffer: Buffer,
    item: BatchJobItem,
    config: BatchJobConfig
  ): Promise<unknown> {
    // Import dynamically to avoid circular dependency
    const { DocumentAnalyzer } = await import('../analysis/index.js');
    const analyzer = new DocumentAnalyzer();

    const options = {
      ...((config.defaultOptions || {}) as Record<string, unknown>),
      ...(item.options || {}),
    } as AnalysisOptions;

    return analyzer.analyze(buffer, item.inputFormat, options);
  }
}

export class BatchJobBuilder {
  private processor: BatchProcessor;
  private name: string = '';
  private type: BatchJob['type'] = 'extraction';
  private config: BatchJobConfig = {};
  private items: Array<{
    data: InputDataType;
    inputFormat: FileFormat;
    outputFormat?: FileFormat;
    options?: Record<string, unknown>;
  }> = [];

  constructor(processor: BatchProcessor) {
    this.processor = processor;
  }

  setName(name: string): this {
    this.name = name;
    return this;
  }

  forExtraction(): this {
    this.type = 'extraction';
    return this;
  }

  forConversion(): this {
    this.type = 'conversion';
    return this;
  }

  forAnalysis(): this {
    this.type = 'analysis';
    return this;
  }

  withConcurrency(concurrency: number): this {
    this.config.concurrency = concurrency;
    return this;
  }

  withTimeout(timeout: number): this {
    this.config.timeout = timeout;
    return this;
  }

  withRetries(attempts: number): this {
    this.config.retryAttempts = attempts;
    return this;
  }

  continueOnError(value: boolean = true): this {
    this.config.continueOnError = value;
    return this;
  }

  withDefaultOptions(options: Record<string, unknown>): this {
    this.config.defaultOptions = options;
    return this;
  }

  outputTo(directory: string): this {
    this.config.outputDirectory = directory;
    return this;
  }

  addItem(
    data: InputDataType,
    inputFormat: FileFormat,
    outputFormat?: FileFormat,
    options?: Record<string, unknown>
  ): this {
    this.items.push({ data, inputFormat, outputFormat, options });
    return this;
  }

  addItems(
    items: Array<{
      data: InputDataType;
      inputFormat: FileFormat;
      outputFormat?: FileFormat;
      options?: Record<string, unknown>;
    }>
  ): this {
    this.items.push(...items);
    return this;
  }

  build(): BatchJob {
    const job = this.processor.createJob(this.name || 'Batch Job', this.type, this.config);
    if (this.items.length > 0) {
      this.processor.addItems(job.id, this.items);
    }
    return job;
  }

  async buildAndStart(): Promise<BatchJobResult> {
    const job = this.build();
    return this.processor.startJob(job.id);
  }

  reset(): this {
    this.name = '';
    this.type = 'extraction';
    this.config = {};
    this.items = [];
    return this;
  }
}

export { BatchProcessor as default };
