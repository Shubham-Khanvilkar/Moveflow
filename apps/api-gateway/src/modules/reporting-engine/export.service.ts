import { Injectable, Logger } from '@nestjs/common';
import * as XLSX from 'xlsx';

export interface ExportOptions {
  format: 'csv' | 'xlsx' | 'json';
  filename?: string;
  sheetName?: string;
}

export interface ExportResult {
  buffer: Buffer;
  mimeType: string;
  extension: string;
  filename: string;
}

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  /**
   * Export data to CSV, XLSX, or JSON format.
   */
  exportData(data: any[], options: ExportOptions): ExportResult {
    const filename = options.filename || `report-${Date.now()}`;
    const format = options.format || 'csv';

    if (!data || data.length === 0) {
      return this.exportEmpty(format, filename);
    }

    switch (format) {
      case 'xlsx':
        return this.exportXlsx(data, filename, options.sheetName);
      case 'csv':
        return this.exportCsv(data, filename);
      case 'json':
        return this.exportJson(data, filename);
      default:
        return this.exportCsv(data, filename);
    }
  }

  /**
   * Export to Excel (XLSX) format.
   */
  private exportXlsx(data: any[], filename: string, sheetName?: string): ExportResult {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(this.flattenForExport(data));

    // Auto-size columns
    const colWidths = this.calculateColumnWidths(data);
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, sheetName || 'Report');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return {
      buffer: Buffer.from(buffer),
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      extension: '.xlsx',
      filename: `${filename}.xlsx`,
    };
  }

  /**
   * Export to CSV format.
   */
  private exportCsv(data: any[], filename: string): ExportResult {
    const flatData = this.flattenForExport(data);
    const headers = Object.keys(flatData[0] || {});

    const csvRows = [
      headers.join(','),
      ...flatData.map(row =>
        headers.map(h => {
          const val = row[h];
          if (val === null || val === undefined) return '';
          const str = String(val);
          // Escape quotes and wrap in quotes if contains comma, newline, or quotes
          if (str.includes(',') || str.includes('\n') || str.includes('"')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        }).join(',')
      ),
    ];

    const csvContent = csvRows.join('\n');
    const buffer = Buffer.from(csvContent, 'utf-8');

    return {
      buffer,
      mimeType: 'text/csv',
      extension: '.csv',
      filename: `${filename}.csv`,
    };
  }

  /**
   * Export to JSON format.
   */
  private exportJson(data: any[], filename: string): ExportResult {
    const jsonContent = JSON.stringify(data, null, 2);
    const buffer = Buffer.from(jsonContent, 'utf-8');

    return {
      buffer,
      mimeType: 'application/json',
      extension: '.json',
      filename: `${filename}.json`,
    };
  }

  /**
   * Handle empty data export.
   */
  private exportEmpty(format: string, filename: string): ExportResult {
    const emptyData = [{ message: 'No data available for this report' }];
    return this.exportData(emptyData, { format: format as any, filename });
  }

  /**
   * Flatten nested objects for tabular export.
   */
  private flattenForExport(data: any[]): Record<string, any>[] {
    return data.map(item => this.flattenObject(item));
  }

  /**
   * Deep flatten an object with dot notation.
   */
  private flattenObject(obj: Record<string, any>, prefix = ''): Record<string, any> {
    const result: Record<string, any> = {};

    for (const key of Object.keys(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      const val = obj[key];

      if (val === null || val === undefined) {
        result[fullKey] = '';
      } else if (Array.isArray(val)) {
        result[fullKey] = JSON.stringify(val);
      } else if (typeof val === 'object' && val.constructor === Object) {
        Object.assign(result, this.flattenObject(val, fullKey));
      } else if (val instanceof Date) {
        result[fullKey] = val.toISOString();
      } else {
        result[fullKey] = val;
      }
    }

    return result;
  }

  /**
   * Calculate column widths for XLSX export.
   */
  private calculateColumnWidths(data: any[]): { wch: number }[] {
    if (data.length === 0) return [];

    const flatData = this.flattenForExport(data);
    const headers = Object.keys(flatData[0] || {});

    return headers.map(h => {
      const maxLen = Math.max(
        h.length,
        ...flatData.map(row => String(row[h] || '').length),
      );
      return { wch: Math.min(maxLen + 2, 50) };
    });
  }
}
