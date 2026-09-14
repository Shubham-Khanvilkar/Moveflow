'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { API_URL } from '../../lib/config';
import dynamic from 'next/dynamic';

const LeafletMap = dynamic(() => import('./NodalPointsMap'), { ssr: false });

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '24px', fontFamily: 'Inter, system-ui, sans-serif', maxWidth: '1400px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  title: { fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 },
  subtitle: { fontSize: '14px', color: '#6B7280', marginTop: '4px' },
  toolbar: { display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' },
  btn: { padding: '8px 16px', borderRadius: '6px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', border: 'none', transition: 'all 0.15s' },
  btnPrimary: { backgroundColor: '#2563EB', color: '#fff' },
  btnOutline: { backgroundColor: '#fff', color: '#374151', border: '1px solid #D1D5DB' },
  btnDanger: { backgroundColor: '#DC2626', color: '#fff' },
  btnSm: { padding: '4px 10px', fontSize: '12px' },
  input: { padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '14px' },
  select: { padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '14px', backgroundColor: '#fff' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' },
  card: { backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '20px', transition: 'box-shadow 0.15s' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' },
  cardTitle: { fontSize: '16px', fontWeight: 700, color: '#111827', marginBottom: '2px' },
  cardCode: { fontSize: '12px', color: '#6B7280', fontFamily: 'monospace' },
  cardDetail: { fontSize: '13px', color: '#374151', marginBottom: '4px' },
  capacityBar: { backgroundColor: '#E5E7EB', borderRadius: '6px', height: '8px', overflow: 'hidden', marginTop: '10px' },
  capacityFill: { height: '100%', borderRadius: '6px', transition: 'width 0.3s' },
  capacityLabel: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#6B7280', marginTop: '4px' },
  badge: { display: 'inline-block', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 },
  badgeGreen: { backgroundColor: '#D1FAE5', color: '#065F46' },
  badgeRed: { backgroundColor: '#FEE2E2', color: '#991B1B' },
  empty: { textAlign: 'center', padding: '60px 20px', color: '#9CA3AF' },
  emptyIcon: { fontSize: '48px', marginBottom: '12px' },
  emptyText: { fontSize: '16px', fontWeight: 500, color: '#6B7280' },
  emptySub: { fontSize: '14px', color: '#9CA3AF', marginTop: '4px' },
  loading: { display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '60px', color: '#6B7280' },
  error: { textAlign: 'center', padding: '60px 20px', color: '#DC2626' },
  modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modal: { backgroundColor: '#fff', borderRadius: '12px', padding: '24px', width: '500px', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
  modalTitle: { fontSize: '18px', fontWeight: 700, color: '#111827', marginBottom: '16px' },
  formGroup: { marginBottom: '14px' },
  label: { display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' },
  pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '24px', fontSize: '14px', color: '#374151' },
  mapContainer: { marginBottom: '24px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #E5E7EB' },
};

interface NodalPoint {
  id: string;
  nodalCode: string;
  nodalName: string;
  address?: string;
  city?: string;
  landmark?: string;
  latitude: number;
  longitude: number;
  radius?: number;
  billingZone?: string;
  siteId?: string;
  shuttleStopId?: string;
  capacity: number;
  currentOccupancy: number;
  contactPerson?: string;
  contactPhone?: string;
  facilities?: string;
  zoneName?: string;
  zoneId?: string;
  isActive: boolean;
  site?: { id: string; name: string };
}

interface PaginatedResponse {
  data: NodalPoint[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

interface NodalPointsPageProps {
  token: string;
}

export default function NodalPointsPage({ token }: NodalPointsPageProps) {
  const [nodalPoints, setNodalPoints] = useState<NodalPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [siteFilter, setSiteFilter] = useState('');
  const [billingZoneFilter, setBillingZoneFilter] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [showForm, setShowForm] = useState(false);
  const [editingNP, setEditingNP] = useState<NodalPoint | null>(null);
  const [saving, setSaving] = useState(false);
  const [sites, setSites] = useState<{ id: string; name: string }[]>([]);
  const [occupancyModal, setOccupancyModal] = useState<NodalPoint | null>(null);
  const [occupancyDelta, setOccupancyDelta] = useState('');
  const [showNearby, setShowNearby] = useState(false);
  const [nearbyResults, setNearbyResults] = useState<NodalPoint[]>([]);
  const [nearbyForm, setNearbyForm] = useState({ latitude: '', longitude: '', radius: '5000' });
  const [showMap, setShowMap] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<NodalPoint | null>(null);

  const [form, setForm] = useState({
    nodalCode: '', nodalName: '', address: '', city: '', landmark: '',
    latitude: '', longitude: '', radius: '500', capacity: '50',
    billingZone: '', siteId: '', contactPerson: '', contactPhone: '',
    facilities: '', zoneName: '', zoneId: '',
  });

  const authHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }), [token]);

  const fetchNodalPoints = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (siteFilter) params.set('siteId', siteFilter);
      if (billingZoneFilter) params.set('billingZone', billingZoneFilter);
      if (search) params.set('search', search);

      const res = await fetch(`${API_URL}/api/nodal-points?${params}`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`Failed to load nodal points (${res.status})`);
      const result: PaginatedResponse = await res.json();
      setNodalPoints(result.data || []);
      setMeta(result.meta || { total: 0, page: 1, limit: 20, totalPages: 1 });
    } catch (err: any) {
      setError(err.message || 'Failed to load nodal points');
      setNodalPoints([]);
    } finally {
      setLoading(false);
    }
  }, [page, siteFilter, billingZoneFilter, search, authHeaders]);

  const fetchSites = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/sites`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setSites(data.data || []);
      }
    } catch { /* silent */ }
  }, [authHeaders]);

  useEffect(() => { fetchNodalPoints(); }, [fetchNodalPoints]);
  useEffect(() => { fetchSites(); }, [fetchSites]);

  const handleCreate = async () => {
    setSaving(true);
    setError('');
    try {
      const body = {
        nodalCode: form.nodalCode,
        nodalName: form.nodalName,
        address: form.address || undefined,
        city: form.city || undefined,
        landmark: form.landmark || undefined,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        radius: form.radius ? parseFloat(form.radius) : undefined,
        capacity: form.capacity ? parseInt(form.capacity) : undefined,
        billingZone: form.billingZone || undefined,
        siteId: form.siteId || undefined,
        contactPerson: form.contactPerson || undefined,
        contactPhone: form.contactPhone || undefined,
        facilities: form.facilities || undefined,
        zoneName: form.zoneName || undefined,
        zoneId: form.zoneId || undefined,
      };
      const res = await fetch(`${API_URL}/api/nodal-points`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || `Create failed (${res.status})`);
      }
      setShowForm(false);
      resetForm();
      fetchNodalPoints();
    } catch (err: any) {
      setError(err.message || 'Failed to create nodal point');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingNP) return;
    setSaving(true);
    setError('');
    try {
      const body: Record<string, any> = {
        nodalCode: form.nodalCode,
        nodalName: form.nodalName,
        address: form.address || undefined,
        city: form.city || undefined,
        landmark: form.landmark || undefined,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        radius: form.radius ? parseFloat(form.radius) : undefined,
        capacity: form.capacity ? parseInt(form.capacity) : undefined,
        billingZone: form.billingZone || undefined,
        siteId: form.siteId || undefined,
        contactPerson: form.contactPerson || undefined,
        contactPhone: form.contactPhone || undefined,
        facilities: form.facilities || undefined,
        zoneName: form.zoneName || undefined,
        zoneId: form.zoneId || undefined,
      };
      const res = await fetch(`${API_URL}/api/nodal-points/${editingNP.id}`, {
        method: 'PUT', headers: authHeaders(), body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || `Update failed (${res.status})`);
      }
      setEditingNP(null);
      setShowForm(false);
      resetForm();
      fetchNodalPoints();
    } catch (err: any) {
      setError(err.message || 'Failed to update nodal point');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/nodal-points/${id}`, {
        method: 'DELETE', headers: authHeaders(),
      });
      if (!res.ok) throw new Error(`Deactivate failed (${res.status})`);
      setConfirmDelete(null);
      fetchNodalPoints();
    } catch (err: any) {
      setError(err.message || 'Failed to deactivate nodal point');
    }
  };

  const handleUpdateOccupancy = async () => {
    if (!occupancyModal || !occupancyDelta) return;
    try {
      const delta = parseInt(occupancyDelta);
      if (isNaN(delta)) return;
      const res = await fetch(`${API_URL}/api/nodal-points/${occupancyModal.id}/occupancy`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ delta }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || `Occupancy update failed (${res.status})`);
      }
      setOccupancyModal(null);
      setOccupancyDelta('');
      fetchNodalPoints();
    } catch (err: any) {
      setError(err.message || 'Failed to update occupancy');
    }
  };

  const handleNearbySearch = async () => {
    try {
      const params = new URLSearchParams({
        latitude: nearbyForm.latitude,
        longitude: nearbyForm.longitude,
        radius: nearbyForm.radius,
      });
      const res = await fetch(`${API_URL}/api/nodal-points/nearby?${params}`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`Nearby search failed (${res.status})`);
      const data = await res.json();
      setNearbyResults(data.data || []);
    } catch {
      setNearbyResults([]);
    }
  };

  const resetForm = () => {
    setForm({
      nodalCode: '', nodalName: '', address: '', city: '', landmark: '',
      latitude: '', longitude: '', radius: '500', capacity: '50',
      billingZone: '', siteId: '', contactPerson: '', contactPhone: '',
      facilities: '', zoneName: '', zoneId: '',
    });
    setEditingNP(null);
  };

  const openEdit = (np: NodalPoint) => {
    setEditingNP(np);
    setForm({
      nodalCode: np.nodalCode,
      nodalName: np.nodalName,
      address: np.address || '',
      city: np.city || '',
      landmark: np.landmark || '',
      latitude: np.latitude?.toString() || '',
      longitude: np.longitude?.toString() || '',
      radius: np.radius?.toString() || '500',
      capacity: np.capacity?.toString() || '50',
      billingZone: np.billingZone || '',
      siteId: np.siteId || '',
      contactPerson: np.contactPerson || '',
      contactPhone: np.contactPhone || '',
      facilities: np.facilities || '',
      zoneName: np.zoneName || '',
      zoneId: np.zoneId || '',
    });
    setShowForm(true);
  };

  const capacityColor = (occupancy: number, capacity: number) => {
    if (capacity === 0) return '#D1D5DB';
    const pct = (occupancy / capacity) * 100;
    if (pct < 60) return '#059669';
    if (pct < 85) return '#D97706';
    return '#DC2626';
  };

  const handleMapClick = (lat: number, lng: number) => {
    setForm(f => ({ ...f, latitude: lat.toFixed(6), longitude: lng.toFixed(6) }));
  };

  const filtered = nodalPoints.filter(np => {
    if (search) {
      const q = search.toLowerCase();
      if (!np.nodalName?.toLowerCase().includes(q) && !np.nodalCode?.toLowerCase().includes(q) && !np.address?.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  const billingZones = Array.from(new Set(nodalPoints.map(np => np.billingZone).filter(Boolean)));

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Nodal Points</h1>
          <p style={styles.subtitle}>Manage nodal points, billing zones, and locations</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={{ ...styles.btn, ...styles.btnOutline }} onClick={() => setShowMap(!showMap)}>
            {showMap ? 'Hide Map' : 'Show Map'}
          </button>
          <button style={{ ...styles.btn, ...styles.btnOutline }} onClick={() => setShowNearby(true)}>
            Nearby Search
          </button>
          <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={() => { resetForm(); setShowForm(true); }}>
            + Add Nodal Point
          </button>
        </div>
      </div>

      {showMap && (
        <div style={styles.mapContainer}>
          <LeafletMap
            nodalPoints={filtered}
            onMapClick={handleMapClick}
            height="350px"
          />
        </div>
      )}

      <div style={styles.toolbar}>
        <input
          style={{ ...styles.input, width: '240px' }}
          placeholder="Search by name, code, or address..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
        <select style={styles.select} value={siteFilter} onChange={e => { setSiteFilter(e.target.value); setPage(1); }}>
          <option value="">All Sites</option>
          {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select style={styles.select} value={billingZoneFilter} onChange={e => { setBillingZoneFilter(e.target.value); setPage(1); }}>
          <option value="">All Billing Zones</option>
          {billingZones.map(bz => <option key={bz} value={bz!}>{bz}</option>)}
        </select>
      </div>

      {error && (
        <div style={{ ...styles.badge, ...styles.badgeRed, display: 'block', padding: '12px', marginBottom: '16px', fontSize: '14px' }}>
          {error}
          <button onClick={() => setError('')} style={{ marginLeft: '12px', background: 'none', border: 'none', color: '#991B1B', cursor: 'pointer', fontWeight: 700 }}>Dismiss</button>
        </div>
      )}

      {loading ? (
        <div style={styles.loading}>
          <div style={{ marginRight: '8px', animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</div>
          Loading nodal points...
        </div>
      ) : filtered.length === 0 ? (
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>📍</div>
          <div style={styles.emptyText}>No nodal points found</div>
          <div style={styles.emptySub}>
            {search || siteFilter || billingZoneFilter
              ? 'Try adjusting your filters'
              : 'Click "Add Nodal Point" to create one'}
          </div>
        </div>
      ) : (
        <>
          <div style={styles.grid}>
            {filtered.map(np => {
              const pct = np.capacity > 0 ? Math.min((np.currentOccupancy / np.capacity) * 100, 100) : 0;
              const color = capacityColor(np.currentOccupancy, np.capacity);
              return (
                <div key={np.id} style={styles.card}>
                  <div style={styles.cardHeader}>
                    <div>
                      <div style={styles.cardTitle}>{np.nodalName}</div>
                      <div style={styles.cardCode}>{np.nodalCode}</div>
                    </div>
                    <span style={{ ...styles.badge, ...(np.isActive ? styles.badgeGreen : styles.badgeRed) }}>
                      {np.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                  {np.address && <div style={styles.cardDetail}>📍 {np.address}{np.city ? `, ${np.city}` : ''}</div>}
                  {np.billingZone && <div style={styles.cardDetail}>💰 Billing Zone: {np.billingZone}</div>}
                  {np.site?.name && <div style={styles.cardDetail}>🏢 Site: {np.site.name}</div>}
                  {np.contactPerson && <div style={styles.cardDetail}>👤 {np.contactPerson}{np.contactPhone ? ` — ${np.contactPhone}` : ''}</div>}
                  {np.facilities && <div style={styles.cardDetail}>🏷️ {np.facilities}</div>}
                  {np.latitude != null && np.longitude != null && (
                    <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>
                      Lat: {np.latitude.toFixed(4)}, Lng: {np.longitude.toFixed(4)}
                      {np.radius ? ` — Radius: ${np.radius}m` : ''}
                    </div>
                  )}
                  <div style={styles.capacityBar}>
                    <div style={{ ...styles.capacityFill, width: `${pct}%`, backgroundColor: color }} />
                  </div>
                  <div style={styles.capacityLabel}>
                    <span>{np.currentOccupancy} / {np.capacity} occupancy</span>
                    <span>{Math.round(pct)}%</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '12px', flexWrap: 'wrap' }}>
                    <button style={{ ...styles.btn, ...styles.btnSm, ...styles.btnOutline }} onClick={() => openEdit(np)}>
                      Edit
                    </button>
                    <button
                      style={{ ...styles.btn, ...styles.btnSm, ...styles.btnOutline }}
                      onClick={() => { setOccupancyModal(np); setOccupancyDelta(''); }}
                    >
                      Adjust Occupancy
                    </button>
                    {np.isActive && (
                      <button style={{ ...styles.btn, ...styles.btnSm, ...styles.btnDanger }} onClick={() => setConfirmDelete(np)}>
                        Deactivate
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {meta.totalPages > 1 && (
            <div style={styles.pagination}>
              <button
                style={{ ...styles.btn, ...styles.btnSm, ...styles.btnOutline }}
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </button>
              <span>Page {meta.page} of {meta.totalPages} ({meta.total} total)</span>
              <button
                style={{ ...styles.btn, ...styles.btnSm, ...styles.btnOutline }}
                disabled={page >= meta.totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {showForm && (
        <div style={styles.modalOverlay} onClick={() => setShowForm(false)}>
          <div style={{ ...styles.modal, width: '600px' }} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>{editingNP ? 'Edit Nodal Point' : 'Add Nodal Point'}</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Code *</label>
                <input style={styles.input} value={form.nodalCode} onChange={e => setForm({ ...form, nodalCode: e.target.value })} placeholder="e.g. NP-001" />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Name *</label>
                <input style={styles.input} value={form.nodalName} onChange={e => setForm({ ...form, nodalName: e.target.value })} placeholder="e.g. Main Gate" />
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Address</label>
              <input style={styles.input} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Full address" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={styles.formGroup}>
                <label style={styles.label}>City</label>
                <input style={styles.input} value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Landmark</label>
                <input style={styles.input} value={form.landmark} onChange={e => setForm({ ...form, landmark: e.target.value })} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Latitude *</label>
                <input style={styles.input} type="number" step="any" value={form.latitude} onChange={e => setForm({ ...form, latitude: e.target.value })} placeholder="28.6139" />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Longitude *</label>
                <input style={styles.input} type="number" step="any" value={form.longitude} onChange={e => setForm({ ...form, longitude: e.target.value })} placeholder="77.2090" />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Radius (m)</label>
                <input style={styles.input} type="number" value={form.radius} onChange={e => setForm({ ...form, radius: e.target.value })} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Capacity</label>
                <input style={styles.input} type="number" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Billing Zone</label>
                <input style={styles.input} value={form.billingZone} onChange={e => setForm({ ...form, billingZone: e.target.value })} placeholder="e.g. Zone-A" />
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Site</label>
              <select style={styles.input} value={form.siteId} onChange={e => setForm({ ...form, siteId: e.target.value })}>
                <option value="">Select site</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Contact Person</label>
                <input style={styles.input} value={form.contactPerson} onChange={e => setForm({ ...form, contactPerson: e.target.value })} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Contact Phone</label>
                <input style={styles.input} value={form.contactPhone} onChange={e => setForm({ ...form, contactPhone: e.target.value })} />
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Facilities</label>
              <input style={styles.input} value={form.facilities} onChange={e => setForm({ ...form, facilities: e.target.value })} placeholder="e.g. Parking,Wifi" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Zone Name</label>
                <input style={styles.input} value={form.zoneName} onChange={e => setForm({ ...form, zoneName: e.target.value })} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Zone ID</label>
                <input style={styles.input} value={form.zoneId} onChange={e => setForm({ ...form, zoneId: e.target.value })} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button style={{ ...styles.btn, ...styles.btnOutline }} onClick={() => setShowForm(false)}>Cancel</button>
              <button
                style={{ ...styles.btn, ...styles.btnPrimary }}
                onClick={editingNP ? handleUpdate : handleCreate}
                disabled={saving || !form.nodalCode || !form.nodalName || !form.latitude || !form.longitude}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {occupancyModal && (
        <div style={styles.modalOverlay} onClick={() => setOccupancyModal(null)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Adjust Occupancy — {occupancyModal.nodalName}</h3>
            <div style={{ marginBottom: '12px', fontSize: '14px', color: '#6B7280' }}>
              Current: {occupancyModal.currentOccupancy} / {occupancyModal.capacity}
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Delta (+/- to add or subtract)</label>
              <input
                style={styles.input}
                type="number"
                value={occupancyDelta}
                onChange={e => setOccupancyDelta(e.target.value)}
                placeholder="e.g. 5 or -3"
              />
              <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>
                Positive to add, negative to subtract. New: {
                  occupancyDelta && !isNaN(parseInt(occupancyDelta))
                    ? Math.max(0, occupancyModal.currentOccupancy + parseInt(occupancyDelta))
                    : occupancyModal.currentOccupancy
                }
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button style={{ ...styles.btn, ...styles.btnOutline }} onClick={() => setOccupancyModal(null)}>Cancel</button>
              <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={handleUpdateOccupancy} disabled={!occupancyDelta}>Update</button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div style={styles.modalOverlay} onClick={() => setConfirmDelete(null)}>
          <div style={{ ...styles.modal, width: '400px' }} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Deactivate Nodal Point</h3>
            <p style={{ fontSize: '14px', color: '#374151', marginBottom: '16px' }}>
              Are you sure you want to deactivate <strong>{confirmDelete.nodalName}</strong> ({confirmDelete.nodalCode})?
              This will set it as inactive.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button style={{ ...styles.btn, ...styles.btnOutline }} onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button style={{ ...styles.btn, ...styles.btnDanger }} onClick={() => handleDeactivate(confirmDelete.id)}>Deactivate</button>
            </div>
          </div>
        </div>
      )}

      {showNearby && (
        <div style={styles.modalOverlay} onClick={() => setShowNearby(false)}>
          <div style={{ ...styles.modal, width: '600px' }} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Nearby Nodal Points</h3>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <div style={{ ...styles.formGroup, flex: 1 }}>
                <label style={styles.label}>Latitude</label>
                <input style={styles.input} value={nearbyForm.latitude} onChange={e => setNearbyForm({ ...nearbyForm, latitude: e.target.value })} placeholder="28.6139" />
              </div>
              <div style={{ ...styles.formGroup, flex: 1 }}>
                <label style={styles.label}>Longitude</label>
                <input style={styles.input} value={nearbyForm.longitude} onChange={e => setNearbyForm({ ...nearbyForm, longitude: e.target.value })} placeholder="77.2090" />
              </div>
              <div style={{ ...styles.formGroup, flex: 1 }}>
                <label style={styles.label}>Radius (meters)</label>
                <input style={styles.input} type="number" value={nearbyForm.radius} onChange={e => setNearbyForm({ ...nearbyForm, radius: e.target.value })} />
              </div>
            </div>
            <button style={{ ...styles.btn, ...styles.btnPrimary, marginBottom: '16px' }} onClick={handleNearbySearch}>Search</button>
            {nearbyResults.length > 0 ? (
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {nearbyResults.map(np => (
                  <div key={np.id} style={{ padding: '10px', borderBottom: '1px solid #E5E7EB', fontSize: '14px' }}>
                    <strong>{np.nodalName}</strong> ({np.nodalCode}) — {np.address || 'No address'}
                    <div style={{ fontSize: '12px', color: '#6B7280' }}>
                      Capacity: {np.currentOccupancy}/{np.capacity} | Zone: {np.billingZone || '—'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: '#9CA3AF' }}>
                Enter coordinates and click Search
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button style={{ ...styles.btn, ...styles.btnOutline }} onClick={() => setShowNearby(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
