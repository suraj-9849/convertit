import { describe, test, expect, beforeAll } from 'bun:test';
import Convertit, {
  ConvertitBuilder,
  PDFConverter,
  WordConverter,
  ExcelConverter,
  CSVConverter,
  HTMLConverter,
  ImageConverter,
  TextConverter,
  JSONConverter,
  XMLConverter,
  MarkdownConverter,
  ExcelExtractorUtils,
  CSVExtractorUtils,
  ImageExtractorUtils,
  validateOptions,
  validateInput,
  isValidFormat,
  getMimeType,
  getFileExtension,
  normalizeFormat,
  isDocumentFormat,
  isSpreadsheetFormat,
  isImageFormat,
  parseColor,
  escapeHtml,
  formatFileSize,
  deepMerge,
} from '../src/index';

describe('Convertit', () => {
  describe('Constructor', () => {
    test('should create instance with valid options', () => {
      const api = new Convertit('test data', { type: 'pdf' });
      expect(api).toBeDefined();
    });
  });

  describe('Static Methods', () => {
    test('from() should return builder instance', () => {
      const builder = Convertit.from('test data');
      expect(builder).toBeInstanceOf(ConvertitBuilder);
    });

    test('getSupportedFormats() should return array of formats', () => {
      const formats = Convertit.getSupportedFormats();
      expect(Array.isArray(formats)).toBe(true);
      expect(formats.length).toBeGreaterThan(0);
    });
  });
});

describe('Builder Pattern', () => {
  test('should chain methods correctly', () => {
    const builder = Convertit.from('test')
      .toPdf({ pageSize: 'A4' })
      .withWatermark({ text: 'DRAFT' })
      .withCompression({ level: 'medium' });

    expect(builder).toBeInstanceOf(ConvertitBuilder);
  });

  test('should throw error without format', async () => {
    const builder = Convertit.from('test');
    await expect(builder.toBuffer()).rejects.toThrow();
  });
});

