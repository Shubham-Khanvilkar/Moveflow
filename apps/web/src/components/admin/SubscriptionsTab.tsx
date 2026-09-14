'use client';
import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../../lib/config';

interface Subscription {
  id: string;
  companyId: string;
  planId: string;
  status: string;
  billingCycle: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEndsAt?: string;
  suspensionReason?: string;
  createdAt: string;
  plan?: { name: string; displayName: string; monthlyPrice: number; maxEmployees: number; maxDrivers: number; maxVehicles: number; };
  company?: { name: string; code: string; };
}

export default function SubscriptionsTab({ token }: { token: string }) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('ALL');

  const fetchSubscriptions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all companies, then their subscriptions
      const compRes = await fetch(`${API_URL}/api/platform/companies?limit=100`, { headers: { Authorization: `Bearer ${token}` } });
      if (!compRes.ok) throw new Error('Failed to load companies');
      const compData = await compRes.json();
      const companies = compData.data?.data || compData.data || [];

      const subs: Subscription[] = [];
      for (const c of companies) {
        try {
          const subRes = await fetch(`${API_URL}/api/billing/subscription/${c.id}`, { headers: { Authorization: `Bearer ${token}` } });
          if (subRes.ok) {
            const subData = await subRes.json();
            if (subData.data || subData.subscription) {
              subs.push({ ...(subData.data || subData.subscription), company: { name: c.name, code: c.code } });
            }
          }
        } catch (e) { /* skip */ }
      }
      setSubscriptions(subs);
    } catch (e: any) {
      setError(e.message || 'Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchSubscriptions(); }, [fetchSubscriptions]);

  const filtered = filter === 'ALL' ? subscriptions : subscriptions.filter(s => s.status === filter);

  const statusColor = (s: string) => {
    if (s === 'ACTIVE') return { bg: '#dcfce7', fg: '#16a34a' };
    if (s === 'TRIAL') return { bg: '#dbeafe', fg: '#2563eb' };
    if (s === 'SUSPENDED') return { bg: '#fee2e2', fg: '#dc2626' };
    if (s === 'CANCELLED') return { bg: '#f3f4f6', fg: '#6b7280' };
    return { bg: '#fef3c7', fg: '#d97706' };
  };

  const mrr = subscriptions.filter(s => s.status === 'ACTIVE' && s.plan).reduce((sum, s) => sum + (s.plan?.monthlyPrice || 0), 0);
  const activeCount = subscriptions.filter(s => s.status === 'ACTIVE').length;
  const trialCount = subscriptions.filter(s => s.status === 'TRIAL').length;
  const suspendedCount = subscriptions.filter(s => s.status === 'SUSPENDED').length;

  return (
    <div>
      <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px' }}>Subscription Management</h3>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div style={{ background: 'white', borderRadius: 12, padding: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Monthly Revenue</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#10b981' }}>₹{mrr.toLocaleString()}</div>
        </div>
        <div style={{ background: 'white', borderRadius: 12, padding: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Active Subscriptions</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#3b82f6' }}>{activeCount}</div>
        </div>
        <div style={{ background: 'white', borderRadius: 12, padding: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>On Trial</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#f59e0b' }}>{trialCount}</div>
        </div>
        <div style={{ background: 'white', borderRadius: 12, padding: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Suspended</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#ef4444' }}>{suspendedCount}</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {['ALL', 'ACTIVE', 'TRIAL', 'SUSPENDED', 'CANCELLED'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: filter === f ? '#6366f1' : 'white', color: filter === f ? 'white' : '#374151', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Company</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Plan</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Billing</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Price/Mo</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Trial Ends</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Limits</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>No subscriptions found</td></tr>
            )}
            {filtered.map(sub => {
              const sc = statusColor(sub.status);
              return (
                <tr key={sub.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>{sub.company?.name || sub.companyId}</td>
                  <td style={{ padding: '12px 16px' }}>{sub.plan?.displayName || sub.planId}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.fg }}>{sub.status}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>{sub.billingCycle}</td>
                  <td style={{ padding: '12px 16px' }}>₹{(sub.plan?.monthlyPrice || 0).toLocaleString()}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: '#6b7280' }}>
                    {sub.trialEndsAt ? new Date(sub.trialEndsAt).toLocaleDateString() : '-'}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: '#6b7280' }}>
                    {sub.plan ? `${sub.plan.maxEmployees} emp / ${sub.plan.maxDrivers} drv / ${sub.plan.maxVehicles} veh` : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 8 }}>
          <div style={{ width: 20, height: 20, border: '3px solid #e5e7eb', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ fontSize: 13, color: '#6b7280' }}>Loading subscriptions...</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      )}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', marginTop: 12 }}>
          <span style={{ fontSize: 13, color: '#991b1b' }}>{error}</span>
        </div>
      )}
    </div>
  );
}
