import { useState, useEffect, useCallback } from 'react';
import { offlineManager } from '../services/offline-manager';

interface UseOfflineReturn {
  isOnline: boolean;
  pendingCount: number;
  queueAction: (action: { type: string; endpoint: string; method: string; body?: any }) => Promise<void>;
  getCachedData: (key: string) => Promise<any | null>;
  cacheData: (key: string, data: any, ttlMs?: number) => Promise<void>;
}

export function useOffline(): UseOfflineReturn {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    offlineManager.initialize();

    const unsubscribe = offlineManager.onStatusChange((online) => {
      setIsOnline(online);
      setPendingCount(offlineManager.getPendingCount());
    });

    setPendingCount(offlineManager.getPendingCount());

    return unsubscribe;
  }, []);

  const queueAction = useCallback(async (action: { type: string; endpoint: string; method: string; body?: any }) => {
    await offlineManager.queueAction(action);
    setPendingCount(offlineManager.getPendingCount());
  }, []);

  const getCachedData = useCallback(async (key: string) => {
    return offlineManager.getCachedData(key);
  }, []);

  const cacheData = useCallback(async (key: string, data: any, ttlMs?: number) => {
    await offlineManager.cacheData(key, data, ttlMs);
  }, []);

  return { isOnline, pendingCount, queueAction, getCachedData, cacheData };
}
