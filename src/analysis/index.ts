/**
 * Document Analysis Module
 * Comprehensive document analysis, comparison, and intelligence
 */

import type {
  FileFormat,
  InputDataType,
  AnalysisOptions,
  AnalysisResult,
  ComparisonOptions,
  ComparisonResult,
  DocumentMetadata,
  StructureAnalysis,
  ContentAnalysis,
  StyleAnalysis,
  SecurityAnalysis,
  AccessibilityAnalysis,
  QualityAnalysis,
  DocumentSummary,
  TextStatistics,
  KeywordInfo,
  ExtractedEntity,
  LanguageInfo,
  SentimentInfo,
  DocumentDifference,
  DocumentChange,
  ComparisonSummary,
  HeadingInfo,
  FontUsage,
  ColorUsage,
  ConsistencyReport,
  SecurityRisk,
  AccessibilityIssue,
  QualityRecommendation,
} from '../core/types.js';
import { ExtractorRegistry, ExtractorUtils, initializeExtractors } from '../extractors/index.js';
import { toBuffer } from '../utils/helpers.js';

/**
 * Default analysis options
 */
const DEFAULT_ANALYSIS_OPTIONS: AnalysisOptions = {
  analyzeStructure: true,
  analyzeContent: true,
  analyzeStyle: true,
  analyzeSecurity: true,
  analyzeAccessibility: true,
  analyzeQuality: true,
  generateSummary: true,
  extractKeywords: true,
  extractEntities: true,
  detectLanguage: true,
  detectSentiment: false,
};

export class DocumentAnalyzer {
  private registry: ExtractorRegistry;

  constructor() {
    this.registry = initializeExtractors();
  }

  async analyze(
    data: InputDataType,
    format: FileFormat,
    options: AnalysisOptions = {}
  ): Promise<AnalysisResult> {
    const opts = { ...DEFAULT_ANALYSIS_OPTIONS, ...options };
    const buffer = await toBuffer(data);

    // Extract content first
    const extractor = this.registry.get(format);
    if (!extractor) {
      throw new Error(`No extractor available for format: ${format}`);
    }

    const extractionResult = await extractor.execute(buffer, {});
    const extractedData = extractionResult.data as Record<string, unknown>;

    const result: AnalysisResult = {
      documentInfo: extractionResult.metadata,
    };

    // Analyze structure
    if (opts.analyzeStructure) {
      result.structure = this.analyzeStructure(extractedData);
    }

    // Analyze content
    if (opts.analyzeContent) {
      result.content = this.analyzeContent(extractedData, opts);
    }

    // Analyze style
    if (opts.analyzeStyle) {
      result.style = this.analyzeStyle(extractedData);
    }

    // Analyze security
    if (opts.analyzeSecurity) {
      result.security = this.analyzeSecurity(extractedData, extractionResult.metadata);
    }

    // Analyze accessibility
    if (opts.analyzeAccessibility) {
      result.accessibility = this.analyzeAccessibility(extractedData);
    }

    // Analyze quality
    if (opts.analyzeQuality) {
      result.quality = this.analyzeQuality(extractedData);
    }

    // Generate summary
    if (opts.generateSummary && extractedData.text) {
      result.summary = this.generateSummary(extractedData);
    }

    return result;
  }

  private analyzeStructure(data: Record<string, unknown>): StructureAnalysis {
    const headings: HeadingInfo[] = [];
    let sections = 0;
    let chapters = 0;
    const pageBreaks = 0;
    const columns = 1;

    // Extract from text paragraphs if available
    const text = data.text as
      | { paragraphs?: Array<{ type: string; level?: number; content: string }> }
      | undefined;

    if (text?.paragraphs) {
      const headingCounts: Map<number, number> = new Map();

      for (const para of text.paragraphs) {
        if (para.type === 'heading') {
          const level = para.level || 1;
          headings.push({
            level,
            text: para.content,
            count: 1,
          });

          headingCounts.set(level, (headingCounts.get(level) || 0) + 1);

          if (level === 1) chapters++;
          if (level <= 2) sections++;
        }
      }
    }

    // Check for sections in Word documents
    const docSections = data.sections as Array<unknown> | undefined;
    if (docSections) {
      sections = Math.max(sections, docSections.length);
    }

    return {
      sections,
      chapters,
      headings,
      pageBreaks,
      columns,
    };
  }

