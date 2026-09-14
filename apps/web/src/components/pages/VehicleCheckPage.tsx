'use client';
import { useState, useEffect, useCallback } from 'react';

import { API_URL } from '../../lib/config';

const TITLES: Record<string, { icon: string; title: string; desc: string }> = {
  VehicleCheckPage: { icon: '🔍', title: 'Pre-Trip Vehicle Check', desc: 'Complete vehicle inspection before trip' },
};

const DEFAULT_CHECKLIST = [
  { item: 'Body condition', status: 'PASS', notes: '' },
  { item: 'Lights (head/tail/indicators)', status: 'PASS', notes: '' },
  { item: 'Tires & wheels', status: 'PASS', notes: '' },
  { item: 'Brakes', status: 'PASS', notes: '' },
  { item: 'Mirrors & windshield', status: 'PASS', notes: '' },
  { item: 'Fluid levels', status: 'PASS', notes: '' },
  { item: 'Seatbelts', status: 'PASS', notes: '' },
  { item: 'Horn', status: 'PASS', notes: '' },
  { item: 'AC / heating', status: 'PASS', notes: '' },
  { item: 'Cleanliness', status: 'PASS', notes: '' },
];

const COMPLIANCE_MAP: Record<string, string> = {
  'Body condition': 'FITNESS_CERTIFICATE',
  'Lights (head/tail/indicators)': 'FITNESS_CERTIFICATE',
  'Tires & wheels': 'FITNESS_CERTIFICATE',
  'Brakes': 'FITNESS_CERTIFICATE',
  'Mirrors & windshield': 'FITNESS_CERTIFICATE',
  'Fluid levels': 'FITNESS_CERTIFICATE',
  'Seatbelts': 'FITNESS_CERTIFICATE',
  'Horn': 'FITNESS_CERTIFICATE',
  'AC / heating': 'FITNESS_CERTIFICATE',
  'Cleanliness': 'OTHER',
};

const statusBadge = (s: string) => {
  if (s === 'PASS') return { bg: '#f0fdf4', color: '#15803d', label: 'PASS' };
  if (s === 'FAIL') return { bg: '#fef2f2', color: '#dc2626', label: 'FAIL' };
  return { bg: '#f3f4f6', color: '#374151', label: s };
};

