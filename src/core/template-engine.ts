/**
 * Template engine for document generation with variables, conditionals, and loops.
 */

import type { TemplateConfig } from '../core/types.js';

export class TemplateEngine {
  private delimiters: [string, string];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private helpers: Record<string, (...args: any[]) => any>;
  private partials: Record<string, string>;

  constructor(config?: Partial<TemplateConfig>) {
    this.delimiters = config?.delimiters || ['{{', '}}'];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.helpers = (config?.helpers || {}) as Record<string, (...args: any[]) => any>;
    this.partials = config?.partials || {};
    this.registerBuiltInHelpers();
  }

  private registerBuiltInHelpers(): void {
    this.helpers['formatDate'] = (date: Date | string, format?: string) => {
      const d = typeof date === 'string' ? new Date(date) : date;
      if (!format) return d.toLocaleDateString();

      const pad = (n: number) => n.toString().padStart(2, '0');
      return format
        .replace('YYYY', d.getFullYear().toString())
        .replace('MM', pad(d.getMonth() + 1))
        .replace('DD', pad(d.getDate()))
        .replace('HH', pad(d.getHours()))
        .replace('mm', pad(d.getMinutes()))
        .replace('ss', pad(d.getSeconds()));
    };

    this.helpers['formatNumber'] = (num: number, decimals = 2) => {
      return num.toFixed(decimals);
    };

    this.helpers['formatCurrency'] = (num: number, currency = 'USD', locale = 'en-US') => {
      return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(num);
    };

    this.helpers['formatPercent'] = (num: number, decimals = 2) => {
      return (num * 100).toFixed(decimals) + '%';
    };

    this.helpers['upper'] = (str: string) => String(str).toUpperCase();
    this.helpers['lower'] = (str: string) => String(str).toLowerCase();
    this.helpers['capitalize'] = (str: string) => {
      return String(str).charAt(0).toUpperCase() + String(str).slice(1).toLowerCase();
    };
    this.helpers['titleCase'] = (str: string) => {
      return String(str).replace(
        /\w\S*/g,
        txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
      );
    };
    this.helpers['truncate'] = (str: string, length = 50, suffix = '...') => {
      if (String(str).length <= length) return str;
      return String(str).substring(0, length) + suffix;
    };
    this.helpers['default'] = (value: unknown, defaultValue: unknown) => {
      return value !== null && value !== undefined && value !== '' ? value : defaultValue;
    };
    this.helpers['json'] = (obj: unknown, pretty = false) => {
      return pretty ? JSON.stringify(obj, null, 2) : JSON.stringify(obj);
    };
    this.helpers['join'] = (arr: unknown[], separator = ', ') => {
      return Array.isArray(arr) ? arr.join(separator) : String(arr);
    };
    this.helpers['length'] = (arr: unknown[]) => {
      return Array.isArray(arr) ? arr.length : 0;
    };

    this.helpers['add'] = (a: number, b: number) => Number(a) + Number(b);
    this.helpers['subtract'] = (a: number, b: number) => Number(a) - Number(b);
    this.helpers['multiply'] = (a: number, b: number) => Number(a) * Number(b);
    this.helpers['divide'] = (a: number, b: number) => Number(a) / Number(b);
    this.helpers['mod'] = (a: number, b: number) => Number(a) % Number(b);
    this.helpers['round'] = (num: number, decimals = 0) => {
      const factor = Math.pow(10, decimals);
      return Math.round(Number(num) * factor) / factor;
    };

    this.helpers['eq'] = (a: unknown, b: unknown) => a === b;
    this.helpers['ne'] = (a: unknown, b: unknown) => a !== b;
    this.helpers['gt'] = (a: unknown, b: unknown) => (a as number) > (b as number);
    this.helpers['gte'] = (a: unknown, b: unknown) => (a as number) >= (b as number);
    this.helpers['lt'] = (a: unknown, b: unknown) => (a as number) < (b as number);
    this.helpers['lte'] = (a: unknown, b: unknown) => (a as number) <= (b as number);
    this.helpers['and'] = (...args: unknown[]) => args.every(Boolean);
    this.helpers['or'] = (...args: unknown[]) => args.some(Boolean);
    this.helpers['not'] = (value: unknown) => !value;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registerHelper(name: string, fn: (...args: any[]) => any): void {
    this.helpers[name] = fn;
  }

  registerPartial(name: string, template: string): void {
    this.partials[name] = template;
  }

  render(template: string, data: Record<string, any>): string {
    let result = template;
    result = this.processPartials(result, data);
    result = this.processEachBlocks(result, data);
    result = this.processConditionals(result, data);
    result = this.processWithBlocks(result, data);
    result = this.processHelpers(result, data);
    result = this.processVariables(result, data);

    return result;
  }

  /**
   * Process partial inclusions
   */
  private processPartials(template: string, data: Record<string, any>): string {
    const [open, close] = this.delimiters;
    const partialRegex = new RegExp(
      `${this.escapeRegex(open)}>\\s*(\\w+)\\s*${this.escapeRegex(close)}`,
      'g'
    );

    return template.replace(partialRegex, (_, partialName) => {
      const partial = this.partials[partialName];
      if (!partial) {
        console.warn(`Partial "${partialName}" not found`);
        return '';
      }
      return this.render(partial, data);
    });
  }

  /**
   * Process #each blocks for iteration
   */
  private processEachBlocks(template: string, data: Record<string, any>): string {
    const [open, close] = this.delimiters;
    const eachRegex = new RegExp(
      `${this.escapeRegex(open)}#each\\s+([\\w.]+)\\s*${this.escapeRegex(close)}([\\s\\S]*?)${this.escapeRegex(open)}/each${this.escapeRegex(close)}`,
      'g'
    );

    return template.replace(eachRegex, (_, path, content) => {
      const items = this.resolvePath(path, data);
      if (!Array.isArray(items)) return '';

      return items
        .map((item, index) => {
          const itemData = {
            ...data,
            this: item,
            '@index': index,
            '@first': index === 0,
            '@last': index === items.length - 1,
            '@odd': index % 2 === 1,
            '@even': index % 2 === 0,
            ...item,
          };
          return this.render(content, itemData);
        })
        .join('');
    });
  }

  private processConditionals(template: string, data: Record<string, any>): string {
    const [open, close] = this.delimiters;

    // Process #if blocks with optional #else
    const ifRegex = new RegExp(
      `${this.escapeRegex(open)}#if\\s+([^}]+)\\s*${this.escapeRegex(close)}([\\s\\S]*?)(?:${this.escapeRegex(open)}else${this.escapeRegex(close)}([\\s\\S]*?))?${this.escapeRegex(open)}/if${this.escapeRegex(close)}`,
      'g'
    );

    template = template.replace(ifRegex, (_, condition, ifContent, elseContent = '') => {
      const result = this.evaluateCondition(condition.trim(), data);
      return result ? this.render(ifContent, data) : this.render(elseContent, data);
    });

    // Process #unless blocks
    const unlessRegex = new RegExp(
      `${this.escapeRegex(open)}#unless\\s+([^}]+)\\s*${this.escapeRegex(close)}([\\s\\S]*?)${this.escapeRegex(open)}/unless${this.escapeRegex(close)}`,
      'g'
    );

    template = template.replace(unlessRegex, (_, condition, content) => {
      const result = this.evaluateCondition(condition.trim(), data);
      return result ? '' : this.render(content, data);
    });

    return template;
  }

  private processWithBlocks(template: string, data: Record<string, any>): string {
    const [open, close] = this.delimiters;
    const withRegex = new RegExp(
      `${this.escapeRegex(open)}#with\\s+([\\w.]+)\\s*${this.escapeRegex(close)}([\\s\\S]*?)${this.escapeRegex(open)}/with${this.escapeRegex(close)}`,
      'g'
    );

    return template.replace(withRegex, (_, path, content) => {
      const contextData = this.resolvePath(path, data);
      if (!contextData || typeof contextData !== 'object') return '';

      return this.render(content, { ...data, ...contextData, this: contextData });
    });
  }

  private processHelpers(template: string, data: Record<string, any>): string {
    const [open, close] = this.delimiters;

    // Match helper calls like {{formatDate date "YYYY-MM-DD"}}
    const helperRegex = new RegExp(
      `${this.escapeRegex(open)}(\\w+)\\s+([^}]+)${this.escapeRegex(close)}`,
      'g'
    );

    return template.replace(helperRegex, (match, helperName, argsStr) => {
      const helper = this.helpers[helperName];
      if (!helper) {
        return match;
      }

      const args = this.parseHelperArgs(argsStr, data);
      try {
        const result = helper(...args);
        return result !== undefined ? String(result) : '';
      } catch (error) {
        console.warn(`Helper "${helperName}" error:`, error);
        return '';
      }
    });
  }

  private processVariables(template: string, data: Record<string, any>): string {
    const [open, close] = this.delimiters;
    const varRegex = new RegExp(
      `${this.escapeRegex(open)}\\s*([\\w.@]+)\\s*${this.escapeRegex(close)}`,
      'g'
    );

    return template.replace(varRegex, (_, path) => {
      const value = this.resolvePath(path, data);
      if (value === undefined || value === null) return '';
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value);
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private resolvePath(path: string, data: Record<string, any>): any {
    if (path === 'this') return data.this || data;

    const parts = path.split('.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let current: any = data;

    for (const part of parts) {
      if (current === undefined || current === null) return undefined;
      current = current[part];
    }

    return current;
  }

  private evaluateCondition(condition: string, data: Record<string, any>): boolean {
    const comparisonMatch = condition.match(/^(.+?)\s*(===|!==|==|!=|>=|<=|>|<)\s*(.+)$/);

    if (comparisonMatch && comparisonMatch[1] && comparisonMatch[2] && comparisonMatch[3]) {
      const left = this.resolveValue(comparisonMatch[1].trim(), data);
      const operator = comparisonMatch[2];
      const right = this.resolveValue(comparisonMatch[3].trim(), data);

      switch (operator) {
        case '===':
          return left === right;
        case '!==':
          return left !== right;
        case '==':
          return left == right;
        case '!=':
          return left != right;
        case '>':
          return left > right;
        case '<':
          return left < right;
        case '>=':
          return left >= right;
        case '<=':
          return left <= right;
        default:
          return false;
      }
    }

    // Simple truthy check
    const value = this.resolvePath(condition, data);
    return !!value && (Array.isArray(value) ? value.length > 0 : true);
  }

  /**
   * Resolve a value (could be a path or literal)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private resolveValue(expr: string, data: Record<string, any>): any {
    // Check for string literal
    const stringMatch = expr.match(/^["'](.*)["']$/);
    if (stringMatch) return stringMatch[1];

    // Check for number literal
    const numMatch = expr.match(/^-?\d+\.?\d*$/);
    if (numMatch) return parseFloat(expr);

    // Check for boolean
    if (expr === 'true') return true;
    if (expr === 'false') return false;
    if (expr === 'null') return null;
    if (expr === 'undefined') return undefined;

    // Resolve as path
    return this.resolvePath(expr, data);
  }

  /**
   * Parse helper arguments
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseHelperArgs(argsStr: string, data: Record<string, any>): any[] {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const args: any[] = [];
    const tokens = this.tokenizeArgs(argsStr);

    for (const token of tokens) {
      args.push(this.resolveValue(token, data));
    }

    return args;
  }

  /**
   * Tokenize argument string
   */
  private tokenizeArgs(argsStr: string): string[] {
    const tokens: string[] = [];
    let current = '';
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < argsStr.length; i++) {
      const char = argsStr[i];

      if ((char === '"' || char === "'") && argsStr[i - 1] !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
          current += char;
        } else if (char === stringChar) {
          inString = false;
          current += char;
        } else {
          current += char;
        }
      } else if (char === ' ' && !inString) {
        if (current.trim()) {
          tokens.push(current.trim());
        }
        current = '';
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      tokens.push(current.trim());
    }

    return tokens;
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

/**
 * Pre-built templates for common document types
 */
export const DocumentTemplates = {
  /** Simple invoice template */
  invoice: `
<div class="invoice">
  <header>
    <h1>INVOICE</h1>
    <div class="invoice-number">#{{invoiceNumber}}</div>
  </header>
  
  <div class="details">
    <div class="from">
      <h3>From</h3>
      <p>{{company.name}}</p>
      {{#each company.address}}<p>{{this}}</p>{{/each}}
    </div>
    
    <div class="to">
      <h3>Bill To</h3>
      <p>{{customer.name}}</p>
      {{#each customer.address}}<p>{{this}}</p>{{/each}}
    </div>
  </div>
  
  <table class="items">
    <thead>
      <tr>
        <th>Description</th>
        <th>Qty</th>
        <th>Price</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      {{#each items}}
      <tr>
        <td>{{description}}</td>
        <td>{{quantity}}</td>
        <td>{{formatCurrency unitPrice}}</td>
        <td>{{formatCurrency total}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>
  
  <div class="totals">
    <p>Subtotal: {{formatCurrency subtotal}}</p>
    {{#if tax}}<p>Tax: {{formatCurrency tax.amount}}</p>{{/if}}
    <p class="total">Total: {{formatCurrency total}}</p>
  </div>
</div>
`,

  /** Simple report template */
  report: `
<div class="report">
  <header>
    <h1>{{title}}</h1>
    {{#if subtitle}}<h2>{{subtitle}}</h2>{{/if}}
    <p class="date">Generated: {{formatDate date "YYYY-MM-DD"}}</p>
  </header>
  
  {{#each sections}}
  <section class="section-{{type}}">
    {{#if type === "heading"}}
      <h{{default level 2}}>{{content}}</h{{default level 2}}>
    {{/if}}
    {{#if type === "paragraph"}}
      <p>{{content}}</p>
    {{/if}}
    {{#if type === "table"}}
      <table>
        {{#each content}}
        <tr>
          {{#each this}}
          <td>{{this}}</td>
          {{/each}}
        </tr>
        {{/each}}
      </table>
    {{/if}}
  </section>
  {{/each}}
</div>
`,

  /** Letter template */
  letter: `
<div class="letter">
  <div class="header">
    <p class="date">{{formatDate date "YYYY-MM-DD"}}</p>
  </div>
  
  <div class="recipient">
    <p>{{recipient.name}}</p>
    {{#each recipient.address}}<p>{{this}}</p>{{/each}}
  </div>
  
  <div class="salutation">
    <p>Dear {{recipient.salutation}}{{default recipient.name "Sir/Madam"}},</p>
  </div>
  
  <div class="body">
    {{#each paragraphs}}
    <p>{{this}}</p>
    {{/each}}
  </div>
  
  <div class="closing">
    <p>{{default closing "Sincerely"}},</p>
    <p class="signature">{{sender.name}}</p>
    {{#if sender.title}}<p>{{sender.title}}</p>{{/if}}
  </div>
</div>
`,
};

export default TemplateEngine;