  private analyzeContent(data: Record<string, unknown>, opts: AnalysisOptions): ContentAnalysis {
    const text = data.text as { content?: string; statistics?: TextStatistics } | undefined;
    const content = text?.content || '';

    const result: ContentAnalysis = {
      textStatistics: text?.statistics || this.calculateTextStats(content),
      keywords: [],
    };

    // Extract keywords
    if (opts.extractKeywords && content) {
      result.keywords = this.extractKeywords(content);
    }

    // Extract entities
    if (opts.extractEntities && content) {
      result.entities = this.extractEntities(content);
    }

    // Detect language
    if (opts.detectLanguage && content) {
      result.language = this.detectLanguage(content);
    }

    // Detect sentiment
    if (opts.detectSentiment && content) {
      result.sentiment = this.detectSentiment(content);
    }

    return result;
  }

  private calculateTextStats(content: string): TextStatistics {
    const stats = ExtractorUtils.calculateTextStatistics(content);
    const words = content.split(/\s+/).filter(w => w.length > 0);
    const syllables = words.reduce((sum, word) => sum + ExtractorUtils.countSyllables(word), 0);

    return {
      totalCharacters: stats.characters,
      totalWords: stats.words,
      totalSentences: stats.sentences,
      totalParagraphs: stats.paragraphs,
      totalPages: 1,
      averageWordsPerSentence: stats.sentences > 0 ? stats.words / stats.sentences : 0,
      averageCharactersPerWord: stats.words > 0 ? stats.characters / stats.words : 0,
      readingTimeMinutes: ExtractorUtils.calculateReadingTime(stats.words),
      speakingTimeMinutes: ExtractorUtils.calculateSpeakingTime(stats.words),
      readabilityScores: {
        fleschKincaidGrade: ExtractorUtils.calculateFleschKincaidGrade(
          stats.words,
          stats.sentences,
          syllables
        ),
        fleschReadingEase: ExtractorUtils.calculateFleschReadingEase(
          stats.words,
          stats.sentences,
          syllables
        ),
      },
    };
  }

  private extractKeywords(content: string): KeywordInfo[] {
    return ExtractorUtils.extractKeywords(content, { maxKeywords: 20 });
  }

  private extractEntities(content: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];

    // Email addresses
    const emails = content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
    if (emails) {
      for (const email of [...new Set(emails)]) {
        entities.push({
          text: email,
          type: 'email',
          confidence: 1.0,
        });
      }
    }

