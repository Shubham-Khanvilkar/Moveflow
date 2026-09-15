import { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../services/api';

interface UseApiOptions<T> {
  immediate?: boolean;
  initialData?: T;
}

interface UseApiReturn<T> {
  data: T | undefined;
  loading: boolean;
  error: string | null;
  execute: (...args: any[]) => Promise<T | undefined>;
  reset: () => void;
}

export function useApi<T = any>(
  endpoint: string,
  options: UseApiOptions<T> = {}
): UseApiReturn<T> {
  const { immediate = false, initialData } = options;
  const [data, setData] = useState<T | undefined>(initialData);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (...args: any[]): Promise<T | undefined> => {
      try {
        setLoading(true);
        setError(null);
        const result = await apiRequest<T>(endpoint, ...args);
        setData(result);
        return result;
      } catch (err: any) {
        setError(err.message || 'An error occurred');
        return undefined;
      } finally {
        setLoading(false);
      }
    },
    [endpoint]
  );

  const reset = useCallback(() => {
    setData(initialData);
    setLoading(false);
    setError(null);
  }, [initialData]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate]);

  return { data, loading, error, execute, reset };
}
