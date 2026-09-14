export interface ReceiptData {
  provider?: string;
  receiptNumber?: string;
  date?: string;
  pickup?: string;
  drop?: string;
  fare?: number;
  tax?: number;
  toll?: number;
  parking?: number;
  total?: number;
}

export interface ReceiptParser {
  parseReceipt(file: Buffer, mimeType: string): Promise<ReceiptData>;
}

export class StubReceiptParser implements ReceiptParser {
  async parseReceipt(file: Buffer, mimeType: string): Promise<ReceiptData> {
    throw new ServiceUnavailableException('Receipt parser not configured');
  }
}

import { ServiceUnavailableException } from '@nestjs/common';
