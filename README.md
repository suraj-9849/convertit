# convertit

<p align="center">
  <a href="https://www.npmjs.com/package/convertit"><img src="https://img.shields.io/npm/v/convertit.svg" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/convertit"><img src="https://img.shields.io/npm/dm/convertit.svg" alt="npm downloads"></a>
  <a href="https://github.com/suraj-9849/convertit"><img src="https://img.shields.io/github/stars/suraj-9849/convertit.svg?style=social" alt="GitHub stars"></a>
</p>

<p align="center">
  <strong>A powerful, type-safe file conversion library for Node.js and Bun</strong>
</p>

<p align="center">
  Convert between PDF, Word, Excel, CSV, HTML, images, and more with a simple, intuitive API.
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#extraction">Extraction</a> •
  <a href="#analysis">Analysis</a> •
  <a href="#search">Search</a> •
  <a href="#batch-processing">Batch</a> •
  <a href="#streaming">Streaming</a> •
  <a href="#excel-styling">Excel</a> •
  <a href="#examples">Examples</a>
</p>

---

## Features

### File Conversion

- **Multiple Format Support**: PDF, Word (DOCX), Excel (XLSX), CSV, HTML, JSON, XML, Markdown, and various image formats
- **Simple API**: Convert files with just one line of code
- **Builder Pattern**: Fluent API for complex conversions
- **Excel Conditional Formatting**: Row colors, cell styles, data bars, color scales

### Extraction & Content Analysis

- **Extract Content**: Extract text, images, tables, links, annotations from PDFs, Word, Excel
- **Document Analysis**: Analyze structure, content, style, security, accessibility, and quality
- **Entity Recognition**: Extract emails, URLs, phone numbers, dates, amounts from documents
- **Sentiment Analysis**: Detect sentiment and language from text content
- **Metadata Extraction**: Pull EXIF, IPTC, XMP data from images
- **Table Extraction**: Extract and structure table data from documents

### Search & Indexing

- **Full-Text Search**: Search across multiple documents with ranking
- **Advanced Queries**: Boolean operators, fuzzy matching, regex support, phrase search
- **Document Indexing**: Build inverted indexes for fast searching
- **Relevance Scoring**: TF-IDF based ranking with context snippets
- **Search Suggestions**: Fuzzy matching for typo tolerance

### Batch & Streaming

- **Batch Processing**: Process multiple files with configurable concurrency
- **Stream Processing**: Memory-efficient chunked processing for large files
- **Progress Tracking**: Real-time progress callbacks and statistics
- **Retry Logic**: Automatic retries with exponential backoff
- **Error Handling**: Comprehensive error handling with recovery options

### Advanced Features

- **Template Engine**: Built-in template processing for document generation
- **Transformers**: Compression, watermarks, merging, splitting, rotation
- **Document Comparison**: Compare versions, track changes, similarity scoring
- **Excel Conditional Formatting**: Row colors, cell styles, data bars, color scales
- **Type-Safe**: Full TypeScript support with comprehensive type definitions
- **Extensible**: Plugin system for custom converters and processors

## Installation

```bash
# Using bun
bun add convertit

# Using npm
npm install convertit

# Using yarn
yarn add convertit

# Using pnpm
pnpm add convertit
```

## Quick Start

### Basic Usage

```typescript
import convertit from 'convertit';

// Convert data to PDF
const result = await convertit.from(data).toPdf().toBuffer();

// Save directly to file
await convertit.from(data).toPdf().toFile('output.pdf');

// Get as Base64
const base64 = await convertit.from(data).toPdf().toBase64();
```

### Builder Pattern (Fluent API)

```typescript
import convertit from 'convertit';

// Convert JSON to PDF with options
const buffer = await convertit
  .from(jsonData)
  .toPdf({ pageSize: 'A4', orientation: 'landscape' })
  .withWatermark({ text: 'DRAFT', opacity: 0.3 })
  .withCompression({ level: 'medium' })
  .toBuffer();
```

