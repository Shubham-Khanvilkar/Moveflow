import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SmsMessage {
  to: string;
  body: string;
  from?: string;
}

export interface SmsResult {
  messageId: string;
  status: string;
}

export interface SmsProvider {
  send(message: SmsMessage): Promise<SmsResult>;
  sendBulk(messages: SmsMessage[]): Promise<SmsResult[]>;
}

@Injectable()
export class TwilioSmsProvider implements SmsProvider {
  private readonly logger = new Logger(TwilioSmsProvider.name);
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor(private config: ConfigService) {
    this.accountSid = this.config.get('TWILIO_ACCOUNT_SID', '');
    this.authToken = this.config.get('TWILIO_AUTH_TOKEN', '');
    this.fromNumber = this.config.get('TWILIO_FROM_NUMBER', '');
  }

  async send(message: SmsMessage): Promise<SmsResult> {
    if (!this.accountSid) {
      this.logger.warn('Twilio not configured, SMS skipped');
      return { messageId: `sms_${Date.now()}`, status: 'SIMULATED' };
    }

    try {
      const params = new URLSearchParams({
        To: message.to,
        Body: message.body,
        From: message.from || this.fromNumber,
      });

      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const data = await res.json();
      return { messageId: data.sid || '', status: data.status || 'queued' };
    } catch (error: any) {
      this.logger.error(`SMS failed: ${error.message}`);
      return { messageId: '', status: 'failed' };
    }
  }

  async sendBulk(messages: SmsMessage[]): Promise<SmsResult[]> {
    const results: SmsResult[] = [];
    for (const msg of messages) {
      results.push(await this.send(msg));
    }
    return results;
  }
}