    // URLs
    const urls = content.match(/https?:\/\/[^\s<>"{}|\\^`[\]]+/g);
    if (urls) {
      for (const url of [...new Set(urls)]) {
        entities.push({
          text: url,
          type: 'url',
          confidence: 1.0,
        });
      }
    }

    // Phone numbers (various formats)
    const phones = content.match(
      /[+]?[(]?[0-9]{1,3}[)]?[-\s.]?[(]?[0-9]{1,3}[)]?[-\s.]?[0-9]{3,6}[-\s.]?[0-9]{3,6}/g
    );
    if (phones) {
      for (const phone of [...new Set(phones)]) {
        entities.push({
          text: phone,
          type: 'phone',
          confidence: 0.9,
        });
      }
    }

    // Dates (various formats)
    const datePatterns = [
      /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g,
      /\b\d{4}[/-]\d{1,2}[/-]\d{1,2}\b/g,
      /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/gi,
    ];

    for (const pattern of datePatterns) {
      const dates = content.match(pattern);
      if (dates) {
        for (const date of [...new Set(dates)]) {
          entities.push({
            text: date,
            type: 'date',
            confidence: 0.8,
          });
        }
      }
    }

    // Money amounts
    const money = content.match(/[$€£¥]\s*\d+(?:,\d{3})*(?:\.\d{1,2})?/g);
    if (money) {
      for (const amount of [...new Set(money)]) {
        entities.push({
          text: amount,
          type: 'money',
          confidence: 0.95,
        });
      }
    }

    return entities;
  }

  private detectLanguage(content: string): LanguageInfo {
    // Simple language detection based on common words
    const languageIndicators: Record<string, string[]> = {
      en: [
        'the',
        'and',
        'is',
        'are',
        'was',
        'were',
        'have',
        'has',
        'been',
        'will',
        'would',
        'could',
        'should',
      ],
      es: [
        'el',
        'la',
        'los',
        'las',
        'de',
        'en',
        'que',
        'y',
        'es',
        'un',
        'una',
        'por',
        'con',
        'para',
      ],
      fr: ['le', 'la', 'les', 'de', 'et', 'en', 'que', 'est', 'un', 'une', 'pour', 'dans', 'avec'],
      de: [
        'der',
        'die',
        'das',
        'und',
        'ist',
        'in',
        'zu',
        'den',
        'mit',
        'auf',
        'für',
        'von',
        'nicht',
      ],
      it: ['il', 'la', 'di', 'che', 'e', 'in', 'un', 'una', 'per', 'con', 'del', 'della', 'sono'],
      pt: ['o', 'a', 'os', 'as', 'de', 'em', 'que', 'e', 'um', 'uma', 'para', 'com', 'por'],
    };

    const words = content.toLowerCase().split(/\s+/);
    const scores: Record<string, number> = {};

    for (const [lang, indicators] of Object.entries(languageIndicators)) {
      scores[lang] = 0;
      for (const indicator of indicators) {
        const count = words.filter(w => w === indicator).length;
        scores[lang] += count;
      }
    }

    const sortedLangs = Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .filter(([, score]) => score > 0);

    if (sortedLangs.length === 0) {
      return { detected: 'unknown', confidence: 0 };
    }

    const [topLang, topScore] = sortedLangs[0]!;
    const totalScore = sortedLangs.reduce((sum, [, score]) => sum + score, 0);

    return {
      detected: topLang,
      confidence: Math.min(topScore / Math.max(totalScore, 1), 1),
      alternatives: sortedLangs.slice(1, 4).map(([lang, score]) => ({
        language: lang,
        confidence: score / Math.max(totalScore, 1),
      })),
    };
  }

  private detectSentiment(content: string): SentimentInfo {
    // Simple sentiment analysis using word lists
    const positiveWords = new Set([
      'good',
      'great',
      'excellent',
      'amazing',
      'wonderful',
      'fantastic',
      'awesome',
      'love',
      'happy',
      'joy',
      'beautiful',
      'perfect',
      'best',
      'brilliant',
      'outstanding',
      'positive',
      'success',
      'successful',
      'win',
      'winner',
      'improve',
      'improvement',
      'benefit',
      'beneficial',
      'advantage',
      'opportunity',
      'growth',
      'progress',
    ]);

    const negativeWords = new Set([
      'bad',
      'terrible',
      'awful',
      'horrible',
      'poor',
      'worst',
      'hate',
      'sad',
      'angry',
      'upset',
      'disappointing',
      'failure',
      'fail',
      'problem',
      'issue',
      'negative',
      'loss',
      'lose',
      'decline',
      'decrease',
      'damage',
      'harm',
      'risk',
      'danger',
      'threat',
      'crisis',
      'error',
      'mistake',
      'wrong',
    ]);

    const words = content.toLowerCase().split(/\s+/);
    let positiveCount = 0;
    let negativeCount = 0;

    for (const word of words) {
      const cleanWord = word.replace(/[^a-z]/g, '');
      if (positiveWords.has(cleanWord)) positiveCount++;
      if (negativeWords.has(cleanWord)) negativeCount++;
    }

    const total = positiveCount + negativeCount;
    if (total === 0) {
      return { overall: 'neutral', score: 0, magnitude: 0 };
    }

    const score = (positiveCount - negativeCount) / total;
    const magnitude = total / words.length;

    let overall: SentimentInfo['overall'];
    if (score > 0.2) overall = 'positive';
    else if (score < -0.2) overall = 'negative';
    else if (positiveCount > 0 && negativeCount > 0) overall = 'mixed';
    else overall = 'neutral';

    return { overall, score, magnitude };
  }

  private analyzeStyle(data: Record<string, unknown>): StyleAnalysis {
    const fonts: FontUsage[] = [];
    const colors: ColorUsage[] = [];
    const paragraphStyles: Array<{ name: string; usageCount: number }> = [];

    // Extract style information from extracted data
    const styles = data.styles as Array<{ font?: { family?: string; size?: number } }> | undefined;

    if (styles) {
      const fontMap = new Map<string, { count: number; sizes: Set<number> }>();

      for (const style of styles) {
        if (style.font?.family) {
          const existing = fontMap.get(style.font.family) || { count: 0, sizes: new Set() };
          existing.count++;
          if (style.font.size) {
            existing.sizes.add(style.font.size);
          }
          fontMap.set(style.font.family, existing);
        }
      }

      for (const [family, data] of fontMap.entries()) {
        fonts.push({
          fontFamily: family,
          usageCount: data.count,
          sizes: Array.from(data.sizes),
          styles: [],
        });
      }
    }

    const consistency = this.analyzeConsistency(data);

    return {
      fonts,
      colors,
      paragraphStyles,
      consistency,
    };
  }

  private analyzeConsistency(data: Record<string, unknown>): ConsistencyReport {
    const issues: Array<{
      type: 'font' | 'size' | 'spacing' | 'alignment' | 'color';
      description: string;
      locations: number[];
      severity: 'low' | 'medium' | 'high';
    }> = [];

    // Check for font consistency
    const styles = data.styles as Array<{ font?: { family?: string } }> | undefined;
    if (styles) {
      const fontFamilies = new Set(styles.map(s => s.font?.family).filter(Boolean));
      if (fontFamilies.size > 3) {
        issues.push({
          type: 'font',
          description: `Document uses ${fontFamilies.size} different fonts, which may affect readability`,
          locations: [],
          severity: 'medium',
        });
      }
    }

    const score = Math.max(0, 100 - issues.length * 10);

    return {
      isConsistent: issues.length === 0,
      issues,
      score,
    };
  }

  private analyzeSecurity(
    data: Record<string, unknown>,
    metadata: DocumentMetadata
  ): SecurityAnalysis {
    const risks: SecurityRisk[] = [];
    const externalLinks = data.links as Array<{ type: string; url: string }> | undefined;

    // Check for external links
    if (externalLinks) {
      const external = externalLinks.filter(l => l.type === 'external');
      if (external.length > 10) {
        risks.push({
          type: 'excessive_external_links',
          severity: 'low',
          description: `Document contains ${external.length} external links`,
          recommendation: 'Review external links for potential security risks',
        });
      }
    }

    // Check for potential macros (in Office documents)
    if (metadata.customProperties?.hasMacros) {
      risks.push({
        type: 'macros_present',
        severity: 'high',
        description: 'Document contains macros which may pose security risks',
        recommendation: 'Verify macro source and disable if untrusted',
      });
    }

    // Filter external links and map to proper format
    const externalLinksList = externalLinks
      ?.filter(l => l.type === 'external')
      .map((l, i) => ({
        id: `link-${i}`,
        text: l.url,
        url: l.url,
        type: 'external' as const,
      }));

    return {
      isEncrypted: metadata.encrypted || false,
      hasPassword: metadata.encrypted || false,
      externalLinks: externalLinksList,
      risks,
    };
  }

  private analyzeAccessibility(data: Record<string, unknown>): AccessibilityAnalysis {
    const issues: AccessibilityIssue[] = [];
    let score = 100;

    // Check for alt text on images
    const images = data.images as Array<{ altText?: string }> | undefined;
    if (images) {
      const missingAlt = images.filter(i => !i.altText).length;
      if (missingAlt > 0) {
        issues.push({
          type: 'missing_alt_text',
          wcagCriteria: '1.1.1',
          severity: 'serious',
          description: `${missingAlt} images are missing alt text`,
          recommendation: 'Add descriptive alt text to all images',
        });
        score -= missingAlt * 5;
      }
    }

    // Check for table headers
    const tables = data.tables as Array<{ headers?: string[] }> | undefined;
    if (tables) {
      const missingHeaders = tables.filter(t => !t.headers || t.headers.length === 0).length;
      if (missingHeaders > 0) {
        issues.push({
          type: 'missing_table_headers',
          wcagCriteria: '1.3.1',
          severity: 'moderate',
          description: `${missingHeaders} tables are missing headers`,
          recommendation: 'Add header rows to all data tables',
        });
        score -= missingHeaders * 3;
      }
    }

    // Check heading structure
    const text = data.text as { paragraphs?: Array<{ type: string; level?: number }> } | undefined;
    let headingStructure: 'correct' | 'incorrect' | 'missing' = 'missing';

    if (text?.paragraphs) {
      const headings = text.paragraphs.filter(p => p.type === 'heading');
      if (headings.length > 0) {
        headingStructure = 'correct';

        // Check for skipped heading levels
        const levels = headings.map(h => h.level || 1).sort();
        for (let i = 1; i < levels.length; i++) {
          if ((levels[i] || 0) - (levels[i - 1] || 0) > 1) {
            headingStructure = 'incorrect';
            issues.push({
              type: 'skipped_heading_level',
              wcagCriteria: '1.3.1',
              severity: 'minor',
              description: 'Document skips heading levels',
              recommendation: 'Use sequential heading levels (h1, h2, h3...)',
            });
            break;
          }
        }
      }
    }

    return {
      score: Math.max(0, score),
      isAccessible:
        issues.filter(i => i.severity === 'serious' || i.severity === 'critical').length === 0,
      issues,
      hasAltText: !images || images.every(i => i.altText),
      hasTableHeaders: !tables || tables.every(t => t.headers && t.headers.length > 0),
      hasDocumentTitle: !!data.metadata,
      hasLanguage: true, // Would need to check actual document
      headingStructure,
      readingOrder: 'unknown',
    };
  }

  private analyzeQuality(data: Record<string, unknown>): QualityAnalysis {
    const recommendations: QualityRecommendation[] = [];
    let overallScore = 100;

    // Analyze image quality
    const images = data.images as
      | Array<{ width: number; height: number; dpi?: number }>
      | undefined;
    let imageQualityScore = 100;
    let lowResCount = 0;
    let optimalResCount = 0;
    const totalImageSize = 0;

    if (images && images.length > 0) {
      for (const img of images) {
        const pixels = img.width * img.height;
        if (pixels < 100000) {
          // Less than ~316x316
          lowResCount++;
          imageQualityScore -= 5;
        } else {
          optimalResCount++;
        }
      }

      if (lowResCount > 0) {
        recommendations.push({
          area: 'images',
          issue: `${lowResCount} low-resolution images detected`,
          recommendation: 'Replace low-resolution images with higher quality versions',
          priority: 'medium',
        });
      }
    }

    // Analyze text quality
    const text = data.text as { statistics?: TextStatistics } | undefined;
    let textQualityScore = 100;

    if (text?.statistics) {
      // Check readability
      const readabilityScore = text.statistics.readabilityScores?.fleschReadingEase || 50;
      if (readabilityScore < 30) {
        textQualityScore -= 20;
        recommendations.push({
          area: 'text',
          issue: 'Text is very difficult to read',
          recommendation: 'Consider simplifying language and shortening sentences',
          priority: 'high',
        });
      }

      // Check average sentence length
      if (text.statistics.averageWordsPerSentence > 25) {
        textQualityScore -= 10;
        recommendations.push({
          area: 'text',
          issue: 'Sentences are too long on average',
          recommendation: 'Break long sentences into shorter ones',
          priority: 'medium',
        });
      }
    }

    overallScore = Math.round((imageQualityScore + textQualityScore) / 2);

    return {
      overallScore: Math.max(0, overallScore),
      imageQuality: {
        totalImages: images?.length || 0,
        lowResolutionCount: lowResCount,
        optimalResolutionCount: optimalResCount,
        averageDpi: 0,
        totalSize: totalImageSize,
        recommendations: [],
      },
      textQuality: {
        spellingErrors: 0, // Would need spell checker
        grammarIssues: 0, // Would need grammar checker
        readabilityScore: text?.statistics?.readabilityScores?.fleschReadingEase || 0,
        inconsistencies: [],
      },
      formattingQuality: {
        orphanLines: 0,
        widowLines: 0,
        overflowingText: 0,
        inconsistentSpacing: 0,
      },
      recommendations,
    };
  }

  private generateSummary(data: Record<string, unknown>): DocumentSummary {
    const text = data.text as { content?: string; statistics?: TextStatistics } | undefined;
    const content = text?.content || '';
    const stats = text?.statistics;

    // Extract first paragraph as abstract
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    const abstract = paragraphs[0]?.substring(0, 500) || '';

    // Extract key points (first sentence of each major section)
    const keyPoints: string[] = [];
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);

    for (let i = 0; i < Math.min(sentences.length, 5); i++) {
      const sentence = sentences[i]?.trim();
      if (sentence && sentence.length < 200) {
        keyPoints.push(sentence + '.');
      }
    }

    return {
      title: (data.metadata as DocumentMetadata)?.title || 'Untitled Document',
      abstract,
      keyPoints,
      wordCount: stats?.totalWords || 0,
      estimatedReadTime: stats?.readingTimeMinutes || 0,
    };
  }
}