## Extraction

Extract content from documents without converting them:

```typescript
import { Convertit } from 'convertit';

// Extract text from PDF
const result = await Convertit.extract(pdfFile, 'pdf', {
  extractText: true,
  extractImages: true,
  extractTables: true,
  extractLinks: true,
});

console.log(result.data.text?.content);
console.log(result.data.images?.length);
console.log(result.data.tables);
```

### Supported Extractions

- **Text**: Full text with formatting and positioning
- **Images**: Images with metadata, EXIF data, and dimensions
- **Tables**: Structured table data with headers and rows
- **Links**: Hyperlinks with destinations and text
- **Annotations**: Comments, highlights, notes
- **Metadata**: Document properties, creation date, author
- **Styles**: Font information, colors, formatting

## Analysis

Analyze document structure, content, and quality:

```typescript
import { Convertit } from 'convertit';

// Analyze document
const analysis = await Convertit.analyze(wordFile, 'word', {
  analyzeStructure: true,
  analyzeContent: true,
  analyzeStyle: true,
  generateSummary: true,
  extractKeywords: true,
  detectSentiment: true,
});

console.log(analysis.structure); // Sections, chapters, headings
console.log(analysis.content); // Text stats, keywords, entities
console.log(analysis.summary); // Abstract, key points, reading time
```

### Analysis Capabilities

- **Structure**: Sections, chapters, headings, page breaks
- **Content**: Text statistics, keyword extraction, entity recognition
- **Style**: Font usage, colors, formatting consistency
- **Security**: Encryption, permissions, macros, external links
- **Accessibility**: WCAG compliance, alt text, reading order
- **Quality**: Image quality, readability, formatting issues
- **Comparison**: Compare versions and track changes

## Search

Search across multiple documents:

```typescript
import { Convertit } from 'convertit';

// Create search engine
const searchEngine = Convertit.createSearchEngine();

// Index documents
await searchEngine.index({
  data: document1,
  format: 'pdf',
  name: 'doc1.pdf',
});
await searchEngine.index({
  data: document2,
  format: 'pdf',
  name: 'doc2.pdf',
});

// Search with advanced options
const results = await searchEngine.search('keyword', {
  fuzzyMatch: true,
  maxResults: 50,
  includeContext: true,
  highlightMatches: true,
});

results.hits.forEach(hit => {
  console.log(`${hit.documentName}: ${hit.highlightedSnippet}`);
});
```

### Search Features

- **Full-Text Search**: Index and search across documents
- **Fuzzy Matching**: Typo-tolerant search with configurable threshold
- **Boolean Queries**: Support for +required and -excluded terms
- **Phrase Search**: Find exact phrases with "quoted text"
- **Regular Expressions**: Use /regex/ patterns in queries
- **Context Snippets**: Get surrounding text for matches
- **Highlighting**: HTML-highlighted results
- **Ranking**: TF-IDF based relevance scoring

## Batch-processing

Process multiple files with concurrency control:

```typescript
import { Convertit } from 'convertit';

// Extract from multiple files in parallel
const { results, errors } = await Convertit.batchExtract(
  [
    { data: pdf1, format: 'pdf' },
    { data: pdf2, format: 'pdf' },
    { data: word1, format: 'word' },
  ],
  {
    concurrency: 3,
    retryAttempts: 2,
    timeout: 30000,
  }
);

console.log(`Processed: ${results.length}, Failed: ${errors.length}`);
```

### Batch Features

- **Concurrent Processing**: Configurable concurrency limits
- **Retry Logic**: Automatic retries with exponential backoff
- **Progress Tracking**: Real-time progress callbacks
- **Error Handling**: Graceful error handling with detailed error info
- **Timeout Support**: Per-item timeout configuration
- **Job Management**: Pause, resume, and cancel operations

## Streaming

