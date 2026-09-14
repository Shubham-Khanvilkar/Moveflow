"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { apiRequest, ApiError } from "../lib/api-client";

export { apiRequest as apiFetch, ApiError };

export function useApi<T = any>(
  path: string | null,
  deps: any[] = []
): { data: T | null; loading: boolean; error: string | null; refetch: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(() => {
    if (!path) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    apiRequest(path)
      .then((d) => {
        if (mountedRef.current) {
          setData(d);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mountedRef.current) {
          setError(err?.message || "Failed to load data");
          setLoading(false);
        }
      });
  }, [path]);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchData, ...deps]);

  return { data, loading, error, refetch: fetchData };
}

export function useMutation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async (
      path: string,
      method: string = "POST",
      body?: any
    ): Promise<any> => {
      setLoading(true);
      setError(null);
      try {
        const result = await apiRequest(path, {
          method,
          body: body ? JSON.stringify(body) : undefined,
        });
        setLoading(false);
        return result;
      } catch (err: any) {
        const msg = err?.message || "Operation failed";
        setError(msg);
        setLoading(false);
        throw new Error(msg);
      }
    },
    []
  );

  return { mutate, loading, error };
}
