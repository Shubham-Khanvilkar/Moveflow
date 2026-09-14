import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Alert } from 'react-native';

interface PendingAction {
  id: string;
  type: string;
  endpoint: string;
  method: string;
  body?: any;
  timestamp: number;
  retries: number;
}

class OfflineManager {
  private isOnline = true;
  private pendingActions: PendingAction[] = [];
  private listeners: Array<(online: boolean) => void> = [];
  private maxRetries = 3;

  async initialize() {
    const state = await NetInfo.fetch();
    this.isOnline = state.isConnected ?? true;

    const stored = await AsyncStorage.getItem('@pending_actions');
    if (stored) this.pendingActions = JSON.parse(stored);

    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? true;
      this.listeners.forEach(l => l(this.isOnline));
      if (wasOffline && this.isOnline) {
        this.syncPendingActions();
      }
    });
  }

  getOnline(): boolean {
    return this.isOnline;
  }

  onStatusChange(listener: (online: boolean) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  async queueAction(action: Omit<PendingAction, 'id' | 'timestamp' | 'retries'>) {
    const pending: PendingAction = {
      ...action,
      id: `pending_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      timestamp: Date.now(),
      retries: 0,
    };
    this.pendingActions.push(pending);
    await this.savePending();
  }

  async syncPendingActions() {
    if (this.pendingActions.length === 0) return;

    const toSync = [...this.pendingActions];
    const succeeded: string[] = [];

    for (const action of toSync) {
      try {
        const response = await fetch(action.endpoint, {
          method: action.method,
          headers: { 'Content-Type': 'application/json' },
          body: action.body ? JSON.stringify(action.body) : undefined,
        });

        if (response.ok) {
          succeeded.push(action.id);
        } else {
          action.retries++;
          if (action.retries >= this.maxRetries) {
            succeeded.push(action.id);
          }
        }
      } catch {
        action.retries++;
        if (action.retries >= this.maxRetries) {
          succeeded.push(action.id);
        }
      }
    }

    this.pendingActions = this.pendingActions.filter(a => !succeeded.includes(a.id));
    await this.savePending();
  }

  async cacheData(key: string, data: any, ttlMs: number = 3600000) {
    const entry = { data, expiresAt: Date.now() + ttlMs };
    await AsyncStorage.setItem(`@cache_${key}`, JSON.stringify(entry));
  }

  async getCachedData(key: string): Promise<any | null> {
    const raw = await AsyncStorage.getItem(`@cache_${key}`);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (Date.now() > entry.expiresAt) {
      await AsyncStorage.removeItem(`@cache_${key}`);
      return null;
    }
    return entry.data;
  }

  private async savePending() {
    await AsyncStorage.setItem('@pending_actions', JSON.stringify(this.pendingActions));
  }

  getPendingCount(): number {
    return this.pendingActions.length;
  }
}

export const offlineManager = new OfflineManager();