export class DocumentComparator {
  async compare(
    source: { data: InputDataType; format: FileFormat },
    target: { data: InputDataType; format: FileFormat },
    options: ComparisonOptions = {}
  ): Promise<ComparisonResult> {
    const registry = initializeExtractors();
    const opts: ComparisonOptions = {
      compareText: true,
      compareFormatting: false,
      compareImages: false,
      compareTables: true,
      compareMetadata: true,
      ignoreWhitespace: true,
      ignoreCase: false,
      granularity: 'word',
      ...options,
    };

    // Extract content from both documents
    const sourceExtractor = registry.get(source.format);
    const targetExtractor = registry.get(target.format);

    if (!sourceExtractor || !targetExtractor) {
      throw new Error('Extractor not found for one or both formats');
    }

    const sourceResult = await sourceExtractor.execute(await toBuffer(source.data), {});
    const targetResult = await targetExtractor.execute(await toBuffer(target.data), {});

    const sourceData = sourceResult.data as Record<string, unknown>;
    const targetData = targetResult.data as Record<string, unknown>;

    const differences: DocumentDifference[] = [];
    const additions: DocumentChange[] = [];
    const deletions: DocumentChange[] = [];
    const modifications: DocumentChange[] = [];

    // Compare text
    if (opts.compareText) {
      const sourceText = (sourceData.text as { content?: string })?.content || '';
      const targetText = (targetData.text as { content?: string })?.content || '';

      const textDiff = this.compareText(sourceText, targetText, opts);
      differences.push(...textDiff.differences);
      additions.push(...textDiff.additions);
      deletions.push(...textDiff.deletions);
    }

    // Compare tables
    if (opts.compareTables) {
      const sourceTables = sourceData.tables as unknown[] | undefined;
      const targetTables = targetData.tables as unknown[] | undefined;

      if (sourceTables || targetTables) {
        const tableDiff = this.compareTables(sourceTables || [], targetTables || []);
        differences.push(...tableDiff.differences);
      }
    }

    // Compare metadata
    if (opts.compareMetadata) {
      const metaDiff = this.compareMetadata(sourceResult.metadata, targetResult.metadata);
      differences.push(...metaDiff);
    }

    // Calculate similarity score
    const sourceText = (sourceData.text as { content?: string })?.content || '';
    const targetText = (targetData.text as { content?: string })?.content || '';
    const similarityScore = this.calculateSimilarity(sourceText, targetText);

    // Generate summary
    const summary: ComparisonSummary = {
      totalChanges: differences.length,
      addedCharacters: additions.reduce((sum, a) => sum + (a.content?.length || 0), 0),
      deletedCharacters: deletions.reduce((sum, d) => sum + (d.content?.length || 0), 0),
      addedWords: additions.filter(a => a.type === 'text').length,
      deletedWords: deletions.filter(d => d.type === 'text').length,
      modifiedParagraphs: modifications.filter(m => m.type === 'text').length,
      addedImages: 0,
      deletedImages: 0,
      modifiedTables: differences.filter(d => d.type === 'modification').length,
    };

    return {
      areIdentical: differences.length === 0,
      similarityScore,
      differences,
      additions,
      deletions,
      modifications,
      summary,
    };
  }

