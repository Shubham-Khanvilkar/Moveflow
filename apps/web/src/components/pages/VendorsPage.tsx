'use client';
import React, { useState, useEffect } from 'react';

import { API_URL } from '../../lib/config';

/**
 * Vendor Management — the vendor is the team leader of a directly-assigned
 * set of vehicles. Transport Admin assigns vehicles/drivers to a vendor in
 * one action (no invites); the vendor's dashboard then shows that fleet.
 */
export default function VendorsPage({ token }: { token: string }) {
  const [vendors, setVendors] = useState<any[]>([]);
  const [fleet, setFleet] = useState<{ vehicles: any[]; drivers: any[] }>({ vehicles: [], drivers: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [assignFor, setAssignFor] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [vendorForm, setVendorForm] = useState({ name: '', contactEmail: '', contactPhone: '', address: '' });
  const [selVehicles, setSelVehicles] = useState<Set<string>>(new Set());
  const [selDrivers, setSelDrivers] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true); setMsg('');
    try {
      const [vRes, fRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/vendors`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/vendor/fleet/company`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const vd = await vRes.json();
      const fd = await fRes.json();
      setVendors(vd.data?.vendors || vd.data || []);
      const ff = fd.data || fd;
      setFleet({ vehicles: ff.vehicles || [], drivers: ff.drivers || [] });
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, [token]);

  const handleCreateVendor = async () => {
    setSaving(true); setMsg('');
    try {
      const res = await fetch(`${API_URL}/api/admin/vendors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(vendorForm),
      });
      if (res.ok) {
        setMsg('Vendor created successfully');
        setShowCreate(false);
        setVendorForm({ name: '', contactEmail: '', contactPhone: '', address: '' });
        load();
      } else {
        setMsg('Failed to create vendor');
      }
    } catch { setMsg('Failed to create vendor'); }
    setSaving(false);
  };

  const vendorCount = (vendorId: string, kind: 'vehicles' | 'drivers') =>
    fleet[kind].filter((x: any) => x.vendorId === vendorId).length;

  const openAssign = (v: any) => {
    setAssignFor(v.id);
    setSelVehicles(new Set(fleet.vehicles.filter((x: any) => x.vendorId === v.id).map((x: any) => x.id)));
    setSelDrivers(new Set(fleet.drivers.filter((x: any) => x.vendorId === v.id).map((x: any) => x.id)));
    setMsg('');
  };

  const saveAssign = async () => {
    if (!assignFor) return;
    setSaving(true); setMsg('');
    try {
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      const vRes = await fetch(`${API_URL}/api/vendor/fleet/assign/vehicles`, {
        method: 'POST', headers, body: JSON.stringify({ vendorId: assignFor, vehicleIds: Array.from(selVehicles) }),
      });
      const dRes = await fetch(`${API_URL}/api/vendor/fleet/assign/drivers`, {
        method: 'POST', headers, body: JSON.stringify({ vendorId: assignFor, driverIds: Array.from(selDrivers) }),
      });
      const [vj, dj] = await Promise.all([vRes.json(), dRes.json()]);
      const assigned = (vj.assigned ?? vj.data?.assigned ?? 0) + (dj.assigned ?? dj.data?.assigned ?? 0);
      setMsg(`✅ Fleet updated — ${assigned} items assigned directly (no invites).`);
      setAssignFor(null);
      load();
    } catch { setMsg('⚠️ Failed to save assignment'); }
    setSaving(false);
  };

  const toggle = (set: Set<string>, setter: any, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id); else next.add(id);
    setter(next);
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>🤝 Vendor Management</h2>
        <button onClick={() => { setShowCreate(true); setVendorForm({ name: '', contactEmail: '', contactPhone: '', address: '' }); }}
          style={{ padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ New Vendor</button>
      </div>
      <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 24px' }}>Manage vendors as team leaders of assigned fleets — vehicles and drivers are assigned directly, no invites</p>

      {msg && <div style={{ padding: '12px 16px', background: msg.includes('Failed') ? '#fef3c7' : '#f0fdf4', border: `1px solid ${msg.includes('Failed') ? '#fde68a' : '#bbf7d0'}`, borderRadius: 10, color: msg.includes('Failed') ? '#92400e' : '#15803d', fontSize: 13, marginBottom: 20 }}>{msg}</div>}

      {showCreate && (
        <div style={{ background: 'white', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px' }}>Create Vendor</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {[
              { key: 'name', label: 'Vendor Name', required: true },
              { key: 'contactEmail', label: 'Contact Email' },
              { key: 'contactPhone', label: 'Contact Phone' },
              { key: 'address', label: 'Address' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>{f.label}{f.required && ' *'}</label>
                <input value={(vendorForm as any)[f.key]} onChange={e => setVendorForm({ ...vendorForm, [f.key]: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button onClick={handleCreateVendor} disabled={saving || !vendorForm.name}
              style={{ padding: '10px 24px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{saving ? 'Creating...' : 'Create Vendor'}</button>
            <button onClick={() => setShowCreate(false)} style={{ padding: '10px 24px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Active Vendors', value: vendors.length, color: '#2563eb' },
          { label: 'Total Drivers', value: fleet.drivers.length, color: '#10b981' },
          { label: 'Total Vehicles', value: fleet.vehicles.length, color: '#8b5cf6' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderLeft: `4px solid ${s.color}` }}>
            <div style={{ fontSize: 12, color: '#6b7280' }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        {loading ? <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading...</div> : vendors.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🤝</div>
            <div style={{ fontSize: 14, color: '#6b7280' }}>No vendors found</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Vendor', 'Contact', 'Fleet (vehicles)', 'Fleet (drivers)', 'Status', 'Action'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vendors.map((v: any) => (
                <tr key={v.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{v.name || v.companyName || v.id?.slice(0, 12)}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12 }}>{v.contactEmail || v.email || '-'}</td>
                  <td style={{ padding: '12px 16px' }}>{vendorCount(v.id, 'vehicles')}</td>
                  <td style={{ padding: '12px 16px' }}>{vendorCount(v.id, 'drivers')}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: '#f0fdf4', color: '#15803d' }}>ACTIVE</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button onClick={() => openAssign(v)} style={{ padding: '6px 12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>🎯 Assign Fleet</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Assign Fleet drawer — direct assignment, no invites */}
      {assignFor && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: 'white', borderRadius: 14, padding: 24, width: 640, maxHeight: '80vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 4px' }}>🎯 Assign Fleet</h3>
            <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 16px' }}>
              Pick the vehicles and drivers this vendor leads. Assignment is direct — the vendor never sends invites.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>🚗 Vehicles ({fleet.vehicles.length})</div>
                {fleet.vehicles.length === 0 ? <div style={{ fontSize: 12, color: '#6b7280' }}>No vehicles in company</div> :
                  fleet.vehicles.map((v: any) => (
                    <label key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 6, cursor: 'pointer', background: selVehicles.has(v.id) ? '#eff6ff' : 'white' }}>
                      <input type="checkbox" checked={selVehicles.has(v.id)} onChange={() => toggle(selVehicles, setSelVehicles, v.id)} />
                      <span style={{ fontSize: 13 }}>{v.registrationNo || v.id}</span>
                      <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 'auto' }}>{v.vehicleType || v.type || ''}</span>
                    </label>
                  ))}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>🧑‍✈️ Drivers ({fleet.drivers.length})</div>
                {fleet.drivers.length === 0 ? <div style={{ fontSize: 12, color: '#6b7280' }}>No drivers in company</div> :
                  fleet.drivers.map((dr: any) => (
                    <label key={dr.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 6, cursor: 'pointer', background: selDrivers.has(dr.id) ? '#eff6ff' : 'white' }}>
                      <input type="checkbox" checked={selDrivers.has(dr.id)} onChange={() => toggle(selDrivers, setSelDrivers, dr.id)} />
                      <span style={{ fontSize: 13 }}>{dr.name || dr.driverName || dr.id}</span>
                    </label>
                  ))}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
              <button onClick={() => setAssignFor(null)} style={{ padding: '8px 16px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveAssign} disabled={saving} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {saving ? 'Saving...' : '✅ Save Fleet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
