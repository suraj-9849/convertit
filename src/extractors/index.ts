/**
 * Extractors Index
 * Export all extractors and utilities
 */

export { BaseExtractor, ExtractorRegistry, ExtractorUtils, DEFAULT_STOP_WORDS } from './base.js';
export { PDFExtractor } from './pdf.js';
export { WordExtractor } from './word.js';
export { ExcelExtractor, ExcelExtractorUtils } from './excel.js';
export { ImageExtractor, ImageExtractorUtils } from './image.js';
export { CSVExtractor, CSVExtractorUtils } from './csv.js';

import { ExtractorRegistry } from './base.js';
import { PDFExtractor } from './pdf.js';
import { WordExtractor } from './word.js';
import { ExcelExtractor } from './excel.js';
import { ImageExtractor } from './image.js';
import { CSVExtractor } from './csv.js';

/**
 * Initialize all extractors in the registry
 */
export function initializeExtractors(): ExtractorRegistry {
  const registry = ExtractorRegistry.getInstance();

  if (!registry.has('pdf')) {
    registry.register('pdf', new PDFExtractor());
    registry.register('word', new WordExtractor());
    registry.register('docx', new WordExtractor());
    registry.register('excel', new ExcelExtractor());
    registry.register('xlsx', new ExcelExtractor());
    registry.register('csv', new CSVExtractor());
    registry.register('png', new ImageExtractor());
    registry.register('jpg', new ImageExtractor());
    registry.register('jpeg', new ImageExtractor());
    registry.register('webp', new ImageExtractor());
    registry.register('gif', new ImageExtractor());
    registry.register('bmp', new ImageExtractor());
    registry.register('tiff', new ImageExtractor());
  }

  return registry;
}
