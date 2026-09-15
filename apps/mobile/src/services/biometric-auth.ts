import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

class BiometricAuthService {
  private available = false;
  private biometricType: string | null = null;

  async initialize() {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        this.available = false;
        return;
      }

      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        this.available = false;
        return;
      }

      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        this.biometricType = Platform.OS === 'ios' ? 'Face ID' : 'Face Recognition';
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        this.biometricType = Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
      } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        this.biometricType = 'Iris';
      }

      this.available = true;
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

  async authenticate(prompt: string = 'Authenticate to continue'): Promise<boolean> {
    if (!this.available) return false;

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: prompt,
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
        fallbackLabel: 'Use Passcode',
      });
      return result.success;
    } catch {
      return false;
    }
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