export default function VehicleCheckPage({ token }: { token: string }) {
  const info = TITLES['VehicleCheckPage'];
  const headers = { Authorization: `Bearer ${token}` };

  const [vehicle, setVehicle] = useState<any>(null);
  const [inspections, setInspections] = useState<any[]>([]);
  const [compliance, setCompliance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');

  const [checklist, setChecklist] = useState(DEFAULT_CHECKLIST);
  const [odometer, setOdometer] = useState('');
  const [notes, setNotes] = useState('');
  const [inspectionType, setInspectionType] = useState('PRE_TRIP');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const tripRes = await fetch(
        `${API_URL}/api/trips?status=IN_TRANSIT,DISPATCHED,DRIVER_ACCEPTED,EN_ROUTE_TO_PICKUP,ARRIVED_AT_PICKUP,BOARDING`,
        { headers }
      );
      if (!tripRes.ok) throw new Error('Failed to fetch trips');
      const tripData = await tripRes.json();
      const trips = Array.isArray(tripData) ? tripData : tripData.data || [];
      const activeTrip = trips[0];

      if (!activeTrip?.vehicleId && !activeTrip?.vehicle?.id) {
        setVehicle(null);
        setLoading(false);
        return;
      }

      const vehicleId = activeTrip.vehicleId || activeTrip.vehicle?.id;
      const [vehicleRes, inspectionsRes, complianceRes] = await Promise.all([
        fetch(`${API_URL}/api/vehicles/${vehicleId}`, { headers }),
        fetch(`${API_URL}/api/vehicles/${vehicleId}/inspections`, { headers }),
        fetch(`${API_URL}/api/vehicles/${vehicleId}/compliance`, { headers }).catch(() => null),
      ]);

      if (vehicleRes.ok) {
        const vData = await vehicleRes.json();
        setVehicle(vData);
        if (vData.inspections?.length) {
          setInspections(vData.inspections);
        }
      }

      if (inspectionsRes.ok) {
        const iData = await inspectionsRes.json();
        setInspections(Array.isArray(iData) ? iData : iData.data || []);
      }

      if (complianceRes && complianceRes.ok) {
        const cData = await complianceRes.json();
        setCompliance(cData);
      }
    } catch {
      setError('Unable to load vehicle inspection data');
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  const updateChecklistItem = (index: number, field: 'status' | 'notes', value: string) => {
    setChecklist(prev => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const handleSubmit = async () => {
    if (!vehicle) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/vehicles/${vehicle.id}/inspections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          inspectionType,
          odometerKm: odometer ? parseInt(odometer) : undefined,
          checklist,
          notes: notes || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || 'Failed to submit inspection');
      }
      const result = await res.json();
      setInspections(prev => [result, ...prev]);
      setChecklist(DEFAULT_CHECKLIST);
      setOdometer('');
      setNotes('');
      setSuccess('Inspection submitted successfully');
    } catch (e: any) {
      setError(e.message || 'Failed to submit inspection');
    }
    setSubmitting(false);
  };

  const hasFailures = checklist.some(i => i.status === 'FAIL');
  const failedItems = checklist.filter(i => i.status === 'FAIL');

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginBottom: 8 }}>{info.icon} {info.title}</h1>
        <p style={{ color: '#6b7280', marginBottom: 20 }}>{info.desc}</p>
        <div style={{ padding: 60, textAlign: 'center', color: '#6b7280' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
          Loading vehicle data...
        </div>
      </div>
    );
  }

  if (error && !vehicle) {
    return (
      <div style={{ padding: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginBottom: 8 }}>{info.icon} {info.title}</h1>
        <p style={{ color: '#6b7280', marginBottom: 20 }}>{info.desc}</p>
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>⚠️</div>
          <p style={{ color: '#dc2626', fontWeight: 600 }}>{error}</p>
          <button onClick={loadData} style={{ marginTop: 12, padding: '8px 20px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div style={{ padding: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginBottom: 8 }}>{info.icon} {info.title}</h1>
        <p style={{ color: '#6b7280', marginBottom: 20 }}>{info.desc}</p>
        <div style={{ textAlign: 'center', padding: 60, background: '#f9fafb', borderRadius: 12 }}>
          <div style={{ fontSize: 48 }}>{info.icon}</div>
          <h3 style={{ color: '#374151', marginTop: 12 }}>No active trip</h3>
          <p style={{ color: '#6b7280' }}>Accept a trip with an assigned vehicle to access inspection features.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginBottom: 8 }}>{info.icon} {info.title}</h1>
      <p style={{ color: '#6b7280', marginBottom: 20 }}>{info.desc}</p>

      {success && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#15803d', fontWeight: 600 }}>
          ✅ {success}
        </div>
      )}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#dc2626', fontWeight: 600 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Vehicle Info Card */}
      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Vehicle Details</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <div><span style={{ color: '#6b7280', fontSize: 13 }}>Registration</span><p style={{ fontWeight: 600, margin: '4px 0 0' }}>{vehicle.registrationNo || vehicle.registration || '—'}</p></div>
          <div><span style={{ color: '#6b7280', fontSize: 13 }}>Type</span><p style={{ fontWeight: 600, margin: '4px 0 0' }}>{vehicle.vehicleType || vehicle.type || '—'}</p></div>
          <div><span style={{ color: '#6b7280', fontSize: 13 }}>Make / Model</span><p style={{ fontWeight: 600, margin: '4px 0 0' }}>{vehicle.make || ''} {vehicle.model || ''}</p></div>
          <div><span style={{ color: '#6b7280', fontSize: 13 }}>Status</span><p style={{ fontWeight: 600, margin: '4px 0 0' }}>{vehicle.status}</p></div>
          <div><span style={{ color: '#6b7280', fontSize: 13 }}>Capacity</span><p style={{ fontWeight: 600, margin: '4px 0 0' }}>{vehicle.capacity || vehicle.passengerCapacity || '—'} seats</p></div>
          <div><span style={{ color: '#6b7280', fontSize: 13 }}>Fuel Type</span><p style={{ fontWeight: 600, margin: '4px 0 0' }}>{vehicle.fuelType || '—'}</p></div>
        </div>
      </div>

      {/* Compliance Status */}
      {compliance && (
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24, marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Compliance Status</h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
            <span style={{ padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, background: compliance.eligible ? '#f0fdf4' : '#fef2f2', color: compliance.eligible ? '#15803d' : '#dc2626' }}>
              {compliance.eligible ? '✓ COMPLIANT' : '✗ NON-COMPLIANT'}
            </span>
            <span style={{ padding: '6px 14px', borderRadius: 20, fontSize: 13, background: '#f3f4f6', color: '#374151' }}>
              {compliance.documentCount || 0} documents on file
            </span>
          </div>
          {compliance.blockingReasons?.length > 0 && (
            <div style={{ marginTop: 8 }}>
              {compliance.blockingReasons.map((r: any, i: number) => (
                <div key={i} style={{ padding: '6px 12px', background: '#fef2f2', borderRadius: 6, marginBottom: 4, fontSize: 13, color: '#dc2626' }}>
                  {r.message}
                </div>
              ))}
            </div>
          )}
          {compliance.warnings?.length > 0 && (
            <div style={{ marginTop: 8 }}>
              {compliance.warnings.map((w: any, i: number) => (
                <div key={i} style={{ padding: '6px 12px', background: '#fefce8', borderRadius: 6, marginBottom: 4, fontSize: 13, color: '#a16207' }}>
                  {w.message}
                </div>
              ))}
            </div>
          )}
          {compliance.expiringDocuments?.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 6 }}>Expiring Documents:</p>
              {compliance.expiringDocuments.map((d: any, i: number) => (
                <span key={i} style={{ display: 'inline-block', padding: '4px 10px', borderRadius: 8, fontSize: 12, background: '#fefce8', color: '#a16207', marginRight: 6, marginBottom: 6 }}>
                  {d.type} — {d.daysLeft}d left
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* New Inspection Form */}
      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>New Inspection</h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Inspection Type</label>
            <select value={inspectionType} onChange={e => setInspectionType(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 }}>
              <option value="PRE_TRIP">Pre-Trip</option>
              <option value="POST_TRIP">Post-Trip</option>
              <option value="PERIODIC">Periodic</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Odometer (km)</label>
            <input type="number" value={odometer} onChange={e => setOdometer(e.target.value)} placeholder="e.g. 45230" style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 }} />
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Additional observations..." style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, resize: 'vertical' }} />
        </div>

        {/* Checklist */}
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>Inspection Checklist</h4>
          <div style={{ display: 'grid', gap: 8 }}>
            {checklist.map((item, i) => {
              const badge = statusBadge(item.status);
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f9fafb', borderRadius: 8, border: item.status === 'FAIL' ? '1px solid #fecaca' : '1px solid transparent' }}>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{item.item}</span>
                  <select value={item.status} onChange={e => updateChecklistItem(i, 'status', e.target.value)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, background: badge.bg, color: badge.color, fontWeight: 600 }}>
                    <option value="PASS">PASS</option>
                    <option value="FAIL">FAIL</option>
                    <option value="N/A">N/A</option>
                  </select>
                  <input type="text" value={item.notes} onChange={e => updateChecklistItem(i, 'notes', e.target.value)} placeholder="Notes (optional)" style={{ width: 160, padding: '4px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Failures Summary */}
        {hasFailures && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <p style={{ color: '#dc2626', fontWeight: 700, fontSize: 14, marginBottom: 6 }}>⚠ {failedItems.length} item(s) failed inspection</p>
            {failedItems.map((f, i) => (
              <div key={i} style={{ fontSize: 13, color: '#dc2626', marginBottom: 2 }}>
                • {f.item}{f.notes ? ` — ${f.notes}` : ''}
                {COMPLIANCE_MAP[f.item] && (
                  <span style={{ marginLeft: 6, fontSize: 11, color: '#9ca3af' }}>(may affect {COMPLIANCE_MAP[f.item].replace(/_/g, ' ').toLowerCase()})</span>
                )}
              </div>
            ))}
            <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>Vehicle may be flagged for maintenance review upon submission.</p>
          </div>
        )}

        <button onClick={handleSubmit} disabled={submitting} style={{ padding: '10px 24px', background: submitting ? '#9ca3af' : hasFailures ? '#dc2626' : '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer' }}>
          {submitting ? 'Submitting...' : hasFailures ? 'Submit with Failures' : 'Submit Inspection'}
        </button>
      </div>

      {/* Inspection History */}
      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Inspection History</h3>
        {inspections.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
            <p>No inspections recorded for this vehicle yet.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {inspections.map((insp: any) => {
              const items = typeof insp.checklist === 'string' ? JSON.parse(insp.checklist) : insp.checklist || [];
              const failCount = items.filter((c: any) => c.status === 'FAIL').length;
              return (
                <div key={insp.id} style={{ padding: 16, background: '#f9fafb', borderRadius: 10, border: insp.passed === false ? '1px solid #fecaca' : '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{(insp.type || 'INSPECTION').replace(/_/g, ' ')}</span>
                      {insp.odometer != null && <span style={{ marginLeft: 10, fontSize: 13, color: '#6b7280' }}>{insp.odometer.toLocaleString()} km</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {failCount > 0 && <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>{failCount} FAIL</span>}
                      <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: insp.passed ? '#f0fdf4' : '#fef2f2', color: insp.passed ? '#15803d' : '#dc2626' }}>
                        {insp.passed ? 'PASSED' : 'FAILED'}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>
                    {new Date(insp.createdAt).toLocaleString()}
                  </div>
                  {insp.notes && <p style={{ fontSize: 13, color: '#374151', marginTop: 6 }}>{insp.notes}</p>}
                  {items.length > 0 && (
                    <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {items.map((c: any, ci: number) => {
                        const b = statusBadge(c.status);
                        return (
                          <span key={ci} style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, background: b.bg, color: b.color, fontWeight: 600 }}>
                            {c.item}: {b.label}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