  private compareText(
    source: string,
    target: string,
    opts: ComparisonOptions
  ): {
    differences: DocumentDifference[];
    additions: DocumentChange[];
    deletions: DocumentChange[];
  } {
    const differences: DocumentDifference[] = [];
    const additions: DocumentChange[] = [];
    const deletions: DocumentChange[] = [];

    // Normalize text based on options
    let sourceNorm = source;
    let targetNorm = target;

    if (opts.ignoreWhitespace) {
      sourceNorm = sourceNorm.replace(/\s+/g, ' ').trim();
      targetNorm = targetNorm.replace(/\s+/g, ' ').trim();
    }

    if (opts.ignoreCase) {
      sourceNorm = sourceNorm.toLowerCase();
      targetNorm = targetNorm.toLowerCase();
    }

    // Simple word-level comparison
    const sourceWords = sourceNorm.split(/\s+/);
    const targetWords = targetNorm.split(/\s+/);

    const sourceSet = new Set(sourceWords);
    const targetSet = new Set(targetWords);

    // Find additions (in target but not in source)
    for (const word of targetWords) {
      if (!sourceSet.has(word)) {
        additions.push({
          type: 'text',
          content: word,
          location: 'target',
        });
      }
    }

    // Find deletions (in source but not in target)
    for (const word of sourceWords) {
      if (!targetSet.has(word)) {
        deletions.push({
          type: 'text',
          content: word,
          location: 'source',
        });
      }
    }

    // Create difference entries
    for (const addition of additions) {
      differences.push({
        type: 'addition',
        location: { document: 'target' },
        content: { modified: addition.content },
      });
    }

    for (const deletion of deletions) {
      differences.push({
        type: 'deletion',
        location: { document: 'source' },
        content: { original: deletion.content },
      });
    }

    return { differences, additions, deletions };
  }

