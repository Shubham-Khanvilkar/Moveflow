import { Injectable, Logger } from '@nestjs/common';

export interface TemplateContext {
  [key: string]: string | number | boolean | Date | null | undefined;
}

@Injectable()
export class TemplateEngine {
  private readonly logger = new Logger(TemplateEngine.name);

  private readonly defaults: Record<string, string> = {
    appName: 'NAVIRA',
    supportEmail: 'support@navira.io',
    companyName: '',
    year: new Date().getFullYear().toString(),
  };

  render(template: string, context: TemplateContext): string {
    const data = { ...this.defaults, ...context };
    let result = template;

    result = result.replace(/\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (_, key, inner) => {
      const arr = data[key];
      if (!Array.isArray(arr)) return '';
      return arr.map(item => {
        if (typeof item === 'object' && item !== null) {
          return Object.entries(item).reduce(
            (s, [k, v]) => s.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v)),
            inner
          );
        }
        return inner.replace(/\{\{this\}\}/g, String(item));
      }).join('');
    });

    result = result.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/g, (_, key, ifBlock, elseBlock) => {
      const val = data[key];
      return val ? ifBlock : (elseBlock || '');
    });

    result = result.replace(/\{\{(\w+)\}\}/g, (_, key) => String(data[key] ?? ''));

    result = result.replace(/\{\{formatDate\s+(\w+)\}\}/g, (_, key) => {
      const val = data[key];
      return val instanceof Date ? val.toLocaleDateString() : String(val ?? '');
    });

    result = result.replace(/\{\{formatCurrency\s+(\w+)\}\}/g, (_, key) => {
      const val = Number(data[key] ?? 0);
      return `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    });

    return result;
  }

  async renderWithCompany(template: string, companyId: string, context: TemplateContext): Promise<string> {
    return this.render(template, { ...context, companyId });
  }
}
