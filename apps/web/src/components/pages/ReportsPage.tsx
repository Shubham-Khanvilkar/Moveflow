'use client';
import React, { useState, useEffect, useCallback } from 'react';

import { API_URL } from '../../lib/config';

type ReportTab = 'overview' | 'cost' | 'utilization' | 'safety';
type ExportFormat = 'csv' | 'xlsx' | 'json' | 'pdf';

const REPORT_TABS: { id: ReportTab; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'cost', label: 'Cost Analysis', icon: '💰' },
  { id: 'utilization', label: 'Fleet Utilization', icon: '🚛' },
  { id: 'safety', label: 'Safety Report', icon: '🛡️' },
];

const EXPORT_TYPES: { key: string; label: string; endpoint: string }[] = [
  { key: 'bookings', label: 'Bookings', endpoint: 'export/bookings' },
  { key: 'trips', label: 'Trips', endpoint: 'export/trips' },
  { key: 'expenses', label: 'Expenses', endpoint: 'export/expenses' },
  { key: 'drivers', label: 'Driver Performance', endpoint: 'export/drivers' },
  { key: 'audit', label: 'Audit Trail', endpoint: 'export/audit' },
];

export default function ReportsPage({ token }: { token: string }) {
  const [selectedReport, setSelectedReport] = useState<ReportTab>('overview');
  const [summary, setSummary] = useState<any>(null);
  const [utilization, setUtilization] = useState<any>(null);
  const [cost, setCost] = useState<any>(null);
  const [reportTypes, setReportTypes] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState<string | null>(null);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, utilRes, costRes, typesRes] = await Promise.allSettled([
        fetch(`${API_URL}/api/dashboard/analytics/summary`, { headers }),
        fetch(`${API_URL}/api/dashboard/analytics/utilization`, { headers }),
        fetch(`${API_URL}/api/dashboard/analytics/cost`, { headers }),
        fetch(`${API_URL}/api/v1/reports/types`, { headers }),
      ]);

      if (summaryRes.status === 'fulfilled' && summaryRes.value.ok) {
        const d = await summaryRes.value.json();
        setSummary(d.data || d);
      }
      if (utilRes.status === 'fulfilled' && utilRes.value.ok) {
        const d = await utilRes.value.json();
        setUtilization(d.data || d);
      }
      if (costRes.status === 'fulfilled' && costRes.value.ok) {
        const d = await costRes.value.json();
        setCost(d.data || d);
      }
      if (typesRes.status === 'fulfilled' && typesRes.value.ok) {
        const d = await typesRes.value.json();
        setReportTypes(d.data || d);
      }

      const anyFailed = [summaryRes, utilRes, costRes, typesRes].some(
        r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok)
      );
      if (anyFailed && !summaryRes) {
        setError('Failed to load some report data. Showing available data.');
      }
    } catch {
      setError('Unable to connect to the server. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExport = async (endpoint: string, format: ExportFormat, label: string) => {
    setExportLoading(label);
    try {
      if (format === 'pdf') {
        const res = await fetch(`${API_URL}/api/v1/reports/${endpoint}?format=csv`, { headers });
        if (!res.ok) throw new Error('Export failed');
        const text = await res.text();
        const { jsPDF } = await import('jspdf');
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text(`${label} Report`, 14, 20);
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
        doc.setFontSize(9);
        const lines = text.split('\n');
        let y = 38;
        lines.forEach((line: string) => {
          if (y > 270) { doc.addPage(); y = 20; }
          doc.text(line.substring(0, 100), 14, y);
          y += 5;
        });
        doc.save(`${label.toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`);
      } else {
        const res = await fetch(`${API_URL}/api/v1/reports/${endpoint}?format=${format}`, { headers });
        if (!res.ok) throw new Error('Export failed');
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${label.toLowerCase()}-${new Date().toISOString().split('T')[0]}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      }
    } catch {
      setError(`Failed to export ${label}.`);
    } finally {
      setExportLoading(null);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>📈 Reports & Analytics</h2>
        <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 24px' }}>Transport reports, cost analysis, and data exports</p>
        <div style={{ padding: 60, textAlign: 'center', color: '#6b7280' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          Loading reports...
        </div>
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div style={{ padding: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>📈 Reports & Analytics</h2>
        <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 24px' }}>Transport reports, cost analysis, and data exports</p>
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
          <div style={{ color: '#991b1b', fontWeight: 600, marginBottom: 8 }}>Error Loading Reports</div>
          <div style={{ color: '#b45c5c', fontSize: 13, marginBottom: 16 }}>{error}</div>
          <button onClick={fetchData} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#dc2626', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const d = summary || {};

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>📈 Reports & Analytics</h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Transport reports, cost analysis, and data exports</p>
        </div>
        <button onClick={fetchData} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          ↻ Refresh
        </button>
      </div>

      {error && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 16px', marginBottom: 16, color: '#92400e', fontSize: 13 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Report Tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {REPORT_TABS.map(r => (
          <button key={r.id} onClick={() => setSelectedReport(r.id)} style={{
            padding: '16px', borderRadius: 12, border: selectedReport === r.id ? '2px solid #2563eb' : '1px solid #e5e7eb',
            background: selectedReport === r.id ? '#eff6ff' : 'white', cursor: 'pointer', textAlign: 'center',
          }}>
            <div style={{ fontSize: 24, marginBottom: 4 }}>{r.icon}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: selectedReport === r.id ? '#2563eb' : '#374151' }}>{r.label}</div>
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {selectedReport === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Employees', value: d.employees?.total ?? 0, color: '#2563eb' },
            { label: 'Drivers', value: d.drivers?.total ?? 0, color: '#10b981', sub: `${d.drivers?.available ?? 0} available` },
            { label: 'Vehicles', value: d.vehicles?.total ?? 0, color: '#8b5cf6', sub: `${d.vehicles?.available ?? 0} available` },
            { label: 'Routes', value: d.routes?.total ?? 0, color: '#06b6d4' },
            { label: 'Vendors', value: d.vendors?.total ?? 0, color: '#f59e0b' },
            { label: 'Active Trips', value: d.trips?.active ?? 0, color: '#ef4444' },
            { label: 'Active Bookings', value: d.bookings?.active ?? 0, color: '#ec4899' },
            { label: 'Pending Approvals', value: d.approvals?.pending ?? 0, color: '#f97316' },
            { label: 'Active Emergencies', value: d.emergencies?.active ?? 0, color: '#dc2626' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>{s.label}</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: s.color }}>{s.value}</div>
              {s.sub && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{s.sub}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Cost Tab */}
      {selectedReport === 'cost' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Total Cost', value: `₹${(cost?.totalCost ?? 0).toLocaleString()}`, color: '#2563eb' },
            { label: 'Total Penalties', value: `₹${(cost?.totalPenalties ?? 0).toLocaleString()}`, color: '#ef4444' },
            { label: 'Net Cost', value: `₹${(cost?.netCost ?? 0).toLocaleString()}`, color: '#10b981' },
            { label: 'Invoice Count', value: cost?.invoiceCount ?? 0, color: '#8b5cf6' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>{s.label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Utilization Tab */}
      {selectedReport === 'utilization' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Date', value: utilization?.date ?? '—', color: '#374151' },
            { label: 'Total Trips', value: utilization?.totalTrips ?? 0, color: '#2563eb' },
            { label: 'Available Vehicles', value: utilization?.availableVehicles ?? 0, color: '#10b981' },
            { label: 'Utilization Rate', value: `${utilization?.utilization ?? 0}%`, color: '#8b5cf6' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>{s.label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Safety Tab */}
      {selectedReport === 'safety' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Active Bans', value: d.bans?.active ?? 0, color: '#ef4444' },
            { label: 'Active Emergencies', value: d.emergencies?.active ?? 0, color: '#dc2626' },
            { label: 'Pending Approvals', value: d.approvals?.pending ?? 0, color: '#f97316' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>{s.label}</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Available Report Types */}
      {Object.keys(reportTypes).length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px' }}>📋 Available Report Types</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
            {Object.entries(reportTypes).map(([key, rt]: [string, any]) => (
              <div key={key} style={{ background: 'white', borderRadius: 10, padding: '12px 16px', border: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{rt.name}</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{rt.description}</div>
                <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4, textTransform: 'uppercase' }}>{rt.category}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data Export Section */}
      <div>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px' }}>📥 Export Data</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {EXPORT_TYPES.map(ex => (
            <div key={ex.key} style={{ background: 'white', borderRadius: 12, padding: 16, border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10 }}>{ex.label}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['csv', 'xlsx', 'pdf'] as ExportFormat[]).map(fmt => (
                  <button
                    key={fmt}
                    onClick={() => handleExport(ex.endpoint, fmt, ex.label)}
                    disabled={exportLoading === ex.label}
                    style={{
                      flex: 1, padding: '6px 0', borderRadius: 6, border: '1px solid #e5e7eb',
                      background: exportLoading === ex.label ? '#f3f4f6' : '#f9fafb',
                      cursor: exportLoading === ex.label ? 'not-allowed' : 'pointer',
                      fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase',
                    }}
                  >
                    {exportLoading === ex.label ? '...' : fmt}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
