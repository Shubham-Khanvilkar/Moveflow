'use client';
import React, { useState, useEffect, useCallback } from 'react';

import { API_URL } from '../../lib/config';

interface VehicleType {
  id: string;
  name: string;
  description?: string;
  usageType: string;
  totalCapacity: number;
  fuelType: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

interface PaginatedResponse {
  data: VehicleType[];
  total: number;
  page: number;
  limit: number;
}

const USAGE_TYPES = ['CAB', 'SHUTTLE'];
const FUEL_TYPES = ['CNG', 'DIESEL', 'PETROL', 'ELECTRIC'];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  ACTIVE: { bg: '#d1fae5', text: '#065f46' },
  INACTIVE: { bg: '#f3f4f6', text: '#6b7280' },
};

export default function VehicleTypePage({ token }: { token: string }) {
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [search, setSearch] = useState('');
  const [filterUsageType, setFilterUsageType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 20;

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<VehicleType | null>(null);
  const [saving, setSaving] = useState(false);

  const emptyForm = {
    name: '',
    description: '',
    usageType: 'CAB',
    totalCapacity: '4',
    fuelType: 'CNG',
    status: 'ACTIVE',
  };
  const [form, setForm] = useState(emptyForm);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (search) params.set('search', search);
      if (filterUsageType) params.set('usageType', filterUsageType);
      if (filterStatus) params.set('status', filterStatus);

      const res = await fetch(`${API_URL}/api/vehicle-types?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to fetch vehicle types');

      const result: PaginatedResponse = await res.json();
      setVehicleTypes(result.data || []);
      setTotalItems(result.total || 0);
      setTotalPages(Math.ceil((result.total || 0) / limit));
    } catch {
      setError('Unable to load vehicle types');
    }
    setLoading(false);
  }, [token, page, search, filterUsageType, filterStatus]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [search, filterUsageType, filterStatus]);

  const openCreate = () => {
    setEditingItem(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (item: VehicleType) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      description: item.description || '',
      usageType: item.usageType,
      totalCapacity: String(item.totalCapacity),
      fuelType: item.fuelType,
      status: item.status,
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    try {
      const body = {
        ...form,
        totalCapacity: parseInt(form.totalCapacity),
      };

      const url = editingItem
        ? `${API_URL}/api/vehicle-types/${editingItem.id}`
        : `${API_URL}/api/vehicle-types`;

      const res = await fetch(url, {
        method: editingItem ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setShowModal(false);
        setEditingItem(null);
        setSuccess(editingItem ? 'Vehicle type updated successfully' : 'Vehicle type created successfully');
        fetchData();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const d = await res.json();
        setError(d.message || 'Failed to save vehicle type');
      }
    } catch {
      setError('Failed to save vehicle type');
    }
    setSaving(false);
  };

  const handleToggleStatus = async (item: VehicleType) => {
    try {
      const res = await fetch(`${API_URL}/api/vehicle-types/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }),
      });
      if (res.ok) {
        setSuccess(`Vehicle type ${item.status === 'ACTIVE' ? 'deactivated' : 'activated'}`);
        fetchData();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const d = await res.json();
        setError(d.message || 'Failed to update status');
      }
    } catch {
      setError('Failed to update status');
    }
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

  const btnSmall: React.CSSProperties = {
    padding: '5px 10px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 11, cursor: 'pointer',
  };

  const btnDanger: React.CSSProperties = {
    padding: '5px 10px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
  };

  const btnSuccess: React.CSSProperties = {
    padding: '5px 10px', background: '#d1fae5', color: '#065f46', border: '1px solid #a7f3d0', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
  };

  const getStatusBadge = (status: string) => {
    const c = STATUS_COLORS[status] || STATUS_COLORS.INACTIVE;
    return (
      <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: c.bg, color: c.text, whiteSpace: 'nowrap' }}>
        {status}
      </span>
    );
  };

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Vehicle Types</h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>{totalItems} vehicle types configured</p>
        </div>
        <button onClick={openCreate} style={btnPrimary}>+ Add Vehicle Type</button>
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

      {/* Search and Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name..."
          style={{ padding: '8px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, minWidth: 220 }}
        />
        <select value={filterUsageType} onChange={e => setFilterUsageType(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: 'white', minWidth: 160 }}>
          <option value="">All Usage Types</option>
          {USAGE_TYPES.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: 'white', minWidth: 160 }}>
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        {(search || filterUsageType || filterStatus) && (
          <button onClick={() => { setSearch(''); setFilterUsageType(''); setFilterStatus(''); }}
            style={{ padding: '8px 14px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
            Clear Filters
          </button>
        )}
      </div>

      {/* Data Table */}
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#6b7280', background: 'white', borderRadius: 12, border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 28, marginBottom: 12, animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</div>
          <div style={{ fontSize: 14 }}>Loading vehicle types...</div>
        </div>
      ) : vehicleTypes.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', background: 'white', borderRadius: 12, border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#374151', marginBottom: 4 }}>No vehicle types found</div>
          <div style={{ fontSize: 13, color: '#6b7280' }}>
            {search || filterUsageType || filterStatus ? 'No vehicle types match your filters.' : 'No vehicle types have been configured yet.'}
          </div>
          {!search && !filterUsageType && !filterStatus && (
            <button onClick={openCreate} style={{ ...btnPrimary, marginTop: 16 }}>+ Add First Vehicle Type</button>
          )}
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['#', 'Name', 'Description', 'Usage Type', 'Capacity', 'Fuel Type', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vehicleTypes.map((item, idx) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6', background: 'white' }}>
                    <td style={{ padding: '12px 14px', color: '#9ca3af' }}>{(page - 1) * limit + idx + 1}</td>
                    <td style={{ padding: '12px 14px', fontWeight: 600 }}>{item.name}</td>
                    <td style={{ padding: '12px 14px', color: '#6b7280', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.description || '—'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>{item.usageType}</td>
                    <td style={{ padding: '12px 14px' }}>{item.totalCapacity}</td>
                    <td style={{ padding: '12px 14px' }}>{item.fuelType}</td>
                    <td style={{ padding: '12px 14px' }}>{getStatusBadge(item.status)}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button onClick={() => openEdit(item)} style={btnSmall}>Edit</button>
                        {item.status === 'ACTIVE' ? (
                          <button onClick={() => handleToggleStatus(item)} style={btnDanger}>Deactivate</button>
                        ) : (
                          <button onClick={() => handleToggleStatus(item)} style={btnSuccess}>Activate</button>
                        )}
                      </div>
                    </td>
                  </tr>
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

      {/* Create/Edit Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 32, width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 20px' }}>
              {editingItem ? 'Edit Vehicle Type' : 'Add Vehicle Type'}
            </h3>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Vehicle Type Name *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Luxury Sedan" style={inputStyle} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Brief description of the vehicle type" rows={3}
                style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>Usage Type *</label>
                <select value={form.usageType} onChange={e => setForm({ ...form, usageType: e.target.value })} style={selectStyle}>
                  {USAGE_TYPES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Total Capacity *</label>
                <input type="number" min={1} max={60} value={form.totalCapacity}
                  onChange={e => setForm({ ...form, totalCapacity: e.target.value })} style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>Fuel Type *</label>
                <select value={form.fuelType} onChange={e => setForm({ ...form, fuelType: e.target.value })} style={selectStyle}>
                  {FUEL_TYPES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Status *</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={selectStyle}>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => { setShowModal(false); setEditingItem(null); }}
                style={{ flex: 1, padding: '10px 0', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={saving || !form.name.trim()}
                style={{ flex: 1, padding: '10px 0', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: saving || !form.name.trim() ? 0.6 : 1 }}>
                {saving ? 'Saving...' : editingItem ? 'Save Changes' : 'Create Vehicle Type'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
