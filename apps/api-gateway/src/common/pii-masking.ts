import { Injectable } from '@nestjs/common';

@Injectable()
export class PIIMaskingService {
  private readonly emailRegex = /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  private readonly phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  private readonly aadhaarRegex = /\b\d{4}\s?\d{4}\s?\d{4}\b/g;
  private readonly panRegex = /\b[A-Z]{5}\d{4}[A-Z]\b/g;

  maskEmail(email: string): string {
    if (!email || !email.includes('@')) return email;
    const [local, domain] = email.split('@');
    if (local.length <= 2) return `${local[0]}***@${domain}`;
    return `${local.slice(0, 2)}***@${domain}`;
  }

  maskPhone(phone: string): string {
    if (!phone || phone.length < 6) return phone;
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 6) return phone;
    return phone.replace(/(\d{3})\d*(\d{3})/, '$1****$2');
  }

  maskAadhaar(aadhaar: string): string {
    const cleaned = aadhaar.replace(/\D/g, '');
    if (cleaned.length !== 12) return aadhaar;
    return `XXXX XXXX ${cleaned.slice(-4)}`;
  }

  maskPAN(pan: string): string {
    if (pan.length !== 10) return pan;
    return `${pan.slice(0, 3)}XXXX${pan.slice(-2)}`;
  }

  maskName(name: string): string {
    if (!name || name.length <= 2) return name;
    return `${name[0]}${'*'.repeat(name.length - 2)}${name[name.length - 1]}`;
  }

  maskText(text: string): string {
    let result = text;
    result = result.replace(this.emailRegex, (match) => this.maskEmail(match));
    result = result.replace(this.phoneRegex, (match) => this.maskPhone(match));
    result = result.replace(this.aadhaarRegex, (match) => this.maskAadhaar(match));
    result = result.replace(this.panRegex, (match) => this.maskPAN(match));
    return result;
  }

  maskObject<T extends Record<string, any>>(obj: T, fields: (keyof T)[]): T {
    const masked = { ...obj };
    for (const field of fields) {
      if (typeof masked[field] === 'string') {
        if (String(field).toLowerCase().includes('email')) {
          (masked as any)[field] = this.maskEmail(masked[field] as string);
        } else if (String(field).toLowerCase().includes('phone')) {
          (masked as any)[field] = this.maskPhone(masked[field] as string);
        } else if (String(field).toLowerCase().includes('aadhaar')) {
          (masked as any)[field] = this.maskAadhaar(masked[field] as string);
        } else if (String(field).toLowerCase().includes('pan')) {
          (masked as any)[field] = this.maskPAN(masked[field] as string);
        } else if (String(field).toLowerCase().includes('name')) {
          (masked as any)[field] = this.maskName(masked[field] as string);
        }
      }
    }
    return masked;
  }
}

export const piiMasking = new PIIMaskingService();