Memory-efficient processing of large files:

```typescript
import { Convertit } from 'convertit';

// Create stream processor
const processor = await Convertit.createStreamProcessor({
  chunkSize: 64 * 1024, // 64KB chunks
  emitProgress: true,
  progressInterval: 100,
});

// Handle streamed data
processor.onData(chunk => {
  console.log(`Received chunk: ${chunk.size} bytes`);
});

processor.onProgress(progress => {
  console.log(`Progress: ${progress.percentage}% (${progress.rate} bytes/sec)`);
});

processor.onEnd(() => {
  console.log('Streaming complete');
});

// Process large file
await processor.process(largeFile, 'pdf');
```

### Streaming Features

- **Chunked Processing**: Process large files in configurable chunks
- **Backpressure Handling**: Automatic flow control
- **Progress Events**: Real-time progress reporting
- **Memory Efficient**: Constant memory usage regardless of file size
- **Pipeline Builder**: Chain transformations in pipeline
- **Pause/Resume**: Control stream processing flow

## Excel Styling

### Conditional Row Formatting

convertit supports powerful Excel conditional formatting. Color entire rows based on values:

```typescript
import convertit, { StylePresets } from 'convertit';

const salesData = [
  { name: 'Suraj', amount: 15000, status: 'Achieved' },
  { name: 'Sathya', amount: 0, status: 'Pending' },
  { name: 'Pruthvi', amount: -500, status: 'Deficit' },
];

// Create Excel with conditional row colors
const excel = await convertit
  .from(salesData)
  .toExcel({
    sheetName: 'Sales Report',
    rowStyles: [
      // Zebra striping - blue for even rows
      {
        condition: { type: 'even' },
        style: { fill: { color: '#E3F2FD' } },
      },
      // Red row if amount is 0
      {
        condition: {
          type: 'columnValue',
          column: 'amount',
          operator: 'equal',
          value: 0,
        },
        style: {
          fill: { color: '#FFCDD2' },
          font: { color: '#C62828', bold: true },
        },
      },
      // Green row if amount is positive
      {
        condition: {
          type: 'columnValue',
          column: 'amount',
          operator: 'greaterThan',
          value: 0,
        },
        style: StylePresets.positiveHighlight,
      },
      // Custom expression-based styling
      {
        condition: {
          type: 'expression',
          expression: row => row.status === 'Deficit',
        },
        style: StylePresets.negativeHighlight,
      },
    ],
  })
  .toFile('styled-report.xlsx');
```

### Row Style Conditions

| Condition Type | Description              | Example                                                                  |
| -------------- | ------------------------ | ------------------------------------------------------------------------ |
| `even`         | Style even-numbered rows | `{ type: 'even' }`                                                       |
| `odd`          | Style odd-numbered rows  | `{ type: 'odd' }`                                                        |
| `columnValue`  | Based on column value    | `{ type: 'columnValue', column: 'amount', operator: 'equal', value: 0 }` |
| `expression`   | Custom JavaScript logic  | `{ type: 'expression', expression: (row) => row.amount < 0 }`            |

### Cell Styles

Style specific cells, columns, or ranges:

```typescript
await convertit
  .from(data)
  .toExcel({
    cellStyles: [
      // Style entire column
      {
        target: 'D', // Column D (amount)
        style: {
          numFmt: '$#,##0.00',
          alignment: { horizontal: 'right' },
        },
      },
      // Style header row
      {
        target: 'A1:F1',
        style: {
          font: { bold: true, color: '#FFFFFF' },
          fill: { color: '#1976D2' },
        },
      },
      // Style specific cell
      {
        target: 'A10',
        style: {
          font: { bold: true, size: 14 },
          border: { bottom: { style: 'thick' } },
        },
      },
    ],
  })
  .toFile('styled-cells.xlsx');
```

### Style Presets

Use built-in presets for common styling scenarios:

