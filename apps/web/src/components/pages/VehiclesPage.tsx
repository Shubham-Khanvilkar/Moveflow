'use client';
import React, { useState, useEffect, useCallback } from 'react';

import { API_URL } from '../../lib/config';

interface Vehicle {
  id: string;
  registrationNo?: string;
  vehicleType?: string;
  make?: string;
  model?: string;
  capacity?: number;
  passengerCapacity?: number;
  fuelType?: string;
  acType?: string;
  color?: string;
  status: string;
  isEV?: boolean;
  isBlocked?: boolean;
  vendor?: { id: string; name: string } | null;
  driver?: { id: string; name: string } | null;
}

interface Vendor {
  id: string;
  name: string;
}

interface PaginatedResponse {
  data: Vehicle[];
  total: number;
  page: number;
  limit: number;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  AVAILABLE: { bg: '#d1fae5', text: '#065f46' },
  ON_TRIP: { bg: '#dbeafe', text: '#1e40af' },
  BREAKDOWN: { bg: '#fee2e2', text: '#991b1b' },
  PENDING_VERIFICATION: { bg: '#fef3c7', text: '#92400e' },
  INACTIVE: { bg: '#f3f4f6', text: '#6b7280' },
};

const VEHICLE_TYPES = ['SEDAN', 'SUV', 'HATCHBACK', 'TEMPO', 'BUS', 'VAN', 'AUTO_RICKSHAW'];
const FUEL_TYPES = ['PETROL', 'DIESEL', 'ELECTRIC', 'CNG', 'HYBRID'];
const AC_TYPES = ['AC', 'NON_AC'];

