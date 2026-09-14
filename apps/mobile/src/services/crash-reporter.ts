import * as Application from 'expo-application';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

interface CrashReport {
  timestamp: string;
  error: string;
  stack?: string;
  platform: string;
  appVersion: string;
  deviceModel: string;
  osVersion: string;
}

class CrashReporter {
  private queue: CrashReport[] = [];
  private endpoint: string = '';
  private apiKey: string = '';

  configure(endpoint: string, apiKey: string) {
    this.endpoint = endpoint;
    this.apiKey = apiKey;
  }

  getDevice(): { platform: string; appVersion: string; deviceModel: string; osVersion: string } {
    return {
      platform: Platform.OS,
      appVersion: Constants.expoConfig?.version || '1.0.0',
      deviceModel: Device.modelName || 'Unknown',
      osVersion: Constants.expoConfig?.sdkVersion || 'Unknown',
    };
  }

  async captureError(error: Error, extra?: Record<string, any>) {
    const report: CrashReport = {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
      ...this.getDevice(),
      ...extra,
    };

    this.queue.push(report);
    await this.flush();
  }

  async captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
    const report: CrashReport = {
      timestamp: new Date().toISOString(),
      error: `[${level.toUpperCase()}] ${message}`,
      ...this.getDevice(),
    };

    this.queue.push(report);
    if (level === 'error') await this.flush();
  }

  private async flush() {
    if (!this.endpoint || this.queue.length === 0) return;

    const toSend = [...this.queue];
    this.queue = [];

    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
        body: JSON.stringify({ crashes: toSend }),
      });
    } catch {
      this.queue.unshift(...toSend);
    }
  }

  getQueuedCount(): number {
    return this.queue.length;
  }
}

const { Platform } = require('react-native');
export const crashReporter = new CrashReporter();
