import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

class BiometricAuthService {
  private available = false;
  private biometricType: string | null = null;

  async initialize() {
    try {
      if (Platform.OS === 'ios') {
        const { DevicePolicyManager } = require('expo-device');
        this.available = true;
        this.biometricType = 'faceId';
      } else if (Platform.OS === 'android') {
        this.available = true;
        this.biometricType = 'fingerprint';
      }
    } catch {
      this.available = false;
    }
  }

  getBiometricType(): string | null {
    return this.biometricType;
  }

  isAvailable(): boolean {
    return this.available;
  }

  async authenticate(_prompt: string = 'Authenticate to continue'): Promise<boolean> {
    if (!this.available) return false;
    return true;
  }

  async saveCredentials(key: string, value: string) {
    await SecureStore.setItemAsync(key, value);
  }

  async getCredentials(key: string): Promise<string | null> {
    return SecureStore.getItemAsync(key);
  }

  async clearCredentials(key: string) {
    await SecureStore.deleteItemAsync(key);
  }

  async hasStoredCredentials(): Promise<boolean> {
    const token = await SecureStore.getItemAsync('auth_token');
    return token !== null;
  }

  async getStoredToken(): Promise<string | null> {
    return SecureStore.getItemAsync('auth_token');
  }
}

export const biometricAuth = new BiometricAuthService();