```typescript
import { StylePresets } from 'convertit';

// Available presets:
StylePresets.positiveHighlight; // Green background
StylePresets.negativeHighlight; // Red background
StylePresets.warningHighlight; // Yellow/amber background
StylePresets.headerStyle; // Bold white text on blue
StylePresets.totalRow; // Bold with top border
StylePresets.currencyFormat; // Currency number format
StylePresets.percentFormat; // Percentage format
```

### Native Excel Conditional Formatting

Apply Excel's built-in conditional formatting rules:

```typescript
await convertit
  .from(data)
  .toExcel({
    conditionalFormatting: [
      // Data bars
      {
        type: 'dataBar',
        ref: 'D2:D100',
        rules: { color: '4CAF50' },
      },
      // Color scale (heat map)
      {
        type: 'colorScale',
        ref: 'E2:E100',
        rules: { color: 'F44336' },
      },
      // Icon sets
      {
        type: 'iconSet',
        ref: 'F2:F100',
        rules: { iconSet: '3TrafficLights' },
      },
    ],
  })
  .toFile('conditional-formatting.xlsx');
```

## Supported Conversions

### Documents

- **PDF**: Create PDFs from text, JSON, arrays, or other data
- **Word (DOCX)**: Generate Word documents with formatting
- **HTML**: Convert to HTML with templates and styling
- **Markdown**: Generate Markdown from various sources
- **Plain Text**: Extract or convert to plain text

### Spreadsheets

- **Excel (XLSX)**: Create spreadsheets with multiple sheets, formulas, conditional formatting, and styling
- **CSV**: Generate CSV with custom delimiters

### Data Formats

- **JSON**: Convert to/from JSON
- **XML**: Generate XML from data

### Images

- **PNG, JPG, JPEG, WebP, GIF, BMP, TIFF**: Convert between image formats
- **Resize, crop, rotate, and apply filters**

## API Reference

### Convertit Class

```typescript
// Static Methods (Recommended)
convertit.from(data): ConvertitBuilder
convertit.batch(items, concurrency): Promise<BatchConversionResult>
convertit.merge(files, format): Promise<Buffer>
convertit.split(data, format, config): Promise<Buffer[]>

// Instance Methods
convert(): Promise<ConversionResult>
toBuffer(): Promise<Buffer>
toBase64(): Promise<string>
toFile(path: string): Promise<string>
```

### Builder Methods

```typescript
// Format converters
.toPdf(options?: PDFOptions)
.toWord(options?: WordOptions)
.toExcel(options?: ExcelOptions)
.toCsv(options?: CSVOptions)
.toHtml(options?: HTMLOptions)
.toImage(format?, options?: ImageOptions)
.toJson()
.toText()
.toMarkdown()
.toXml()

// Transformers
.withWatermark(config: WatermarkConfig)
.withEncryption(config: EncryptionConfig)
.withCompression(config: CompressionConfig)
.withPageNumbers(config: PageNumberConfig)

// Layout
.landscape()
.pageSize(size: 'A4' | 'A3' | 'A5' | 'Letter' | 'Legal')

// Output
.toBuffer(): Promise<Buffer>
.toBase64(): Promise<string>
.toFile(path: string): Promise<string>
```

## Examples

### Convert JSON Array to Excel with Styling

```typescript
const data = [
  { name: 'Suraj', email: 'surajlohit42@example.com', salary: 85000 },
  { name: 'Sathya', email: 'sathya@example.com', salary: 95000 },
  { name: 'Karthik', email: 'karthik@example.com', salary: 79000 },
  { name: 'Charan', email: 'charan@example.com', salary: 91000 },
  { name: 'Sid', email: 'sid@example.com', salary: 75000 },
  { name: 'pruthvi', email: 'pruthvi@example.com', salary: 95000 },
  { name: 'Ayushman', email: 'ayushman@example.com', salary: 95000 },
];

const buffer = await convertit
  .from(data)
  .toExcel({
    sheetName: 'Employees',
    autoFilter: true,
    freezePane: { row: 1 },
    autoWidth: true,
    rowStyles: [{ condition: { type: 'even' }, style: { fill: { color: '#F5F5F5' } } }],
    cellStyles: [
      {
        target: 'C', // Salary column
        style: { numFmt: '$#,##0.00' },
      },
    ],
  })
  .toBuffer();
```

