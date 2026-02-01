import { ConverterRegistry } from './base.js';
import { PDFConverter } from './pdf.js';
import { WordConverter } from './word.js';
import { ExcelConverter } from './excel.js';
import { CSVConverter } from './csv.js';
import { HTMLConverter } from './html.js';
import { ImageConverter } from './image.js';
import { TextConverter, JSONConverter, XMLConverter, MarkdownConverter } from './text.js';

// Re-export all converters
export { ConverterRegistry } from './base.js';
export { PDFConverter } from './pdf.js';
export { WordConverter } from './word.js';
export { ExcelConverter } from './excel.js';
export { CSVConverter } from './csv.js';
export { HTMLConverter } from './html.js';
export { ImageConverter } from './image.js';
export { TextConverter, JSONConverter, XMLConverter, MarkdownConverter } from './text.js';

/**
 * Initialize all converters and register them in the registry
 */
export function initializeConverters(): ConverterRegistry {
  const registry = ConverterRegistry.getInstance();

  // Only register if not already registered
  if (!registry.has('pdf')) {
    registry.register('pdf', new PDFConverter());
    registry.register('word', new WordConverter());
    registry.register('docx', new WordConverter());
    registry.register('excel', new ExcelConverter());
    registry.register('xlsx', new ExcelConverter());
    registry.register('csv', new CSVConverter());
    registry.register('html', new HTMLConverter());
    registry.register('txt', new TextConverter());
    registry.register('json', new JSONConverter());
    registry.register('xml', new XMLConverter());
    registry.register('md', new MarkdownConverter());
    registry.register('markdown', new MarkdownConverter());
    registry.register('png', new ImageConverter('png'));
    registry.register('jpg', new ImageConverter('jpg'));
    registry.register('jpeg', new ImageConverter('jpeg'));
    registry.register('webp', new ImageConverter('webp'));
    registry.register('gif', new ImageConverter('gif'));
    registry.register('bmp', new ImageConverter('bmp'));
    registry.register('tiff', new ImageConverter('tiff'));
  }

  return registry;
}
