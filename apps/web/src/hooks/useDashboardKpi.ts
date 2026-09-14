import { useState, useEffect } from 'react';
import { API_URL } from '../lib/config';

export function useDashboardKpi(token: string) {
  const [kpi, setKpi] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/api/platform/dashboard/kpi`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => {
        setKpi(d.data || d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token]);

  return { kpi, loading };
}