export default function VehiclesPage({ token }: { token: string }) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
  const [search, setSearch] = useState('');
  const [filterVendor, setFilterVendor] = useState('');
  const [filterOffice, setFilterOffice] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 10;

  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [importFile, setImportFile] = useState<File | null>(null);

  const emptyForm = {
    registrationNo: '',
    vehicleType: 'SEDAN',
    make: '',
    model: '',
    capacity: '4',
    fuelType: 'PETROL',
    acType: 'AC',
    color: '',
    vendorId: '',
  };
  const [form, setForm] = useState(emptyForm);

  const fetchVendors = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/vendors`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setVendors(data.data || data || []);
      }
    } catch {
      // silent
    }
  }, [token]);

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        isBlocked: activeTab === 'inactive' ? 'true' : 'false',
      });
      if (search) params.set('search', search);
      if (filterVendor) params.set('vendorId', filterVendor);
      if (filterStatus) params.set('status', filterStatus);

      const res = await fetch(`${API_URL}/api/vehicles?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to fetch vehicles');

      const result: PaginatedResponse = await res.json();
      setVehicles(result.data || []);
      setTotalItems(result.total || 0);
      setTotalPages(Math.ceil((result.total || 0) / limit));
    } catch {
      setError('Unable to load vehicles');
    }
    setLoading(false);
  }, [token, page, activeTab, search, filterVendor, filterStatus]);

  useEffect(() => { fetchVendors(); }, [fetchVendors]);
  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

  useEffect(() => { setPage(1); }, [activeTab, search, filterVendor, filterStatus]);

  const resetForm = () => setForm(emptyForm);

  const openCreate = () => { resetForm(); setShowCreate(true); };

  const openEdit = (v: Vehicle) => {
    setEditingVehicle(v);
    setForm({
      registrationNo: v.registrationNo || '',
      vehicleType: v.vehicleType || 'SEDAN',
      make: v.make || '',
      model: v.model || '',
      capacity: String(v.passengerCapacity || v.capacity || 4),
      fuelType: v.fuelType || 'PETROL',
      acType: v.acType || 'AC',
      color: v.color || '',
      vendorId: v.vendor?.id || '',
    });
    setShowEdit(true);
  };

  const handleCreate = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/vehicles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, passengerCapacity: parseInt(form.capacity) }),
      });
      if (res.ok) {
        setShowCreate(false);
        setSuccess('Vehicle created successfully');
        fetchVehicles();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const d = await res.json();
        setError(d.message || 'Failed to create vehicle');
      }
    } catch {
      setError('Failed to create vehicle');
    }
    setSaving(false);
  };

  const handleEdit = async () => {
    if (!editingVehicle) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/vehicles/${editingVehicle.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, passengerCapacity: parseInt(form.capacity) }),
      });
      if (res.ok) {
        setShowEdit(false);
        setEditingVehicle(null);
        setSuccess('Vehicle updated successfully');
        fetchVehicles();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const d = await res.json();
        setError(d.message || 'Failed to update vehicle');
      }
    } catch {
      setError('Failed to update vehicle');
    }
    setSaving(false);
  };

  const handleBulkImport = async (dryRun?: boolean) => {
    if (!importFile) return;
    setImporting(true);
    setError('');
    setImportResult(null);
    try {
      const csvContent = await importFile.text();
      const res = await fetch(`${API_URL}/api/vehicles/bulk-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ csvContent, dryRun }),
      });
      const result = await res.json();
      setImportResult(result);
      if (!dryRun && result.status === 'COMPLETED') {
        setSuccess(`Import complete: ${result.created} created, ${result.updated} updated`);
        fetchVehicles();
        setTimeout(() => { setShowImport(false); setImportResult(null); }, 2000);
      }
    } catch {
      setError('Failed to import vehicles');
    }
    setImporting(false);
  };

  const handleBlock = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/vehicles/${id}/block`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSuccess('Vehicle deactivated');
        fetchVehicles();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const d = await res.json();
        setError(d.message || 'Failed to deactivate');
      }
    } catch {
      setError('Failed to deactivate vehicle');
    }
  };

  const handleUnblock = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/vehicles/${id}/unblock`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSuccess('Vehicle activated');
        fetchVehicles();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const d = await res.json();
        setError(d.message || 'Failed to activate');
      }
    } catch {
      setError('Failed to activate vehicle');
    }
  };

  const handleGenerateQR = async (id: string) => {
    setQrLoading(id);
    try {
      const res = await fetch(`${API_URL}/api/vehicles/${id}/qr/generate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vehicle-${id}-qr.png`;
        a.click();
        URL.revokeObjectURL(url);
        setSuccess('QR code generated and downloaded');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const d = await res.json();
        setError(d.message || 'Failed to generate QR');
      }
    } catch {
      setError('Failed to generate QR code');
    }
    setQrLoading(null);
  };

  const handleDownloadQR = async (id: string) => {
    setQrLoading(id);
    try {
      const res = await fetch(`${API_URL}/api/vehicles/${id}/qr/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const qrUrl = data.qrUrl || data.data?.qrUrl;
        if (qrUrl) {
          const a = document.createElement('a');
          a.href = qrUrl;
          a.download = `vehicle-${id}-qr.png`;
          a.click();
          setSuccess('QR code downloaded');
        } else {
          setError('No QR code found. Generate one first.');
        }
        setTimeout(() => { setSuccess(''); setError(''); }, 3000);
      } else {
        setError('Failed to fetch QR history');
      }
    } catch {
      setError('Failed to download QR code');
    }
    setQrLoading(null);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box',
  };

  const selectStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: 'white',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4,
  };

  const btnPrimary: React.CSSProperties = {
    padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
  };

  const btnDanger: React.CSSProperties = {
    padding: '6px 12px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
  };

  const btnSuccess: React.CSSProperties = {
    padding: '6px 12px', background: '#d1fae5', color: '#065f46', border: '1px solid #a7f3d0', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
  };

  const btnSmall: React.CSSProperties = {
    padding: '5px 10px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 11, cursor: 'pointer',
  };

  const getStatusBadge = (status: string) => {
    const c = STATUS_COLORS[status] || STATUS_COLORS.AVAILABLE;
    return (
      <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: c.bg, color: c.text, whiteSpace: 'nowrap' }}>
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  const renderFormFields = () => (
    <>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Registration No</label>
        <input value={form.registrationNo} onChange={e => setForm({ ...form, registrationNo: e.target.value })}
          placeholder="e.g. MH-12-AB-1234" style={inputStyle} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label style={labelStyle}>Make</label>
          <input value={form.make} onChange={e => setForm({ ...form, make: e.target.value })}
            placeholder="e.g. Toyota" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Model</label>
          <input value={form.model} onChange={e => setForm({ ...form, model: e.target.value })}
            placeholder="e.g. Innova" style={inputStyle} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label style={labelStyle}>Vehicle Type</label>
          <select value={form.vehicleType} onChange={e => setForm({ ...form, vehicleType: e.target.value })} style={selectStyle}>
            {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Capacity</label>
          <input type="number" min={1} max={60} value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })}
            style={inputStyle} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label style={labelStyle}>Fuel Type</label>
          <select value={form.fuelType} onChange={e => setForm({ ...form, fuelType: e.target.value })} style={selectStyle}>
            {FUEL_TYPES.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>AC Type</label>
          <select value={form.acType} onChange={e => setForm({ ...form, acType: e.target.value })} style={selectStyle}>
            {AC_TYPES.map(a => <option key={a} value={a}>{a.replace('_', ' ')}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label style={labelStyle}>Color</label>
          <input value={form.color} onChange={e => setForm({ ...form, color: e.target.value })}
            placeholder="e.g. White" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Vendor</label>
          <select value={form.vendorId} onChange={e => setForm({ ...form, vendorId: e.target.value })} style={selectStyle}>
            <option value="">No Vendor</option>
            {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
      </div>
    </>
  );

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Vehicle Fleet</h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>{totalItems} vehicles registered</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={openCreate} style={btnPrimary}>+ Add Vehicle</button>
          <button onClick={() => setShowImport(true)} style={{ ...btnPrimary, backgroundColor: '#7c3aed' }}>Import CSV</button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>
      )}
      {success && (
        <div style={{ background: '#f0fdf4', color: '#166534', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
          {success}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid #e5e7eb' }}>
        {(['active', 'inactive'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 24px', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer', borderBottom: activeTab === tab ? '2px solid #2563eb' : '2px solid transparent',
              marginBottom: -2, background: 'transparent', color: activeTab === tab ? '#2563eb' : '#6b7280',
            }}>
            {tab === 'active' ? 'Active Vehicles' : 'Inactive Vehicles'}
          </button>
        ))}
      </div>

      {/* Search and Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by vehicle number..."
          style={{ padding: '8px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, minWidth: 220 }}
        />
        <select value={filterVendor} onChange={e => setFilterVendor(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: 'white', minWidth: 160 }}>
          <option value="">All Vendors</option>
          {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
        <input
          value={filterOffice}
          onChange={e => setFilterOffice(e.target.value)}
          placeholder="Office"
          style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, minWidth: 140 }}
        />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: 'white', minWidth: 160 }}>
          <option value="">All Statuses</option>
          <option value="AVAILABLE">Available</option>
          <option value="ON_TRIP">On Trip</option>
          <option value="BREAKDOWN">Breakdown</option>
          <option value="PENDING_VERIFICATION">Pending Verification</option>
        </select>
        {(search || filterVendor || filterOffice || filterStatus) && (
          <button onClick={() => { setSearch(''); setFilterVendor(''); setFilterOffice(''); setFilterStatus(''); }}
            style={{ padding: '8px 14px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
            Clear Filters
          </button>
        )}
      </div>

      {/* Data Table */}
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#6b7280', background: 'white', borderRadius: 12, border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 28, marginBottom: 12, animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</div>
          <div style={{ fontSize: 14 }}>Loading vehicles...</div>
        </div>
      ) : vehicles.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', background: 'white', borderRadius: 12, border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🚗</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#374151', marginBottom: 4 }}>No vehicles found</div>
          <div style={{ fontSize: 13, color: '#6b7280' }}>
            {activeTab === 'active' ? 'No active vehicles match your filters.' : 'No inactive vehicles.'}
          </div>
          {activeTab === 'active' && (
            <button onClick={openCreate} style={{ ...btnPrimary, marginTop: 16 }}>+ Add First Vehicle</button>
          )}
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['#', 'Vehicle ID', 'Number', 'Model', 'Type', 'Fuel', 'Capacity', 'Vendor', 'Driver', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v, idx) => (
                  <React.Fragment key={v.id}>
                    <tr
                      onClick={() => setExpandedRow(expandedRow === v.id ? null : v.id)}
                      style={{ cursor: 'pointer', borderBottom: expandedRow === v.id ? 'none' : '1px solid #f3f4f6', background: expandedRow === v.id ? '#f0f7ff' : 'white' }}
                    >
                      <td style={{ padding: '12px 14px', color: '#9ca3af' }}>{(page - 1) * limit + idx + 1}</td>
                      <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: 12, color: '#6b7280' }}>{v.id.slice(0, 8)}...</td>
                      <td style={{ padding: '12px 14px', fontWeight: 600 }}>{v.registrationNo || '—'}</td>
                      <td style={{ padding: '12px 14px' }}>{v.make} {v.model}</td>
                      <td style={{ padding: '12px 14px' }}>{v.vehicleType?.replace(/_/g, ' ') || '—'}</td>
                      <td style={{ padding: '12px 14px' }}>{v.fuelType || '—'}</td>
                      <td style={{ padding: '12px 14px' }}>{v.passengerCapacity || v.capacity || '—'}</td>
                      <td style={{ padding: '12px 14px' }}>{v.vendor?.name || '—'}</td>
                      <td style={{ padding: '12px 14px' }}>{v.driver?.name || '—'}</td>
                      <td style={{ padding: '12px 14px' }}>{getStatusBadge(v.status)}</td>
                      <td style={{ padding: '12px 14px' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button onClick={() => openEdit(v)} style={btnSmall}>Edit</button>
                          {activeTab === 'active' ? (
                            <button onClick={() => handleBlock(v.id)} style={btnDanger}>Deactivate</button>
                          ) : (
                            <button onClick={() => handleUnblock(v.id)} style={btnSuccess}>Activate</button>
                          )}
                          <button onClick={() => handleGenerateQR(v.id)} disabled={qrLoading === v.id}
                            style={{ ...btnSmall, background: '#eff6ff', borderColor: '#bfdbfe', color: '#1e40af' }}>
                            {qrLoading === v.id ? '...' : 'QR'}
                          </button>
                          <button onClick={() => handleDownloadQR(v.id)} disabled={qrLoading === v.id}
                            style={{ ...btnSmall, background: '#faf5ff', borderColor: '#e9d5ff', color: '#7c3aed' }}>
                            {qrLoading === v.id ? '...' : 'DL'}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedRow === v.id && (
                      <tr>
                        <td colSpan={11} style={{ padding: '16px 20px', background: '#f0f7ff', borderBottom: '1px solid #e5e7eb' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                            <div>
                              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Vehicle ID</div>
                              <div style={{ fontSize: 14, fontFamily: 'monospace' }}>{v.id}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Registration</div>
                              <div style={{ fontSize: 14, fontWeight: 600 }}>{v.registrationNo || '—'}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Make / Model</div>
                              <div style={{ fontSize: 14 }}>{v.make || '—'} {v.model || '—'}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Type</div>
                              <div style={{ fontSize: 14 }}>{v.vehicleType?.replace(/_/g, ' ') || '—'}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Fuel</div>
                              <div style={{ fontSize: 14 }}>{v.fuelType || '—'}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>AC Type</div>
                              <div style={{ fontSize: 14 }}>{v.acType || '—'}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Capacity</div>
                              <div style={{ fontSize: 14 }}>{v.passengerCapacity || v.capacity || '—'} seats</div>
                            </div>
                            <div>
                              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Color</div>
                              <div style={{ fontSize: 14 }}>{v.color || '—'}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Status</div>
                              <div>{getStatusBadge(v.status)}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Vendor</div>
                              <div style={{ fontSize: 14 }}>{v.vendor?.name || '—'}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Driver</div>
                              <div style={{ fontSize: 14 }}>{v.driver?.name || '—'}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Electric</div>
                              <div style={{ fontSize: 14 }}>{v.isEV ? '⚡ Yes' : 'No'}</div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid #e5e7eb', background: '#f9fafb' }}>
            <div style={{ fontSize: 13, color: '#6b7280' }}>
              Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, totalItems)} of {totalItems}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}
                style={{ padding: '6px 14px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.5 : 1, background: 'white' }}>
                Prev
              </button>
              <span style={{ fontSize: 13, color: '#374151', fontWeight: 600 }}>Page {page} of {totalPages || 1}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
                style={{ padding: '6px 14px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, cursor: page >= totalPages ? 'not-allowed' : 'pointer', opacity: page >= totalPages ? 0.5 : 1, background: 'white' }}>
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 32, width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 20px' }}>Add Vehicle</h3>
            {renderFormFields()}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setShowCreate(false)} style={{ flex: 1, padding: '10px 0', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleCreate} disabled={saving} style={{ flex: 1, padding: '10px 0', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                {saving ? 'Creating...' : 'Create Vehicle'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 32, width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 20px' }}>Edit Vehicle</h3>
            {renderFormFields()}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => { setShowEdit(false); setEditingVehicle(null); }} style={{ flex: 1, padding: '10px 0', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleEdit} disabled={saving} style={{ flex: 1, padding: '10px 0', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      {showImport && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 32, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 16px' }}>Import Vehicles from CSV</h3>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>Upload a CSV with columns: registration_no, vehicle_type, make, model, year, color, capacity, fuel_type, ac_type, ownership_type, vendor_id</p>

            <div style={{ border: '2px dashed #d1d5db', borderRadius: 12, padding: 32, textAlign: 'center', marginBottom: 16, background: importFile ? '#f0fdf4' : '#f9fafb' }}>
              <input type="file" accept=".csv" onChange={e => { const f = e.target.files?.[0]; if (f) { setImportFile(f); setImportResult(null); } }} style={{ display: 'none' }} id="csv-upload" />
              <label htmlFor="csv-upload" style={{ cursor: 'pointer', color: '#2563eb', fontWeight: 600, fontSize: 14 }}>
                {importFile ? `Selected: ${importFile.name}` : 'Click to select CSV file'}
              </label>
            </div>

            {importResult && (
              <div style={{ background: importResult.errors?.length > 0 ? '#fef2f2' : '#f0fdf4', borderRadius: 8, padding: 16, marginBottom: 16, fontSize: 13 }}>
                <p style={{ fontWeight: 600, margin: '0 0 8px' }}>{importResult.status === 'DRY_RUN' ? 'Validation Result' : 'Import Result'}</p>
                <p style={{ margin: '2px 0' }}>Total rows: {importResult.totalRows}</p>
                <p style={{ margin: '2px 0', color: '#059669' }}>Created: {importResult.created}</p>
                <p style={{ margin: '2px 0', color: '#2563eb' }}>Updated: {importResult.updated}</p>
                {importResult.failed > 0 && <p style={{ margin: '2px 0', color: '#dc2626' }}>Failed: {importResult.failed}</p>}
                {importResult.errors?.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    {importResult.errors.slice(0, 5).map((e: any, i: number) => (
                      <p key={i} style={{ margin: '2px 0', color: '#dc2626', fontSize: 12 }}>Row {e.rowNumber}: {e.errorMessage}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => { setShowImport(false); setImportFile(null); setImportResult(null); }} style={{ flex: 1, padding: '10px 0', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => handleBulkImport(true)} disabled={!importFile || importing} style={{ flex: 1, padding: '10px 0', background: '#f59e0b', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                {importing ? 'Validating...' : 'Validate'}
              </button>
              <button onClick={() => handleBulkImport(false)} disabled={!importFile || importing || (importResult && importResult.errors?.length > 0)} style={{ flex: 1, padding: '10px 0', background: '#7c3aed', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                {importing ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
