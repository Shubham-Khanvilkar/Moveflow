'use client';
import React, { useState, useEffect } from 'react';
import Spinner from '../Spinner';
import { API_URL } from '../../lib/config';

export default function FinanceDashboard({ token, user, onNavigate }: { token: string; user: any; onNavigate?: (id: string) => void }) {
  const [kpi, setKpi] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [reconciliation, setReconciliation] = useState<any[]>([]);
  const [rateCards, setRateCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API_URL}/api/dashboard/kpi`, { headers }).then(r => r.json()).catch(() => ({})),
      fetch(`${API_URL}/api/billing/vendor-invoices/summary`, { headers }).then(r => r.json()).catch(() => ({})),
      fetch(`${API_URL}/api/finance/invoice-reconciliation`, { headers }).then(r => r.json()).catch(() => ({ data: [] })),
      fetch(`${API_URL}/api/billing/rate-cards/active`, { headers }).then(r => r.json()).catch(() => ({ data: [] })),
    ]).then(([k, inv, rec, rc]) => {
      setKpi(k.data || k);
      setInvoices(inv.data?.invoices || inv.invoices || inv.data || []);
      setReconciliation(rec.data || rec.reconciliations || rec || []);
      setRateCards(rc.data || rc.rateCards || rc || []);
    }).finally(() => setLoading(false));
  }, [token]);

  if (loading) return <Spinner />;

  const totalVendors = kpi?.vendors?.total ?? 0;
  const totalTrips = kpi?.trips?.total ?? 0;
  const totalBookings = kpi?.bookings?.total ?? 0;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Finance & Billing Operations</h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Budget, invoicing, reconciliation, cost analytics — {user?.name || 'Finance Admin'}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total Vendors', value: totalVendors, color: '#2563eb', icon: '🤝' },
          { label: 'Total Trips', value: totalTrips, color: '#10b981', icon: '🚐' },
          { label: 'Total Bookings', value: totalBookings, color: '#8b5cf6', icon: '📅' },
          { label: 'Pending Invoices', value: invoices.filter((i: any) => i.status === 'PENDING' || i.status === 'SUBMITTED').length, color: '#f59e0b', icon: '📄' },
        ].map((kpi, i) => (
          <div key={i} style={{ background: 'white', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderTop: `3px solid ${kpi.color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: '#6b7280' }}>{kpi.label}</span>
              <span style={{ fontSize: 16 }}>{kpi.icon}</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>Vendor Invoices</h3>
          {invoices.length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: 13, padding: 16, textAlign: 'center' }}>No invoices</div>
          ) : (
            invoices.slice(0, 6).map((inv: any, i: number) => (
              <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{inv.vendorName || inv.vendor?.name || `Invoice ${inv.id?.slice(0, 8)}`}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>{inv.tripCount || 0} trips · {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : ''}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>₹{(inv.totalAmount || inv.amount || 0).toLocaleString()}</span>
                  <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600, background: inv.status === 'APPROVED' ? '#dcfce7' : inv.status === 'PAID' ? '#dbeafe' : '#fef3c7', color: inv.status === 'APPROVED' ? '#16a34a' : inv.status === 'PAID' ? '#2563eb' : '#d97706' }}>{inv.status || 'PENDING'}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>Reconciliation Status</h3>
          {reconciliation.length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: 13, padding: 16, textAlign: 'center' }}>No reconciliation data</div>
          ) : (
            reconciliation.slice(0, 6).map((r: any, i: number) => (
              <div key={i} style={{ padding: '12px 0', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{r.invoiceId?.slice(0, 8) || `Reconciliation ${i + 1}`}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>Variance: {r.variance || '0%'}</div>
                </div>
                <span style={{ padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: r.status === 'RECONCILED' ? '#dcfce7' : '#fef3c7', color: r.status === 'RECONCILED' ? '#16a34a' : '#d97706' }}>{r.status || 'PENDING'}</span>
              </div>
            ))
          )}

          {rateCards.length > 0 && (
            <>
              <h4 style={{ fontSize: 13, fontWeight: 600, margin: '16px 0 8px' }}>Rate Cards</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {rateCards.slice(0, 4).map((rc: any, i: number) => (
                  <div key={i} style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: 6, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12 }}>{rc.vehicleType || rc.name || `Card ${i + 1}`}</span>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>₹{rc.baseRate || rc.rate || 0}/km</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