  private compareTables(
    source: unknown[],
    target: unknown[]
  ): { differences: DocumentDifference[] } {
    const differences: DocumentDifference[] = [];

    const sourceCount = source.length;
    const targetCount = target.length;

    if (sourceCount !== targetCount) {
      differences.push({
        type: 'modification',
        location: { document: 'target' },
        content: {
          original: `${sourceCount} tables`,
          modified: `${targetCount} tables`,
        },
      });
    }

    return { differences };
  }

  private compareMetadata(
    source: DocumentMetadata,
    target: DocumentMetadata
  ): DocumentDifference[] {
    const differences: DocumentDifference[] = [];

    const fieldsToCompare: (keyof DocumentMetadata)[] = [
      'title',
      'author',
      'subject',
      'pageCount',
      'wordCount',
    ];

    for (const field of fieldsToCompare) {
      if (source[field] !== target[field]) {
        differences.push({
          type: 'modification',
          location: { document: 'target', path: field },
          content: {
            original: String(source[field] || ''),
            modified: String(target[field] || ''),
          },
        });
      }
    }

    return differences;
  }

  private calculateSimilarity(source: string, target: string): number {
    if (source === target) return 1;
    if (!source || !target) return 0;

    const sourceWords = new Set(source.toLowerCase().split(/\s+/));
    const targetWords = new Set(target.toLowerCase().split(/\s+/));

    let intersection = 0;
    for (const word of sourceWords) {
      if (targetWords.has(word)) {
        intersection++;
      }
    }

    const union = sourceWords.size + targetWords.size - intersection;
    return union > 0 ? intersection / union : 0;
  }
}

export { DocumentAnalyzer as default };