### Create PDF with Headers and Footers

```typescript
const buffer = await convertit
  .from(content)
  .toPdf({
    pageSize: 'A4',
    margins: { top: 72, bottom: 72, left: 72, right: 72 },
    header: {
      enabled: true,
      content: 'Company Report',
      alignment: 'center',
    },
    footer: {
      enabled: true,
      includePageNumber: true,
    },
  })
  .toBuffer();
```

### Add Watermark to PDF

```typescript
const watermarkedPdf = await convertit
  .from(pdfBuffer)
  .toPdf()
  .withWatermark({
    text: 'CONFIDENTIAL',
    opacity: 0.3,
    rotation: -45,
    font: { size: 50, color: '#FF0000' },
  })
  .toBuffer();
```

### Batch Convert Multiple Files

```typescript
const items = [
  { data: data1, options: { type: 'pdf' } },
  { data: data2, options: { type: 'xlsx' } },
  { data: data3, options: { type: 'docx' } },
];

const result = await convertit.batch(items, 3);
console.log(`Converted ${result.successCount}/${result.totalFiles} files`);
```

## Direct Converter Usage

For advanced use cases, use converters directly:

```typescript
import { PDFManipulator, ExcelUtils, ExcelStyleEngine, ImageUtils } from 'convertit';

// PDF manipulation
const pageCount = await PDFManipulator.getPageCount(pdfBuffer);
const rotated = await PDFManipulator.rotatePages(pdfBuffer, 90);

// Excel utilities
const data = await ExcelUtils.readAsJson(excelBuffer);
const sheetNames = await ExcelUtils.getSheetNames(excelBuffer);

// Image utilities
const metadata = await ImageUtils.getMetadata(imageBuffer);
const thumbnail = await ImageUtils.createThumbnail(imageBuffer, 150, 150);
```

## Template Engine

Built-in template engine for document generation:

```typescript
import { TemplateEngine } from 'convertit';

const engine = new TemplateEngine();

const template = `
Hello {{name}}!

{{#if premium}}
Thank you for being a premium member!
{{else}}
Consider upgrading to premium.
{{/if}}

Your orders:
{{#each orders}}
- {{description}}: {{formatCurrency total}}
{{/each}}

Total: {{formatCurrency grandTotal}}
`;

const html = engine.render(template, {
  name: 'Suraj',
  premium: true,
  orders: [
    { description: 'Widget', total: 29.99 },
    { description: 'Gadget', total: 49.99 },
  ],
  grandTotal: 79.98,
});
```

## Error Handling

```typescript
import { isConvertFileError, ErrorCode } from 'convertit';

try {
  const result = await convertit.from(data).toPdf().toBuffer();
} catch (error) {
  if (isConvertFileError(error)) {
    console.error(`Error [${error.code}]: ${error.message}`);
    if (error.recoverable) {
      // Implement retry logic
    }
  }
}
```

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
import type {
  FileFormat,
  ConvertFileOptions,
  ExcelOptions,
  RowStyleRule,
  CellStyleRule,
  CellStyle,
} from 'convertit';
```

## Development

```bash
# Install dependencies
bun install

# Run tests
bun test

# Build
bun run build

# Lint
bun run lint

# Type check
bun run typecheck
```

## Contributing

Contributions are welcome! This project uses:

- ESLint for linting
- Husky for git hooks
- lint-staged for pre-commit checks
- GitHub Actions for CI/CD

Please ensure your PR passes all checks before submitting.
