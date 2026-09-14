'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../../lib/config';

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '24px', fontFamily: 'Inter, system-ui, sans-serif', maxWidth: '1400px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  title: { fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 },
  subtitle: { fontSize: '14px', color: '#6B7280', marginTop: '4px' },
  toolbar: { display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' },
  tabs: { display: 'flex', gap: '0', marginBottom: '20px', borderBottom: '2px solid #E5E7EB' },
  tab: { padding: '10px 20px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', border: 'none', background: 'none', color: '#6B7280', borderBottom: '2px solid transparent', marginBottom: '-2px' },
  tabActive: { color: '#2563EB', borderBottomColor: '#2563EB', fontWeight: 600 },
  btn: { padding: '8px 16px', borderRadius: '6px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', border: 'none', transition: 'all 0.15s' },
  btnPrimary: { backgroundColor: '#2563EB', color: '#fff' },
  btnOutline: { backgroundColor: '#fff', color: '#374151', border: '1px solid #D1D5DB' },
  btnGreen: { backgroundColor: '#059669', color: '#fff' },
  btnYellow: { backgroundColor: '#D97706', color: '#fff' },
  btnRed: { backgroundColor: '#DC2626', color: '#fff' },
  btnSm: { padding: '4px 10px', fontSize: '12px' },
  input: { padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '14px' },
  select: { padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '14px', backgroundColor: '#fff' },
  card: { backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '16px', marginBottom: '12px', transition: 'box-shadow 0.15s' },
  cardExpanded: { boxShadow: '0 4px 12px rgba(0,0,0,0.08)' },
  addressRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '8px', marginBottom: '8px', gap: '12px' },
  badge: { display: 'inline-block', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 },
  badgeGreen: { backgroundColor: '#D1FAE5', color: '#065F46' },
  badgeYellow: { backgroundColor: '#FEF3C7', color: '#92400E' },
  badgeRed: { backgroundColor: '#FEE2E2', color: '#991B1B' },
  badgeBlue: { backgroundColor: '#DBEAFE', color: '#1E40AF' },
  badgeGray: { backgroundColor: '#F3F4F6', color: '#374151' },
  badgePurple: { backgroundColor: '#EDE9FE', color: '#5B21B6' },
  empty: { textAlign: 'center', padding: '60px 20px', color: '#9CA3AF' },
  emptyIcon: { fontSize: '48px', marginBottom: '12px' },
  emptyText: { fontSize: '16px', fontWeight: 500, color: '#6B7280' },
  emptySubtext: { fontSize: '14px', color: '#9CA3AF', marginTop: '4px' },
  loading: { display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '60px', color: '#6B7280', gap: '12px' },
  spinner: { width: '32px', height: '32px', border: '3px solid #E5E7EB', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  errorBanner: { padding: '12px 16px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', color: '#991B1B', fontSize: '14px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  errorRetry: { background: 'none', border: 'none', color: '#2563EB', cursor: 'pointer', fontWeight: 600, fontSize: '14px', textDecoration: 'underline' },
  modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modal: { backgroundColor: '#fff', borderRadius: '12px', padding: '24px', width: '600px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
  modalTitle: { fontSize: '18px', fontWeight: 700, color: '#111827', marginBottom: '16px' },
  formGroup: { marginBottom: '14px' },
  label: { display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' },
  mapPlaceholder: { width: '100%', height: '160px', backgroundColor: '#F3F4F6', border: '2px dashed #D1D5DB', borderRadius: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#9CA3AF', fontSize: '14px', gap: '6px', cursor: 'not-allowed' },
  mapIcon: { fontSize: '24px' },
  addressText: { fontSize: '13px', color: '#374151', lineHeight: 1.5 },
};

interface EmployeeAddress {
  id: string;
  userId: string;
  userName?: string;
  companyId: string;
  label: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  latitude: number;
  longitude: number;
  landmark?: string;
  addressType: 'RESIDENTIAL' | 'PERMANENT' | 'CORRESPONDENCE';
  status: 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'VERIFIED' | 'REJECTED';
  effectiveFrom: string;
  effectiveTo?: string;
  isDefault: boolean;
  verifiedAt?: string;
  rejectionReason?: string;
}

interface AddressFormData {
  userId: string;
  label: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  latitude: string;
  longitude: string;
  landmark: string;
  addressType: 'RESIDENTIAL' | 'PERMANENT' | 'CORRESPONDENCE';
  effectiveFrom: string;
  effectiveTo: string;
  isDefault: boolean;
}

const emptyForm: AddressFormData = {
  userId: '', label: '', addressLine1: '', addressLine2: '', city: '', state: '', pincode: '', country: 'IN',
  latitude: '', longitude: '', landmark: '', addressType: 'RESIDENTIAL', effectiveFrom: '', effectiveTo: '', isDefault: false,
};

function buildFullAddress(a: EmployeeAddress): string {
  const parts = [a.addressLine1, a.addressLine2, a.city, a.state, a.pincode, a.country].filter(Boolean);
  return parts.join(', ');
}

export default function EmployeeAddressesPage({ token }: { token: string }) {
  const [addresses, setAddresses] = useState<EmployeeAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'all' | 'expiring'>('all');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAddr, setEditingAddr] = useState<EmployeeAddress | null>(null);
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState<AddressFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const authHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }), [token]);

  const fetchAddresses = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterType !== 'ALL') params.set('addressType', filterType);
      if (filterStatus !== 'ALL') params.set('status', filterStatus);
      if (activeTab === 'expiring') {
        params.set('status', 'ACTIVE');
      }
      const url = `${API_URL}/api/employee-addresses?${params.toString()}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.message || `Failed to fetch addresses (${res.status})`);
      }
      const data = await res.json();
      setAddresses(data.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load addresses');
    } finally {
      setLoading(false);
    }
  }, [token, search, filterType, filterStatus, activeTab]);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/employees`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setEmployees((data.data || []).map((e: any) => ({ id: e.id, name: e.name || e.email })));
      }
    } catch { /* silent */ }
  }, [token]);

  useEffect(() => { fetchAddresses(); }, [fetchAddresses]);
  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  const handleCreate = async () => {
    setSaving(true);
    setError('');
    try {
      const body: Record<string, any> = {
        userId: form.userId,
        label: form.label,
        addressLine1: form.addressLine1,
        addressLine2: form.addressLine2 || undefined,
        city: form.city,
        state: form.state,
        pincode: form.pincode,
        country: form.country || 'IN',
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        landmark: form.landmark || undefined,
        addressType: form.addressType,
        isDefault: form.isDefault,
      };
      if (form.effectiveFrom) body.effectiveFrom = form.effectiveFrom;
      if (form.effectiveTo) body.effectiveTo = form.effectiveTo;

      if (!body.userId || !body.label || !body.addressLine1 || !body.city || !body.state || !body.pincode || isNaN(body.latitude) || isNaN(body.longitude)) {
        throw new Error('Please fill in all required fields (label, address, city, state, pincode, lat/lng).');
      }

      const isEditing = !!editingAddr;
      const url = isEditing ? `${API_URL}/api/employee-addresses/${editingAddr!.id}` : `${API_URL}/api/employee-addresses`;
      const res = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.message || `Failed to ${isEditing ? 'update' : 'create'} address`);
      }
      setShowForm(false);
      resetForm();
      fetchAddresses();
    } catch (err: any) {
      setError(err.message || 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  const handleAction = async (id: string, action: string, method: string = 'POST', body?: Record<string, any>) => {
    setActionLoading(id);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/employee-addresses/${id}/${action}`, {
        method,
        headers: authHeaders(),
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.message || `Failed to ${action} address`);
      }
      fetchAddresses();
    } catch (err: any) {
      setError(err.message || `Failed to ${action}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeactivate = (id: string) => {
    if (!window.confirm('Are you sure you want to deactivate this address?')) return;
    handleAction(id, 'deactivate');
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingAddr(null);
  };

  const openEditForm = (addr: EmployeeAddress) => {
    setEditingAddr(addr);
    setForm({
      userId: addr.userId,
      label: addr.label,
      addressLine1: addr.addressLine1,
      addressLine2: addr.addressLine2 || '',
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
      country: addr.country || 'IN',
      latitude: addr.latitude?.toString() || '',
      longitude: addr.longitude?.toString() || '',
      landmark: addr.landmark || '',
      addressType: addr.addressType,
      effectiveFrom: addr.effectiveFrom ? addr.effectiveFrom.split('T')[0] : '',
      effectiveTo: addr.effectiveTo ? addr.effectiveTo.split('T')[0] : '',
      isDefault: addr.isDefault,
    });
    setShowForm(true);
  };

  const typeBadge = (type: string) => {
    const map: Record<string, React.CSSProperties> = {
      RESIDENTIAL: styles.badgeGreen, PERMANENT: styles.badgeBlue, CORRESPONDENCE: styles.badgePurple,
    };
    return <span style={{ ...styles.badge, ...(map[type] || styles.badgeGray) }}>{type}</span>;
  };

  const statusBadge = (status: string) => {
    const map: Record<string, React.CSSProperties> = {
      ACTIVE: styles.badgeGreen, INACTIVE: styles.badgeGray, PENDING: styles.badgeYellow,
      VERIFIED: styles.badgeBlue, REJECTED: styles.badgeRed,
    };
    return <span style={{ ...styles.badge, ...(map[status] || styles.badgeGray) }}>{status.replace(/_/g, ' ')}</span>;
  };

  const groupedByUser = addresses.reduce<Record<string, { name: string; addresses: EmployeeAddress[] }>>((acc, a) => {
    const key = a.userId;
    if (!acc[key]) acc[key] = { name: a.userName || 'Unknown', addresses: [] };
    acc[key].addresses.push(a);
    return acc;
  }, {});

  const filteredUsers = Object.entries(groupedByUser)
    .filter(([_, v]) => !search || v.name.toLowerCase().includes(search.toLowerCase()))
    .map(([userId, v]) => ({
      userId,
      ...v,
      addresses: filterType === 'ALL' ? v.addresses : v.addresses.filter(a => a.addressType === filterType),
    }))
    .filter(({ addresses }) => addresses.length > 0);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Employee Addresses</h1>
          <p style={styles.subtitle}>Manage employee addresses with effectivity dates</p>
        </div>
        <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={() => { resetForm(); setShowForm(true); }}>
          + Add Address
        </button>
      </div>

      <div style={styles.tabs}>
        <button
          style={{ ...styles.tab, ...(activeTab === 'all' ? styles.tabActive : {}) }}
          onClick={() => setActiveTab('all')}
        >
          All Addresses
        </button>
        <button
          style={{ ...styles.tab, ...(activeTab === 'expiring' ? styles.tabActive : {}) }}
          onClick={() => setActiveTab('expiring')}
        >
          Expiring Soon
        </button>
      </div>

      <div style={styles.toolbar}>
        <input
          style={{ ...styles.input, width: '300px' }}
          placeholder="Search by employee name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select style={{ ...styles.select, width: '160px' }} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="ALL">All Types</option>
          <option value="RESIDENTIAL">Residential</option>
          <option value="PERMANENT">Permanent</option>
          <option value="CORRESPONDENCE">Correspondence</option>
        </select>
        <select style={{ ...styles.select, width: '160px' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="PENDING">Pending</option>
          <option value="VERIFIED">Verified</option>
          <option value="INACTIVE">Inactive</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {error && (
        <div style={styles.errorBanner}>
          <span>{error}</span>
          <button style={styles.errorRetry} onClick={() => { setError(''); fetchAddresses(); }}>Retry</button>
        </div>
      )}

      {loading ? (
        <div style={styles.loading}>
          <div style={styles.spinner} />
          <span>Loading addresses...</span>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>🏠</div>
          <div style={styles.emptyText}>
            {activeTab === 'expiring' ? 'No addresses expiring soon' : 'No addresses found'}
          </div>
          <div style={styles.emptySubtext}>
            {search ? 'Try adjusting your search or filters' : 'Add an address to get started'}
          </div>
        </div>
      ) : (
        filteredUsers.map(({ userId, name, addresses: addrs }) => (
          <div key={userId} style={{ ...styles.card, ...(expandedUser === userId ? styles.cardExpanded : {}) }}>
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => setExpandedUser(expandedUser === userId ? null : userId)}
            >
              <div>
                <strong style={{ fontSize: '15px', color: '#111827' }}>{name}</strong>
                <span style={{ marginLeft: '10px', fontSize: '13px', color: '#6B7280' }}>
                  {addrs.length} address{addrs.length !== 1 ? 'es' : ''}
                </span>
              </div>
              <span style={{ fontSize: '18px', color: '#9CA3AF' }}>{expandedUser === userId ? '−' : '+'}</span>
            </div>

            {expandedUser === userId && (
              <div style={{ marginTop: '12px' }}>
                {addrs.map(addr => (
                  <div key={addr.id} style={styles.addressRow}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '14px' }}>{addr.label}</strong>
                        {typeBadge(addr.addressType)}
                        {statusBadge(addr.status)}
                        {addr.isDefault && <span style={{ ...styles.badge, ...styles.badgeYellow }}>DEFAULT</span>}
                      </div>
                      <div style={styles.addressText}>
                        {addr.addressLine1}
                        {addr.addressLine2 && <>, {addr.addressLine2}</>}
                        <br />
                        {addr.city}, {addr.state} {addr.pincode}
                        {addr.country && <>, {addr.country}</>}
                      </div>
                      {addr.landmark && (
                        <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                          Landmark: {addr.landmark}
                        </div>
                      )}
                      {addr.latitude != null && addr.longitude != null && (
                        <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '6px', backgroundColor: '#F3F4F6', border: '1px solid #E5E7EB' }}>
                            📍 <span style={{ fontFamily: 'monospace', fontWeight: 500, fontSize: '12px' }}>
                              {addr.latitude.toFixed(4)}, {addr.longitude.toFixed(4)}
                            </span>
                          </div>
                          <div style={styles.mapPlaceholder}>
                            <span style={styles.mapIcon}>🗺️</span>
                            <span>Map view</span>
                          </div>
                        </div>
                      )}
                      {(addr.effectiveFrom || addr.effectiveTo) && (
                        <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '6px' }}>
                          Effective: {addr.effectiveFrom ? new Date(addr.effectiveFrom).toLocaleDateString() : '—'}
                          {' → '}
                          {addr.effectiveTo ? new Date(addr.effectiveTo).toLocaleDateString() : '—'}
                        </div>
                      )}
                      {addr.rejectionReason && (
                        <div style={{ fontSize: '12px', color: '#991B1B', marginTop: '4px', fontStyle: 'italic' }}>
                          Rejection reason: {addr.rejectionReason}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', flexShrink: 0 }}>
                      {actionLoading === addr.id ? (
                        <span style={{ fontSize: '12px', color: '#6B7280', padding: '4px 8px' }}>Saving...</span>
                      ) : (
                        <>
                          <button
                            style={{ ...styles.btn, ...styles.btnSm, ...styles.btnOutline }}
                            onClick={() => openEditForm(addr)}
                          >
                            Edit
                          </button>
                          {addr.status === 'PENDING' && (
                            <>
                              <button
                                style={{ ...styles.btn, ...styles.btnSm, ...styles.btnGreen }}
                                onClick={() => handleAction(addr.id, 'verify')}
                              >
                                Verify
                              </button>
                              <button
                                style={{ ...styles.btn, ...styles.btnSm, ...styles.btnRed }}
                                onClick={() => {
                                  const reason = prompt('Rejection reason:');
                                  if (reason !== null) handleAction(addr.id, 'reject', 'POST', { reason });
                                }}
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {addr.status === 'ACTIVE' && (
                            <button
                              style={{ ...styles.btn, ...styles.btnSm, ...styles.btnYellow }}
                              onClick={() => handleDeactivate(addr.id)}
                            >
                              Deactivate
                            </button>
                          )}
                          {addr.status === 'INACTIVE' && (
                            <button
                              style={{ ...styles.btn, ...styles.btnSm, ...styles.btnGreen }}
                              onClick={() => handleAction(addr.id, 'activate')}
                            >
                              Activate
                            </button>
                          )}
                          {!addr.isDefault && addr.status === 'ACTIVE' && (
                            <button
                              style={{ ...styles.btn, ...styles.btnSm, ...styles.btnOutline }}
                              onClick={() => handleAction(addr.id, 'default', 'PUT')}
                            >
                              Set Default
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}

      {showForm && (
        <div style={styles.modalOverlay} onClick={() => setShowForm(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>{editingAddr ? 'Edit Address' : 'Add Address'}</h3>

            {error && (
              <div style={{ ...styles.badge, ...styles.badgeRed, display: 'block', padding: '8px', marginBottom: '12px' }}>
                {error}
              </div>
            )}

            <div style={styles.formGroup}>
              <label style={styles.label}>Employee *</label>
              <select
                style={{ ...styles.input, width: '100%' }}
                value={form.userId}
                onChange={e => setForm({ ...form, userId: e.target.value })}
                disabled={!!editingAddr}
              >
                <option value="">Select employee</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ ...styles.formGroup, flex: 1 }}>
                <label style={styles.label}>Label *</label>
                <input
                  style={{ ...styles.input, width: '100%' }}
                  value={form.label}
                  onChange={e => setForm({ ...form, label: e.target.value })}
                  placeholder="Home, Work, etc."
                />
              </div>
              <div style={{ ...styles.formGroup, flex: 1 }}>
                <label style={styles.label}>Address Type</label>
                <select
                  style={{ ...styles.input, width: '100%' }}
                  value={form.addressType}
                  onChange={e => setForm({ ...form, addressType: e.target.value as any })}
                >
                  <option value="RESIDENTIAL">Residential</option>
                  <option value="PERMANENT">Permanent</option>
                  <option value="CORRESPONDENCE">Correspondence</option>
                </select>
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Address Line 1 *</label>
              <input
                style={{ ...styles.input, width: '100%' }}
                value={form.addressLine1}
                onChange={e => setForm({ ...form, addressLine1: e.target.value })}
                placeholder="Street address"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Address Line 2</label>
              <input
                style={{ ...styles.input, width: '100%' }}
                value={form.addressLine2}
                onChange={e => setForm({ ...form, addressLine2: e.target.value })}
                placeholder="Apartment, suite, etc."
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ ...styles.formGroup, flex: 2 }}>
                <label style={styles.label}>City *</label>
                <input
                  style={{ ...styles.input, width: '100%' }}
                  value={form.city}
                  onChange={e => setForm({ ...form, city: e.target.value })}
                />
              </div>
              <div style={{ ...styles.formGroup, flex: 2 }}>
                <label style={styles.label}>State *</label>
                <input
                  style={{ ...styles.input, width: '100%' }}
                  value={form.state}
                  onChange={e => setForm({ ...form, state: e.target.value })}
                />
              </div>
              <div style={{ ...styles.formGroup, flex: 1 }}>
                <label style={styles.label}>Pincode *</label>
                <input
                  style={{ ...styles.input, width: '100%' }}
                  value={form.pincode}
                  onChange={e => setForm({ ...form, pincode: e.target.value })}
                  placeholder="6 digits"
                  maxLength={6}
                />
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Country</label>
              <input
                style={{ ...styles.input, width: '100%' }}
                value={form.country}
                onChange={e => setForm({ ...form, country: e.target.value })}
                placeholder="IN"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Landmark</label>
              <input
                style={{ ...styles.input, width: '100%' }}
                value={form.landmark}
                onChange={e => setForm({ ...form, landmark: e.target.value })}
                placeholder="Nearby landmark"
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ ...styles.formGroup, flex: 1 }}>
                <label style={styles.label}>Latitude *</label>
                <input
                  style={{ ...styles.input, width: '100%' }}
                  value={form.latitude}
                  onChange={e => setForm({ ...form, latitude: e.target.value })}
                  placeholder="e.g. 12.9716"
                  type="number"
                  step="any"
                />
              </div>
              <div style={{ ...styles.formGroup, flex: 1 }}>
                <label style={styles.label}>Longitude *</label>
                <input
                  style={{ ...styles.input, width: '100%' }}
                  value={form.longitude}
                  onChange={e => setForm({ ...form, longitude: e.target.value })}
                  placeholder="e.g. 77.5946"
                  type="number"
                  step="any"
                />
              </div>
            </div>

            {form.latitude && form.longitude && (
              <div style={{ marginBottom: '14px' }}>
                <div style={styles.mapPlaceholder}>
                  <span style={styles.mapIcon}>🗺️</span>
                  <span>Map preview ({parseFloat(form.latitude).toFixed(4)}, {parseFloat(form.longitude).toFixed(4)})</span>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ ...styles.formGroup, flex: 1 }}>
                <label style={styles.label}>Effective From</label>
                <input
                  style={{ ...styles.input, width: '100%' }}
                  type="date"
                  value={form.effectiveFrom}
                  onChange={e => setForm({ ...form, effectiveFrom: e.target.value })}
                />
              </div>
              <div style={{ ...styles.formGroup, flex: 1 }}>
                <label style={styles.label}>Effective To</label>
                <input
                  style={{ ...styles.input, width: '100%' }}
                  type="date"
                  value={form.effectiveTo}
                  onChange={e => setForm({ ...form, effectiveTo: e.target.value })}
                />
              </div>
            </div>

            <div style={{ ...styles.formGroup, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="isDefault"
                checked={form.isDefault}
                onChange={e => setForm({ ...form, isDefault: e.target.checked })}
              />
              <label htmlFor="isDefault" style={{ fontSize: '14px', color: '#374151', cursor: 'pointer' }}>
                Set as default address
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
              <button
                style={{ ...styles.btn, ...styles.btnOutline }}
                onClick={() => setShowForm(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                style={{ ...styles.btn, ...styles.btnPrimary, opacity: saving ? 0.7 : 1 }}
                onClick={handleCreate}
                disabled={saving}
              >
                {saving ? 'Saving...' : editingAddr ? 'Update Address' : 'Create Address'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
