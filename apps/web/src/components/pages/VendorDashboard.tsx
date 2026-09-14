'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { apiRequest, ApiError } from '../../lib/api-client';

interface FleetData {
  vendor: { id: string; name: string; status: string };
  vehicles: any[];
  drivers: any[];
  kpis: {
    vehicles: { total: number; available: number };
    drivers: { total: number; available: number };
    activeTrips: number;
  };
  invoices: {
    total: number;
    pendingAmount: number;
    paidAmount: number;
    recent: { period?: string; tripCount?: number; amount?: number; status?: string }[];
  };
}

export default function VendorDashboard({ token, user }: { token: string; user: any }) {
  const [fleet, setFleet] = useState<FleetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<FleetData>('/vendor/fleet');
      setFleet(data);
    } catch (err: any) {
      const message = err instanceof ApiError ? err.message : 'Failed to load fleet';
      setError(message);
      setFleet(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const d = fleet || {};
  const kpis = d.kpis || {};
  const vehicles = d.vehicles || [];
  const drivers = d.drivers || [];
  const invoices = d.invoices || {};

  const fmt = (n: number | undefined) => {
    if (n == null) return 0;
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>🤝 {d.vendor?.name || 'Vendor'} Operations Dashboard</h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>You lead the fleet assigned to your vendor — {user?.name || 'Vendor Admin'}</p>
        </div>
      </div>

      {error && (
        <div style={{ padding: 24, textAlign: 'center', background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 20 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#dc2626', marginBottom: 8 }}>Failed to load fleet</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>{error}</div>
          <button onClick={load} style={{ padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Try Again
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading your fleet...</div>
      ) : vehicles.length === 0 && drivers.length === 0 && !error ? (
        <div style={{ padding: 60, textAlign: 'center', background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🚛</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#374151' }}>No fleet assigned yet</div>
          <p style={{ fontSize: 13, color: '#6b7280', maxWidth: 420, margin: '8px auto 0' }}>
            Your Transport Admin assigns a set of vehicles (and their drivers) to your vendor directly — no invites needed. Once assigned, your fleet appears here.
          </p>
        </div>
      ) : (
        <>
          {/* Fleet KPIs — real counts from the assigned fleet */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
            {[
              { label: 'My Drivers', value: kpis.drivers?.total ?? 0, color: '#ea580c', icon: '🧑‍✈️', sub: `${kpis.drivers?.available ?? 0} active` },
              { label: 'My Vehicles', value: kpis.vehicles?.total ?? 0, color: '#2563eb', icon: '🚗', sub: `${kpis.vehicles?.available ?? 0} available` },
              { label: 'Active Trips', value: kpis.activeTrips ?? 0, color: '#10b981', icon: '🚐', sub: 'Running now' },
              { label: 'Pending Invoices', value: invoices.pendingAmount != null ? fmt(invoices.pendingAmount) : 0, color: '#8b5cf6', icon: '💰', sub: `${invoices.total ?? 0} invoices` },
            ].map((kpi, i) => (
              <div key={i} style={{ background: 'white', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderLeft: `4px solid ${kpi.color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: '#6b7280' }}>{kpi.label}</span>
                  <span style={{ fontSize: 16 }}>{kpi.icon}</span>
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
                <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{kpi.sub}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            {/* My Vehicles — the vendor's team vehicles */}
            <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>🚗 My Vehicles ({vehicles.length})</h3>
              {vehicles.length === 0 ? (
                <div style={{ fontSize: 13, color: '#6b7280' }}>No vehicles assigned yet.</div>
              ) : (
                vehicles.map((v: any, i: number) => (
                  <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{v.registrationNo || v.id}</div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>{v.vehicleType || v.type || 'Vehicle'} · {v.capacity ? `${v.capacity} seats` : ''}</div>
                    </div>
                    <span style={{ padding: '3px 8px', borderRadius: 12, fontSize: 10, fontWeight: 600,
                      background: v.status === 'AVAILABLE' ? '#dcfce7' : v.status === 'ON_TRIP' || v.status === 'IN_TRANSIT' ? '#dbeafe' : '#fef3c7',
                      color: v.status === 'AVAILABLE' ? '#16a34a' : v.status === 'ON_TRIP' || v.status === 'IN_TRANSIT' ? '#2563eb' : '#d97706',
                    }}>{v.status || 'AVAILABLE'}</span>
                  </div>
                ))
              )}
            </div>

            {/* Driver Team — derived from the assigned fleet, no invites */}
            <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>🧑‍✈️ Driver Team ({drivers.length})</h3>
              {drivers.length === 0 ? (
                <div style={{ fontSize: 13, color: '#6b7280' }}>Drivers attached to your vehicles appear here — no invites required.</div>
              ) : (
                drivers.map((dr: any, i: number) => (
                  <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{dr.name || dr.driverName || 'Driver'}</div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>{dr.phone || dr.mobileNumber || ''}</div>
                    </div>
                    <span style={{ padding: '3px 8px', borderRadius: 12, fontSize: 10, fontWeight: 600,
                      background: dr.status === 'AVAILABLE' ? '#dcfce7' : dr.status === 'ON_TRIP' ? '#dbeafe' : '#f3f4f6',
                      color: dr.status === 'AVAILABLE' ? '#16a34a' : dr.status === 'ON_TRIP' ? '#2563eb' : '#6b7280',
                    }}>{dr.status || 'ACTIVE'}</span>
                  </div>
                ))
              )}
            </div>
          </div>
          {/* Invoice Summary — real billing for this vendor */}
          <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>💰 Invoice Summary</h3>
            {(invoices.recent || []).length === 0 ? (
              <div style={{ fontSize: 13, color: '#6b7280' }}>No invoices yet. Invoices generated from your trips appear here.</div>
            ) : (
              (invoices.recent || []).map((inv: any, i: number) => (
                <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{inv.period || 'Period'}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>{inv.tripCount ?? 0} trips · {fmt(inv.amount)}</div>
                  </div>
                  <span style={{ padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                    background: inv.status === 'PAID' ? '#dcfce7' : inv.status === 'PENDING' ? '#fef3c7' : inv.status === 'DRAFT' ? '#f3f4f6' : '#fee2e2',
                    color: inv.status === 'PAID' ? '#16a34a' : inv.status === 'PENDING' ? '#d97706' : inv.status === 'DRAFT' ? '#6b7280' : '#dc2626',
                  }}>{inv.status || 'DRAFT'}</span>
                </div>
              ))
            )}
            {(invoices.pendingAmount != null && invoices.pendingAmount > 0) && (
              <div style={{ marginTop: 12, padding: '12px', background: '#f0fdf4', borderRadius: 8, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Total Pending</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>{fmt(invoices.pendingAmount)}</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