describe('PDF Converter', () => {
  const converter = new PDFConverter();

  test('should convert string to PDF', async () => {
    const result = await converter.convert('Hello World', { type: 'pdf' });
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  test('should convert array to PDF', async () => {
    const data = [
      { name: 'suraj', age: 30 },
      { name: 'sathya', age: 25 },
    ];
    const result = await converter.convert(data, { type: 'pdf' });
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  test('should convert object to PDF', async () => {
    const data = { title: 'Test', content: 'Hello World' };
    const result = await converter.convert(data, { type: 'pdf' });
    expect(Buffer.isBuffer(result)).toBe(true);
  });
});

describe('Word Converter', () => {
  const converter = new WordConverter();

  test('should convert string to DOCX', async () => {
    const result = await converter.convert('Hello World', { type: 'word' });
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  test('should handle markdown-like headers', async () => {
    const text = '# Title\n## Subtitle\nParagraph text';
    const result = await converter.convert(text, { type: 'word' });
    expect(Buffer.isBuffer(result)).toBe(true);
  });
});

describe('Excel Converter', () => {
  const converter = new ExcelConverter();

  test('should convert array to XLSX', async () => {
    const data = [
      { name: 'suraj', email: 'suraj@test.com' },
      { name: 'sathya', email: 'sathya@test.com' },
    ];
    const result = await converter.convert(data, { type: 'excel' });
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  test('should handle empty array', async () => {
    const result = await converter.convert([], { type: 'excel' });
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  test('should handle nested object', async () => {
    const data = {
      users: [{ name: 'suraj' }],
      settings: { theme: 'dark' },
    };
    const result = await converter.convert(data, { type: 'excel' });
    expect(Buffer.isBuffer(result)).toBe(true);
  });
});

describe('CSV Converter', () => {
  const converter = new CSVConverter();

  test('should convert array to CSV', async () => {
    const data = [
      { name: 'suraj', age: 30 },
      { name: 'sathya', age: 25 },
    ];
    const result = await converter.convert(data, { type: 'csv' });
    const text = result.toString('utf-8');
    expect(text).toContain('name');
    expect(text).toContain('suraj');
  });

  test('should handle custom delimiter', async () => {
    const data = [{ a: 1, b: 2 }];
    const result = await converter.convert(data, {
      type: 'csv',
      csv: { delimiter: ';' },
    });
    const text = result.toString('utf-8');
    expect(text).toContain(';');
  });
});

describe('HTML Converter', () => {
  const converter = new HTMLConverter();

  test('should convert array to HTML table', async () => {
    const data = [{ name: 'suraj', email: 'suraj@test.com' }];
    const result = await converter.convert(data, { type: 'html' });
    const html = result.toString('utf-8');
    expect(html).toContain('<table');
    expect(html).toContain('suraj');
  });

  test('should convert markdown to HTML', async () => {
    const markdown = '# Title\n**Bold** text';
    const result = await converter.convert(markdown, { type: 'html' });
    const html = result.toString('utf-8');
    expect(html).toContain('<h1>');
    expect(html).toContain('<strong>');
  });
});

describe('Text Converters', () => {
  test('TextConverter should convert object to text', async () => {
    const converter = new TextConverter();
    const data = { name: 'suraj', age: 30 };
    const result = await converter.convert(data, { type: 'txt' });
    const text = result.toString('utf-8');
    expect(text).toContain('name');
    expect(text).toContain('suraj');
  });

  test('JSONConverter should format JSON', async () => {
    const converter = new JSONConverter();
    const data = { name: 'suraj' };
    const result = await converter.convert(data, { type: 'json' });
    const json = result.toString('utf-8');
    expect(JSON.parse(json)).toEqual(data);
  });

  test('XMLConverter should create valid XML', async () => {
    const converter = new XMLConverter();
    const data = { name: 'suraj' };
    const result = await converter.convert(data, { type: 'xml' });
    const xml = result.toString('utf-8');
    expect(xml).toContain('<?xml');
    expect(xml).toContain('<name>suraj</name>');
  });

  test('MarkdownConverter should create tables', async () => {
    const converter = new MarkdownConverter();
    const data = [{ a: 1, b: 2 }];
    const result = await converter.convert(data, { type: 'md' });
    const md = result.toString('utf-8');
    expect(md).toContain('|');
    expect(md).toContain('---');
  });
});

describe('Validation', () => {
  describe('validateOptions', () => {
    test('should validate valid options', () => {
      const result = validateOptions({ type: 'pdf' });
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    test('should reject missing type', () => {
      const result = validateOptions({} as any);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should reject invalid format', () => {
      const result = validateOptions({ type: 'invalid' as any });
      expect(result.valid).toBe(false);
    });
  });

  describe('validateInput', () => {
    test('should validate string input', () => {
      const result = validateInput('test');
      expect(result.valid).toBe(true);
    });

    test('should validate buffer input', () => {
      const result = validateInput(Buffer.from('test'));
      expect(result.valid).toBe(true);
    });

    test('should warn on empty string', () => {
      const result = validateInput('   ');
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    test('should reject null input', () => {
      const result = validateInput(null as any);
      expect(result.valid).toBe(false);
    });
  });

  describe('isValidFormat', () => {
    test('should return true for valid formats', () => {
      expect(isValidFormat('pdf')).toBe(true);
      expect(isValidFormat('word')).toBe(true);
      expect(isValidFormat('xlsx')).toBe(true);
    });

    test('should return false for invalid formats', () => {
      expect(isValidFormat('invalid')).toBe(false);
      expect(isValidFormat('')).toBe(false);
    });
  });
});

describe('Utility Functions', () => {
  describe('getMimeType', () => {
    test('should return correct MIME types', () => {
      expect(getMimeType('pdf')).toBe('application/pdf');
      expect(getMimeType('png')).toBe('image/png');
      expect(getMimeType('csv')).toBe('text/csv');
    });
  });

  describe('getFileExtension', () => {
    test('should return correct extensions', () => {
      expect(getFileExtension('pdf')).toBe('.pdf');
      expect(getFileExtension('word')).toBe('.docx');
      expect(getFileExtension('excel')).toBe('.xlsx');
    });
  });

  describe('normalizeFormat', () => {
    test('should normalize format aliases', () => {
      expect(normalizeFormat('doc')).toBe('word');
      expect(normalizeFormat('xls')).toBe('excel');
      expect(normalizeFormat('htm')).toBe('html');
    });

    test('should throw on invalid format', () => {
      expect(() => normalizeFormat('invalid')).toThrow();
    });
  });

  describe('Format type checks', () => {
    test('isDocumentFormat', () => {
      expect(isDocumentFormat('pdf')).toBe(true);
      expect(isDocumentFormat('word')).toBe(true);
      expect(isDocumentFormat('png')).toBe(false);
    });

    test('isSpreadsheetFormat', () => {
      expect(isSpreadsheetFormat('excel')).toBe(true);
      expect(isSpreadsheetFormat('csv')).toBe(true);
      expect(isSpreadsheetFormat('pdf')).toBe(false);
    });

    test('isImageFormat', () => {
      expect(isImageFormat('png')).toBe(true);
      expect(isImageFormat('jpg')).toBe(true);
      expect(isImageFormat('pdf')).toBe(false);
    });
  });

  describe('parseColor', () => {
    test('should parse hex colors', () => {
      expect(parseColor('#FF0000')).toEqual({ r: 255, g: 0, b: 0 });
      expect(parseColor('#00FF00')).toEqual({ r: 0, g: 255, b: 0 });
    });

    test('should parse short hex colors', () => {
      expect(parseColor('#F00')).toEqual({ r: 255, g: 0, b: 0 });
    });
  });

  describe('escapeHtml', () => {
    test('should escape HTML special characters', () => {
      expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
      expect(escapeHtml('"test"')).toBe('&quot;test&quot;');
      expect(escapeHtml("'test'")).toBe('&#39;test&#39;');
    });
  });

  describe('formatFileSize', () => {
    test('should format bytes correctly', () => {
      expect(formatFileSize(1024)).toBe('1.00 KB');
      expect(formatFileSize(1024 * 1024)).toBe('1.00 MB');
      expect(formatFileSize(500)).toBe('500.00 B');
    });
  });

  describe('deepMerge', () => {
    test('should merge objects deeply', () => {
      const target = { a: 1, b: { c: 2 } } as Record<string, any>;
      const source = { b: { d: 3 }, e: 4 } as Record<string, any>;
      const result = deepMerge(target, source);
      expect(result).toEqual({ a: 1, b: { c: 2, d: 3 }, e: 4 });
    });
  });
});

describe('CSV Utils', () => {
  test('should infer schema from records', () => {
    const records = [
      { name: 'suraj', age: 30 },
      { name: 'sathya', age: 25 },
    ];
    const schema = CSVExtractorUtils.inferSchema(records);
    expect(schema.name).toBeDefined();
    expect(schema.age).toBeDefined();
    expect(schema.name.type).toBe('string');
    expect(schema.age.type).toBe('number');
  });

  test('should find duplicates in records', () => {
    const records = [
      { name: 'suraj', age: 30 },
      { name: 'suraj', age: 30 },
      { name: 'sathya', age: 25 },
    ];
    const result = CSVExtractorUtils.findDuplicates(records);
    expect(result.duplicateCount).toBe(1);
    expect(result.uniqueCount).toBe(2);
  });
});

describe('Integration Tests', () => {
  test('should convert JSON to PDF', async () => {
    const data = { title: 'Report', items: [1, 2, 3] };
    const buffer = await Convertit.from(data).toPdf({ pageSize: 'A4' }).toBuffer();

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
  });

  test('should convert array to Excel', async () => {
    const data = [
      { name: 'Product A', price: 100 },
      { name: 'Product B', price: 200 },
    ];
    const buffer = await Convertit.from(data).toExcel({ sheetName: 'Products' }).toBuffer();

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
  });

  test('should convert text to HTML', async () => {
    const text = '# Hello World\nThis is a test';
    const buffer = await Convertit.from(text).toHtml({ title: 'Test Page' }).toBuffer();

    const html = buffer.toString('utf-8');
    expect(html).toContain('<h1>');
    expect(html).toContain('Test Page');
  });

  test('should handle progress callback', async () => {
    const progressCalls: any[] = [];

    await Convertit.from('test data')
      .toPdf()
      .onProgress(progress => progressCalls.push(progress))
      .toBuffer();

    expect(progressCalls.length).toBeGreaterThan(0);
  });
});
